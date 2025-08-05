import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { BPETokenizer } from "./bpe.ts";

type Frequency = Record<string, number>;
type Chain = Record<string, Frequency>;

export const DEFAULT_MARKOV_CHAIN_N = 4;

export class FlatMarkovChain {
    private n: number;
    private bpeTokenizer = new BPETokenizer();

    constructor(private db: DB, n: number = 2) {
        this.n = Math.min(Math.max(n, 2), 25);
    }

    addToChain(text: string): ReadableStream {
        return new ReadableStream({
            start: (controller) => {
                const tokens = this.bpeTokenizer.tokenize(text, true);
                if (tokens.length < this.n) return;

                for (let j = this.n; j > 0; j--) {
                    const chain: Chain = {};

                    for (let i = 0; i <= tokens.length - j - 1; i++) {
                        const context = tokens.slice(i, i + j);
                        const contextKey = context.join('|');
                        const nextToken = tokens[i + j];



                        if (!chain[contextKey]) chain[contextKey] = {};
                        chain[contextKey][nextToken] = (chain[contextKey][nextToken] || 0) + 1;
                    }

                    this.saveChainDb(chain);
                    controller.enqueue();
                }

                controller.close();
            }
        });
    }

    saveChainDb(chain: Chain): void {
        const insertStmt = this.db.prepareQuery<[string, string, number]>(`
            INSERT INTO markov_chain (context, next_token, count)
            VALUES (?, ?, ?)
            ON CONFLICT(context, next_token) DO UPDATE
            SET count = count + excluded.count;
        `);

        this.db.transaction(() => {
            for (const [ctx, freqs] of Object.entries(chain)) {
                for (const [token, count] of Object.entries(freqs)) {
                    insertStmt.execute([ctx, token, count]);
                }
            }
        });

        insertStmt.finalize();
    }

    generateText(promptText: string, minTokens: number = 1000): ReadableStream<string> {
        const classThis = this;
        let canceled = false;
        return new ReadableStream<string>({
            start(controller) {
                const promptTokens = classThis.bpeTokenizer.tokenize(promptText);

                const context = promptTokens.toReversed().slice(-classThis.n).toReversed();
                const result = [...promptTokens];
                let i = 0;
                let lastToken = context[context.length - 1];
                while (i < minTokens || !(lastToken.endsWith('.') || lastToken.endsWith('!') || lastToken.endsWith('?'))) {
                    if (canceled) break;
                    let nextToken = classThis.getNextToken(context);
                    while (!nextToken) {
                        context.shift();
                        if (context.length == 0 || canceled) break;
                        nextToken = classThis.getNextToken(context);
                    }

                    if (!nextToken || canceled) break;
                    result.push(nextToken);

                    if (context.length >= classThis.n) {
                        context.shift();
                    }
                    context.push(nextToken);
                    i++;
                    lastToken = nextToken;
                    controller.enqueue(nextToken);
                }

                controller.close();
            },
            cancel() {
                canceled = true;
            }
        });
    }

    private getNextToken(context: string[]): string | undefined {
        const key = context.join('|');

        const row = this.db.prepareQuery<[string], { next_token: string; count: number }>(
            "SELECT next_token, count FROM markov_chain WHERE context = ?"
        );
        const results = row.allEntries([key]);
        row.finalize();

        const nextTokens = Object.fromEntries(results.map(r => [r.next_token, r.count])) as Frequency;
        if (!nextTokens || Object.keys(nextTokens).length === 0) return;
        
        return this.chooseWeightedToken(nextTokens);
    }

    private chooseWeightedToken(frequencies: Frequency): string {
        const frequenciesOrdered = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
        for (const [token] of frequenciesOrdered) {
            const r = Math.random();
            if (r < 0.9) {
                return token;
            }
        }
        return frequenciesOrdered[0][0];
    }
}

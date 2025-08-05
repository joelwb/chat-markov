export class BytePairEncoder {
  private vocab: Map<string, number> = new Map()
  private merges: Map<string, number> = new Map()
  private vocabSizeLimit: number

  constructor(vocabSizeLimit: number = 1000) {
    this.vocabSizeLimit = vocabSizeLimit
  }

  private getStats(): Map<string, number> {
    const pairs = new Map<string, number>()
    for (const [word, freq] of this.vocab.entries()) {
      const symbols = word.split(" ")
      for (let i = 0; i < symbols.length - 1; i++) {
        const pair = `${symbols[i]} ${symbols[i + 1]}`
        pairs.set(pair, (pairs.get(pair) || 0) + freq)
      }
    }
    return pairs
  }

  private mergePair(pair: string): boolean {
    let [a, b] = pair.split(" ")
    let changed = false
    if (a == '?') {
      a = '\\?'
    }

    const pattern = new RegExp(`(?<!\\S)${a} ${b}(?!\\S)`, "g")
    const newVocab = new Map<string, number>()

    for (const [word, freq] of this.vocab.entries()) {
      const newWord = word.replace(pattern, `${a}${b}`)
      if (newWord !== word) 
        changed = true
      newVocab.set(newWord, freq)
    }

    this.vocab = newVocab
    return changed
  }

  public train(corpus: string[]): void {
    for (const word of corpus) {
      const chars = word.split("").join(" ")
      this.vocab.set(chars, (this.vocab.get(chars) || 0) + 1)
    }

    let priority = 0
    while (this.merges.size < this.vocabSizeLimit) {
      const pairs = this.getStats()
      if (pairs.size === 0) break

      let bestPair = ""
      let maxCount = -1
      for (const [pair, count] of pairs.entries()) {
        if (count > maxCount) {
          bestPair = pair
          maxCount = count
        }
      }

      if (maxCount < 2) break // parar se par pouco frequente demais

      const changed = this.mergePair(bestPair)
      if (!changed) break // não mudou nada, então para também

      this.merges.set(bestPair, priority++)
    }
  }

  public getMerges(): Map<string, number> {
    return this.merges
  }
}


export class BPETokenizer {
  private encoder: BytePairEncoder

  constructor(vocabSize: number = 1000) {
    this.encoder = new BytePairEncoder(vocabSize)
  }

  private preprocessText(text: string): string[] {
    // separa pontuação e normaliza acentos
    const normalized = text.normalize("NFKC")

    // espaço entre palavras deve ser mantido
    // exemplo: "Olá, mundo! Tudo bem com você?" -> ["olá", ", ", "mundo", "! ", "tudo ", "bem ", "com ", "você", "?"]
    const words = normalized
      .split(/(\s+|[\p{P}$+<=>^`|~])/gu)
      // concatena 2 itens da lista se o próximo for um espaço
      .reduce((acc: string[], curr: string) => {
        // se
        if ((curr === " " || curr === '') && acc.length > 0) {
          acc[acc.length - 1] += curr;
        } else {
          acc.push(curr);
        }
        return acc;
      }, [])
      .filter(Boolean)
      .filter(word => word.trim() !== "");

    // adiciona o token de fim de palavra
    // para que o BPE possa tratar corretamente
    return words
  }

 private applyMerges(word: string, merges: Map<string, number>): string[] {
    // Divide a palavra em um array de símbolos (cada caractere separado)
    let symbols = word.split("");

    // Loop infinito, só sai com 'break'
    while (true) {
      // Inicializa a prioridade mínima como infinito
      let minPriority = Infinity
      // Índice do melhor par encontrado, começa em -1 (nenhum encontrado)
      let bestIdx = -1

      // Percorre todos os pares adjacentes de símbolos
      for (let i = 0; i < symbols.length - 1; i++) {
        // Cria uma string representando o par atual (ex: "a b")
        const pair = `${symbols[i]} ${symbols[i + 1]}`
        // Busca a prioridade desse par no mapa 'merges'
        const priority = merges.get(pair)

        // Se o par existe no mapa e tem prioridade menor que a mínima atual
        if (priority !== undefined && priority < minPriority) {
          // Atualiza a prioridade mínima
          minPriority = priority
          // Salva o índice desse par
          bestIdx = i
        }
      }

      // Se nenhum par válido foi encontrado, sai do loop
      if (bestIdx === -1) break

      // Junta o melhor par encontrado em um único símbolo
      symbols.splice(
        bestIdx, // índice inicial
        2,       // remove dois elementos (o par)
        symbols[bestIdx] + symbols[bestIdx + 1] // insere a junção dos dois
      )
    }

    // Retorna o array de símbolos após todas as fusões possíveis
    return symbols
  }

  public tokenize(text: string, train = false): string[] {
    const words = this.preprocessText(text)
    if (train) {
      this.encoder.train(words);
    }
    const merges = this.encoder.getMerges()
    const tokens: string[] = []

    for (const word of words) {
      const tokenList = this.applyMerges(word, merges)
      tokens.push(...tokenList)
    }

    const filteredTokens = tokens.filter(token => token.length > 0);
    return filteredTokens;
  }
}

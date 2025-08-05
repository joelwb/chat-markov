
export class JSONStream<T> implements ReadableWritablePair<T, Uint8Array> {
    private openBraceCount = 0;
    private tempUint8Array: number[] = [];
    private decoder = new TextDecoder();
    private controller!: ReadableStreamDefaultController;

    readable: ReadableStream<T>;
    writable: WritableStream<Uint8Array>;

    constructor() {
        this.readable = this.readstream();
        this.writable = this.writestream();
    }

    writestream() {
        return new WritableStream({
            close: () => {
                this.controller.close();
            },
            abort: (reason) => {
                this.controller.error(reason);
            },
            write: (chunk) => {
                for (let i = 0; i < chunk.length; i++) {
                    const uint8 = chunk[i];

                    //open brace
                    if (uint8 === 123) {
                        if (this.openBraceCount === 0) this.tempUint8Array = [];
                        this.openBraceCount++;
                    };

                    this.tempUint8Array.push(uint8);

                    //close brace
                    if (uint8 === 125) {
                        this.openBraceCount--;
                        if (this.openBraceCount === 0) {
                            const uint8Ary = new Uint8Array(this.tempUint8Array);
                            const jsonString = this.decoder.decode(uint8Ary);
                            this.controller.enqueue(JSON.parse(jsonString));
                        }
                    };
                };
            }
        });
    }


    readstream() {
        return new ReadableStream({
            start: (controller) => {
                this.controller = controller;
            },
            cancel: (reason) => {
                this.controller.error(reason);
            }
        })

    }
}
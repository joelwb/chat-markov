export abstract class BaseWorker<I = any, O = any> {
  constructor() {
    self.onmessage = async (event: MessageEvent<I>) => {
      try {
        for await (const msg of this.handle(event.data)) {
          self.postMessage(msg);
        }
      } catch (err) {
        console.error("Erro no worker:", err);
        self.postMessage({ error: err.message ?? String(err) });
      }
    };
  }

  public abstract handle(input: I): AsyncIterable<O>;
}
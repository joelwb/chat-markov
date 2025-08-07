import { BaseWorker } from "./base-worker.ts";

const USE_FAKE_WEBWORKER = Deno.env.get("USE_FAKE_WEBWORKER") === "true";

export class WorkerManager {
  private static workers: Map<string, Worker> = new Map();

  static create(id: string, filename: string): Worker {
    if (this.workers.has(id)) {
      throw new Error(`Worker com id '${id}' já existe`);
    }
    
    const url = new URL("./"+filename, import.meta.url).href;
    const worker = this.factory(url);
    this.workers.set(id, worker);
    return worker;
  }

  private static factory(scriptURL: string) {
    if (USE_FAKE_WEBWORKER) {
      return new FakeWorker(scriptURL) as Worker;
    } else {
      return new Worker(scriptURL, { type: "module" });
    }
  }

  static get(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  static getAll(): Record<string, Worker> {
    return Object.fromEntries(this.workers);
  }

  static has(id: string): boolean {
    return this.workers.has(id);
  }

  static onMessage<T>(id: string, callback: (msg: T) => Promise<void> | void): void {
    const worker = this.get(id);
    if (!worker) throw new Error(`Worker '${id}' não encontrado`);
    worker.onmessage = async (e: MessageEvent<T>) => await callback(e.data);
  }

  static onError(id: string, callback: (err: ErrorEvent) => Promise<void> | void): void {
    const worker = this.get(id);
    if (!worker) throw new Error(`Worker '${id}' não encontrado`);
    worker.onerror = callback;
  }

  static remove(id: string): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.terminate();
      this.workers.delete(id);
    }
  }
}

type WorkerLikeMessage = { data: any };

type WorkerClassConstructor = new () => BaseWorker;
export class FakeWorker {
  private instance: BaseWorker;
  private isReady = false;
  private messageQueue: any[] = [];

  public onmessage: ((e: WorkerLikeMessage) => void) | null = null;
  public onerror: ((e: ErrorEvent) => void) | null = null;
  public onmessageerror: ((e: MessageEvent) => void) | null = null;
  public addEventListener = null;
  public removeEventListener = null;
  public dispatchEvent = null;


  constructor(private scriptURL: string) {
    this.init(); // inicia automaticamente
  }

  private async init() {
    const mod = await import(this.scriptURL);

    // Filtra só o que for uma classe que estende BaseWorker e tenha método handle
    const WorkerClass = Object.values(mod).find((val): val is WorkerClassConstructor => {
      return (
        typeof val === "function" &&
        typeof val.prototype?.handle === "function" &&
        val.prototype instanceof BaseWorker
      );
    });

    if (!WorkerClass) {
      console.error("Conteúdo do módulo:", mod);
      throw new Error("Nenhuma classe compatível encontrada no módulo");
    }

    this.instance = new WorkerClass();

    // Intercepta a emissão de mensagens (override de postMessage)
    const originalEmit = this.instance["emitMessage"]?.bind(this.instance);
    this.instance["emitMessage"] = (msg: any) => {
      if (this.onmessage) this.onmessage({ data: msg });
      if (originalEmit) originalEmit(msg);
    };

     this.isReady = true;

    // processa fila de mensagens
    for (const msg of this.messageQueue) {
      this.postMessage(msg);
    }
    this.messageQueue = [];
  }

  postMessage(input: MessageEvent) {
    if (!this.isReady) {
      this.messageQueue.push(input);
      return;
    }

    (async () => {
      try {
        for await (const msg of this.instance.handle(input)) {
           if (this.onmessage) this.onmessage({ data: msg });
        }
      } catch (err) {
        if (this.onerror) {
          const errorEvent = {
            message: err?.message ?? String(err),
            error: err,
            lineno: 0,
            colno: 0,
            filename: this.scriptURL,
          } as ErrorEvent;

          this.onerror(errorEvent);
        }
      }
    })();
  }

  terminate() {
    console.log("[FakeWorker] encerrado.");
  }
}
export class WorkerManager {
  private static workers: Map<string, Worker> = new Map();

  static create(id: string, filename: string): Worker {
    if (this.workers.has(id)) {
      throw new Error(`Worker com id '${id}' já existe`);
    }

    const worker = new Worker(new URL("./"+filename, import.meta.url).href, { type: "module" });
    this.workers.set(id, worker);
    return worker;
  }

  static get(id: string): Worker | undefined {
    return this.workers.get(id);
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
import { BlankEnv, BlankSchema } from "hono/types";
import { Hono } from 'hono';

type App = Hono<BlankEnv, BlankSchema, "/">;
type RemoveFirst<T extends unknown> = T extends [infer H, ...infer R] ? R : T;
export abstract class BaseEndpoint {
    protected static app: App;

    constructor(protected app: App, protected route: string) {}

    abstract handle(): void;

    static initEndpoint<T extends BaseEndpoint>(
        type: new (...args: ConstructorParameters<typeof BaseEndpoint>) => T,
        ...args: RemoveFirst<ConstructorParameters<typeof BaseEndpoint>>
    ) {
        const t = new type(this.app, ...args);
        t.handle();
    }

    public static setApp(app: App) { BaseEndpoint.app = app}
}
export abstract class BaseController {

    constructor() {}

    abstract handle(): void;

    static init<T extends BaseController>(
        type: new (...args: ConstructorParameters<typeof BaseController>) => T,
    ) {
        const t = new type();
        t.handle();
    }
}
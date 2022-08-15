export class Instance {
  private readonly disposers: (() => void)[] = [];

  public constructor(
    public readonly root: HTMLElement,
    public readonly name: string,
  ) {
    // nothing
  }

  autoDispose(fn: () => void) {
    this.disposers.push(fn);
  }

  _disconnect() {
    let d;
    while ((d = this.disposers.pop())) {
      d();
    }
  }

  private subAttr(name: string) {
    return this.name + ":" + name;
  }

  getParam(name: string): string | undefined;
  getParam(name: string, fallback: string): string;
  getParam<T>(name: string, shape: (v: unknown) => v is T): T | undefined;
  getParam<T>(name: string, shape: (v: unknown) => v is T, fallback: T): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getParam(name: string, arg2?: unknown, arg3?: unknown): any {
    const subName = this.subAttr(name);
    let value = this.root.getAttribute(subName);
    if (value === null) {
      const meta = this.root.querySelector<HTMLMetaElement>(
        `meta[name=${CSS.escape(subName)}]`,
      );
      if (meta) {
        value = meta.content;
      }
    }

    // Untyped (raw string) variant
    if (typeof arg2 === "string" || typeof arg2 === "undefined") {
      return value !== null ? value : arg2;
    }

    // Typed (JSON) variant
    const shape = arg2 as (v: unknown) => boolean;
    if (value === null) {
      return arg3;
    }
    try {
      const data = JSON.parse(value);
      if (shape(data)) {
        return data;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Cannot parse JSON content of [${subName}]`, e);
    }
    return arg3;
  }

  getTarget(name: string): HTMLElement | undefined {
    return (
      (this.root.querySelector(
        `[${CSS.escape(this.subAttr(name))}]`,
      ) as HTMLElement | null) || undefined
    );
  }

  getTargets(name: string): NodeListOf<HTMLElement> {
    return this.root.querySelectorAll(`[${CSS.escape(this.subAttr(name))}]`);
  }

  getData<T>(shape: (v: unknown) => v is T): T | undefined;
  getData<T>(shape: (v: unknown) => v is T, fallback: T): T;
  getData<T>(name: string, shape: (v: unknown) => v is T): T | undefined;
  getData<T>(name: string, shape: (v: unknown) => v is T, fallback: T): T;
  getData<T>(...args: unknown[]) {
    if (typeof args[0] !== "string") {
      args.unshift("data");
    }
    const [name, shape, fallback] = args as [
      string,
      (v: unknown) => v is T,
      T | undefined,
    ];
    const block = this.getTarget(name);
    if (!block) {
      return fallback;
    }
    try {
      const data = JSON.parse(block.textContent || "");
      if (shape(data)) {
        return data;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Cannot parse JSON content of [${this.subAttr(name)}]`, e);
    }
    return fallback;
  }

  on<K extends keyof HTMLElementEventMap>(
    event: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | undefined,
    event: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on<K extends keyof HTMLElementEventMap>(
    targetName: string,
    event: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(...args: any[]): void {
    if (typeof args[1] !== "string") {
      args.unshift(this.root);
    }
    let element = args.shift();
    const [event, listener, options] = args;
    if (typeof element === "string") {
      element = this.getTarget(element);
    }
    if (!element) {
      return;
    }
    element.addEventListener(event, listener, options);
    this.autoDispose(() =>
      element.removeEventListener(event, listener, options),
    );
  }
}

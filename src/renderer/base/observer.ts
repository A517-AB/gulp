export type Handler<T = void> = (data: T) => void;

interface BoundEntry<T> {
  handler: Handler<T>;
  context?: object;
  id?: string;
}

type EventMap = Record<string, unknown>;

export class Observer<Events extends EventMap = EventMap> {
  private events = {} as { [K in keyof Events]?: BoundEntry<Events[K]>[] };
  private ids: string[] = [];

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>, context?: object, id?: string): void {
    if (!handler) return;

    if (!this.events[event]) {
      this.events[event] = [{ handler, ...(context !== undefined && { context }), ...(id !== undefined && { id }) }];
      return;
    }

    if (id) {
      if (!this.ids.includes(id)) {
        this.ids.push(id);
        this.events[event].push({ handler, ...(context !== undefined && { context }), id });
      }
    } else if (!this.events[event].some(e => e.handler === handler)) {
      this.events[event].push({ handler, ...(context !== undefined && { context }) });
    }
  }

  off<K extends keyof Events>(event: K, handler?: Handler<Events[K]>, id?: string): void {
    const entries = this.events[event];
    if (!entries?.length) return;

    if (!handler) {
      delete this.events[event];
      return;
    }

    const idx = entries.findIndex(e => id ? e.id === id : e.handler === handler);
    if (idx === -1) return;

    if (id) {
      const idIdx = this.ids.indexOf(id);
      if (idIdx !== -1) this.ids.splice(idIdx, 1);
    }

    entries.splice(idx, 1);
  }

  notify<K extends keyof Events>(event: K, data: Events[K]): void {
    const entries = this.events[event];
    if (!entries?.length) return;

    for (const entry of entries.slice()) {
      entry.handler.call(entry.context, data);
    }
  }

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>, context?: object): void {
    const wrapper: Handler<Events[K]> = (data) => {
      handler.call(context, data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  destroy(): void {
    this.events = {};
    this.ids = [];
  }
}

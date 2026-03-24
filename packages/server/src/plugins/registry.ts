export type HookEvent =
  | 'task.created' | 'task.updated' | 'task.deleted'
  | 'comment.created'
  | 'project.created'
  | 'session.started' | 'session.ended'
  | 'server.started';

export type HookHandler = (event: HookEvent, data: unknown) => void | Promise<void>;

export interface PithPlugin {
  name: string;
  version: string;
  hooks?: Partial<Record<HookEvent, HookHandler>>;
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
}

class PluginRegistry {
  private plugins = new Map<string, PithPlugin>();
  private hooks = new Map<HookEvent, HookHandler[]>();

  register(plugin: PithPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);

    if (plugin.hooks) {
      for (const [event, handler] of Object.entries(plugin.hooks)) {
        if (handler) {
          const hookEvent = event as HookEvent;
          if (!this.hooks.has(hookEvent)) {
            this.hooks.set(hookEvent, []);
          }
          this.hooks.get(hookEvent)!.push(handler);
        }
      }
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Remove hooks
    if (plugin.hooks) {
      for (const [event, handler] of Object.entries(plugin.hooks)) {
        if (handler) {
          const hookEvent = event as HookEvent;
          const handlers = this.hooks.get(hookEvent);
          if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx >= 0) handlers.splice(idx, 1);
          }
        }
      }
    }

    this.plugins.delete(name);
  }

  async loadAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onLoad) {
        try {
          await plugin.onLoad();
        } catch (err) {
          console.error(`Plugin "${plugin.name}" failed to load:`, err);
        }
      }
    }
  }

  async unloadAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onUnload) {
        try {
          await plugin.onUnload();
        } catch (err) {
          console.error(`Plugin "${plugin.name}" failed to unload:`, err);
        }
      }
    }
    this.plugins.clear();
    this.hooks.clear();
  }

  async emit(event: HookEvent, data: unknown): Promise<void> {
    const handlers = this.hooks.get(event) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event, data);
      } catch (err) {
        console.error(`Plugin hook error on "${event}":`, err);
      }
    }
  }

  list(): Array<{ name: string; version: string; hooks: string[] }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      hooks: p.hooks ? Object.keys(p.hooks) : [],
    }));
  }

  get(name: string): PithPlugin | undefined {
    return this.plugins.get(name);
  }

  get size(): number {
    return this.plugins.size;
  }
}

export const pluginRegistry = new PluginRegistry();

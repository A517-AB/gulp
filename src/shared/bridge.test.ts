import { afterEach, describe, expect, it, vi } from "vitest";

type BridgeModule = typeof import("./bridge");

function clearWindow() {
  Reflect.deleteProperty(globalThis, "window");
}

async function importBridgeModule(windowValue?: Window): Promise<BridgeModule> {
  vi.resetModules();

  if (windowValue) {
    Object.defineProperty(globalThis, "window", {
      value: windowValue,
      configurable: true,
      writable: true,
    });
  } else {
    clearWindow();
  }

  return import("./bridge");
}

describe("bridge", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    clearWindow();
  });

  it("should expose browser mode values when electron bridge is missing", async () => {
    const bridge = await importBridgeModule({} as Window);

    expect(bridge.isElectron).toBe(false);
    expect(bridge.isWeb).toBe(true);
    expect(bridge.filesystem).toBeNull();
    expect(bridge.windowControls).toBeNull();
  });

  it("should expose electron APIs from window.electron", async () => {
    const filesystem = { readFile: vi.fn() };
    const windowControls = { minimize: vi.fn() };
    const history = { get: vi.fn() };
    const aliases = { get: vi.fn() };
    const notes = { get: vi.fn() };
    const snippets = { get: vi.fn() };
    const terminal = { start: vi.fn() };
    const queues = { getTasks: vi.fn() };
    const power = { onSuspend: vi.fn() };
    const popup = { show: vi.fn() };

    const bridge = await importBridgeModule({
      electron: {
        terminal,
        queues,
        window: windowControls,
        power,
        popup,
        filesystem,
        env: { getApiKey: vi.fn() },
        history,
        aliases,
        notes,
        snippets,
      },
    } as unknown as Window);

    expect(bridge.isElectron).toBe(true);
    expect(bridge.isWeb).toBe(false);
    expect(bridge.filesystem).toBe(filesystem);
    expect(bridge.windowControls).toBe(windowControls);
    expect(bridge.history).toBe(history);
    expect(bridge.aliases).toBe(aliases);
    expect(bridge.notes).toBe(notes);
    expect(bridge.snippets).toBe(snippets);
    expect(bridge.terminal).toBe(terminal);
    expect(bridge.queues).toBe(queues);
    expect(bridge.power).toBe(power);
    expect(bridge.popup).toBe(popup);
  });
});

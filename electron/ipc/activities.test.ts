/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ipcMain } from "electron";
import { jules } from "@google/jules-sdk";
import { registerActivityHandlers } from "./activities";

const mockHandlers = new Map<string, (...args: any[]) => any>();

vi.mock("electron", () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
        mockHandlers.set(channel, handler);
      }),
    },
  };
});

const mockHydrate = vi.fn();
const mockSelect = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();
const mockHistory = vi.fn();
const mockUpdates = vi.fn();
const mockStream = vi.fn();

const mockSession = {
  activities: {
    hydrate: mockHydrate,
    select: mockSelect,
    list: mockList,
    get: mockGet,
    history: mockHistory,
    updates: mockUpdates,
    stream: mockStream,
  },
};

vi.mock("@google/jules-sdk", () => {
  return {
    jules: {
      session: vi.fn(() => mockSession),
    },
  };
});

async function* mockAsyncGenerator<T>(items: T[]) {
  for (const item of items) {
    await Promise.resolve();
    yield item;
  }
}

describe("activities IPC handlers", () => {
  beforeEach(() => {
    mockHandlers.clear();
    vi.clearAllMocks();
    registerActivityHandlers();
  });

  it("should register all handlers", () => {
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.hydrate", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.select", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.list", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.get", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.history.start", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.updates.start", expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith("sdk:activities.stream.start", expect.any(Function));
  });

  it("should handle hydrate", async () => {
    const handler = mockHandlers.get("sdk:activities.hydrate");
    expect(handler).toBeDefined();

    mockHydrate.mockResolvedValue({ status: "success" });

    const result = await handler!(null, "session-123");

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockHydrate).toHaveBeenCalled();
    expect(result).toEqual({ status: "success" });
  });

  it("should handle select", async () => {
    const handler = mockHandlers.get("sdk:activities.select");
    expect(handler).toBeDefined();

    mockSelect.mockResolvedValue({ selected: true });

    const result = await handler!(null, "session-123", { option: "val" });

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockSelect).toHaveBeenCalledWith({ option: "val" });
    expect(result).toEqual({ selected: true });
  });

  it("should handle list", async () => {
    const handler = mockHandlers.get("sdk:activities.list");
    expect(handler).toBeDefined();

    mockList.mockResolvedValue({ items: [] });

    const result = await handler!(null, "session-123", { pageSize: 10 });

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockList).toHaveBeenCalledWith({ pageSize: 10 });
    expect(result).toEqual({ items: [] });
  });

  it("should handle get", async () => {
    const handler = mockHandlers.get("sdk:activities.get");
    expect(handler).toBeDefined();

    mockGet.mockResolvedValue({ id: "activity-456" });

    const result = await handler!(null, "session-123", "activity-456");

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockGet).toHaveBeenCalledWith("activity-456");
    expect(result).toEqual({ id: "activity-456" });
  });

  it("should handle history streaming", async () => {
    const handler = mockHandlers.get("sdk:activities.history.start");
    expect(handler).toBeDefined();

    const mockItems = [{ id: "1" }, { id: "2" }];
    mockHistory.mockReturnValue(mockAsyncGenerator(mockItems));

    const mockSender = {
      isDestroyed: vi.fn().mockReturnValue(false),
      send: vi.fn(),
    };
    const mockEvent = { sender: mockSender };

    await handler!(mockEvent, "session-123");

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockHistory).toHaveBeenCalled();
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.history:session-123", { id: "1" });
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.history:session-123", { id: "2" });
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.history.done:session-123", undefined);
  });

  it("should stop history streaming if sender is destroyed", async () => {
    const handler = mockHandlers.get("sdk:activities.history.start");
    expect(handler).toBeDefined();

    const mockItems = [{ id: "1" }, { id: "2" }];
    mockHistory.mockReturnValue(mockAsyncGenerator(mockItems));

    let callCount = 0;
    const mockSender = {
      isDestroyed: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount > 2; // return true on the 3rd call (start of 2nd iteration)
      }),
      send: vi.fn(),
    };
    const mockEvent = { sender: mockSender };

    await handler!(mockEvent, "session-123");

    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.history:session-123", { id: "1" });
    expect(mockSender.send).not.toHaveBeenCalledWith("sdk:activities.history:session-123", { id: "2" });
    expect(mockSender.send).not.toHaveBeenCalledWith("sdk:activities.history.done:session-123", undefined);
  });

  it("should handle updates streaming", async () => {
    const handler = mockHandlers.get("sdk:activities.updates.start");
    expect(handler).toBeDefined();

    const mockItems = [{ id: "update-1" }];
    mockUpdates.mockReturnValue(mockAsyncGenerator(mockItems));

    const mockSender = {
      isDestroyed: vi.fn().mockReturnValue(false),
      send: vi.fn(),
    };
    const mockEvent = { sender: mockSender };

    await handler!(mockEvent, "session-123");

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockUpdates).toHaveBeenCalled();
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.updates:session-123", { id: "update-1" });
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.updates.done:session-123", undefined);
  });

  it("should handle stream streaming", async () => {
    const handler = mockHandlers.get("sdk:activities.stream.start");
    expect(handler).toBeDefined();

    const mockItems = [{ id: "stream-1" }];
    mockStream.mockReturnValue(mockAsyncGenerator(mockItems));

    const mockSender = {
      isDestroyed: vi.fn().mockReturnValue(false),
      send: vi.fn(),
    };
    const mockEvent = { sender: mockSender };

    await handler!(mockEvent, "session-123");

    expect(jules.session).toHaveBeenCalledWith("session-123");
    expect(mockStream).toHaveBeenCalled();
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.stream:session-123", { id: "stream-1" });
    expect(mockSender.send).toHaveBeenCalledWith("sdk:activities.stream.done:session-123", undefined);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi as jest } from 'vitest';
import {
  getArchivedSessions,
  archiveSession,
  unarchiveSession,
  isSessionArchived,
} from "./archive";

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

describe("Archive Utility", () => {
  const LOCAL_STORAGE_KEY = "workspace-archived-sessions";

  beforeAll(() => {
    // Define window.localStorage manually for Node environment
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: localStorageMock,
      },
      writable: true,
    });

    // Define localStorage globally
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterAll(() => {
    // Cleanup
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("getArchivedSessions", () => {
    it("should return an empty Set when localStorage is empty", () => {
      const sessions = getArchivedSessions();
      expect(sessions).toBeInstanceOf(Set);
      expect(sessions.size).toBe(0);
    });

    it("should return a Set with stored workspace IDs", () => {
      const storedIds = ["workspace-1", "workspace-2"];
      localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storedIds));

      const sessions = getArchivedSessions();
      expect(sessions.size).toBe(2);
      expect(sessions.has("workspace-1")).toBe(true);
      expect(sessions.has("workspace-2")).toBe(true);
    });

    it("should return an empty Set if localStorage contains invalid JSON", () => {
      localStorageMock.setItem(LOCAL_STORAGE_KEY, "invalid-json");

      const sessions = getArchivedSessions();
      expect(sessions).toBeInstanceOf(Set);
      expect(sessions.size).toBe(0);
    });
  });

  describe("archiveSession", () => {
    it("should add a workspace ID to localStorage", () => {
      archiveSession("new-workspace");

      const stored = localStorageMock.getItem(LOCAL_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toContain("new-workspace");
    });

    it("should not duplicate workspace IDs", () => {
      archiveSession("workspace-1");
      archiveSession("workspace-1");

      const stored = localStorageMock.getItem(LOCAL_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed).toContain("workspace-1");
    });

    it("should preserve existing sessions", () => {
      localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(["existing"]));
      archiveSession("new-workspace");

      const stored = localStorageMock.getItem(LOCAL_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toContain("existing");
      expect(parsed).toContain("new-workspace");
    });
  });

  describe("unarchiveSession", () => {
    it("should remove a workspace ID from localStorage", () => {
      localStorageMock.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(["workspace-1", "workspace-2"]),
      );
      unarchiveSession("workspace-1");

      const stored = localStorageMock.getItem(LOCAL_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).not.toContain("workspace-1");
      expect(parsed).toContain("workspace-2");
    });

    it("should do nothing if workspace ID does not exist", () => {
      localStorageMock.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(["workspace-1"]),
      );
      unarchiveSession("non-existent");

      const stored = localStorageMock.getItem(LOCAL_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(["workspace-1"]);
    });
  });

  describe("isSessionArchived", () => {
    it("should return true if workspace is archived", () => {
      localStorageMock.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(["workspace-1"]),
      );
      expect(isSessionArchived("workspace-1")).toBe(true);
    });

    it("should return false if workspace is not archived", () => {
      expect(isSessionArchived("workspace-1")).toBe(false);
    });
  });
});

import { ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";

const BASE_DIR = "D:\\tired";

async function ensureFile(filePath: string, defaultContent = "[]"): Promise<void> {
  try {
    await fs.promises.access(filePath);
  } catch {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, defaultContent, "utf-8");
      console.log(`[queues] created ${filePath}`);
    } catch (err) {
      console.log(`[queues] could not create ${filePath}:`, err);
    }
  }
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    const raw = await fs.promises.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown[]) : [];
  } catch (err) {
    console.log(`[queues] failed to read ${filePath}:`, err);
    return [];
  }
}

async function resolve(filename: string): Promise<string> {
  const filePath = path.join(BASE_DIR, filename);
  await ensureFile(filePath);
  return filePath;
}

export function registerQueuesHandlers(): void {

  ipcMain.handle("queues.getTasks", async () => {
    return readJsonArray(await resolve("tasks.json"));
  });

  ipcMain.handle("queues.getQueue", async () => {
    return readJsonArray(await resolve("ipc-queue.json"));
  });

  ipcMain.handle("queues.saveTasks", async (_event, data: unknown[]) => {
    try {
      const filePath = await resolve("tasks.json");
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.log(`[queues] failed to save tasks.json:`, err);
      return false;
    }
  });
}

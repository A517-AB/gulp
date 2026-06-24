import { ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";

const BASE_DIR = "D:\\fuse";

function ensureFile(filePath: string, defaultContent = "[]"): void {
  if (!fs.existsSync(filePath)) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, defaultContent, "utf-8");
      console.log(`[queues] created ${filePath}`);
    } catch (err) {
      console.log(`[queues] could not create ${filePath}:`, err);
    }
  }
}

function readJsonArray(filePath: string): unknown[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.log(`[queues] failed to read ${filePath}:`, err);
    return [];
  }
}

function resolve(filename: string): string {
  const filePath = path.join(BASE_DIR, filename);
  ensureFile(filePath);
  return filePath;
}

export function registerQueuesHandlers(): void {

  ipcMain.handle("queues.getTasks", () => {
    return readJsonArray(resolve("tasks.json"));
  });

    ipcMain.handle("queues.getQueue", () => {
        return readJsonArray(resolve("tasks.json"));
    });

  ipcMain.handle("queues.saveTasks", (_event, data: unknown[]) => {
    const filePath = resolve("tasks.json");
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.log(`[queues] failed to save ${filePath}:`, err);
      return false;
    }
  });
}

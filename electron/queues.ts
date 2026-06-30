import {ipcMain, app} from "electron";
import * as fs from "fs/promises";
import * as path from "path";

async function ensureFile(filePath: string, defaultContent = "[]"): Promise<void> {
    try {
        await fs.access(filePath);
    } catch {
        try {
            await fs.mkdir(path.dirname(filePath), {recursive: true});
            await fs.writeFile(filePath, defaultContent, "utf-8");
      console.log(`[queues] created ${filePath}`);
    } catch (err) {
      console.log(`[queues] could not create ${filePath}:`, err);
    }
  }
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
      const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.log(`[queues] failed to read ${filePath}:`, err);
    return [];
  }
}

async function resolvePath(filename: string): Promise<string> {
  const filePath = path.isAbsolute(filename) ? filename : path.join(app.getPath('userData'), filename);
  await ensureFile(filePath);
  return filePath;
}

export function registerQueuesHandlers(): void {
    ipcMain.handle("queues.getTasks", async (_event, jsonPath?: string) => {
        return readJsonArray(await resolvePath(jsonPath || "tasks.json"));
  });

    ipcMain.handle("queues.getQueue", async (_event, jsonPath?: string) => {
        return readJsonArray(await resolvePath(jsonPath || "tasks.json"));
    });

    ipcMain.handle("queues.saveTasks", async (_event, data: unknown[], jsonPath?: string) => {
    try {
        const filePath = await resolvePath(jsonPath || "tasks.json");
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
        console.log(`[queues] failed to save tasks.json:`, err);
      return false;
    }
  });
}

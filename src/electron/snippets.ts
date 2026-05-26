import { ipcMain } from "electron"
import * as fs from "fs"
import * as path from "path"
import type { Snippet } from "../types/snippets"

const BASE_DIR = "D:\\tired"

function ensureFile(filePath: string, defaultContent = "[]"): void {
  if (!fs.existsSync(filePath)) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, defaultContent, "utf-8")
      console.log(`[snippets] created ${filePath}`)
    } catch (err) {
      console.log(`[snippets] could not create ${filePath}:`, err)
    }
  }
}

function resolve(filename: string): string {
  const filePath = path.join(BASE_DIR, filename)
  ensureFile(filePath)
  return filePath
}

export function registerSnippetsHandlers(): void {
  ipcMain.handle("snippets.get", (_event): Snippet[] => {
    const filePath = resolve("snippets.json")
    try {
      const raw = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.log(`[snippets] failed to read ${filePath}:`, err)
      return []
    }
  })

  ipcMain.handle("snippets.save", (_event, data: Snippet[]) => {
    const filePath = resolve("snippets.json")
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
      return true
    } catch (err) {
      console.log(`[snippets] failed to save ${filePath}:`, err)
      return false
    }
  })
}

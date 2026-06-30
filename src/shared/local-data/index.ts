import {isElectron} from '@shared/env'
import {filesystem, store} from '@shared/bridge'
import type {GanttTask} from './types'

export type { NoteMeta, GanttTask } from './types'

const GANTT_PATH = 'D:\\fuse\\gantt.json'
const STORE_KEY = 'gantt-tasks'

const DEFAULT_TASKS: GanttTask[] = [
  {
    TaskID: 1,
    TaskName: 'Project kickoff',
    StartDate: '2026-06-16',
    EndDate: '2026-06-20',
    Progress: 0,
    subtasks: [
      { TaskID: 2, TaskName: 'Define scope',    StartDate: '2026-06-16', EndDate: '2026-06-17', Duration: 1, Progress: 0 },
      { TaskID: 3, TaskName: 'Set milestones',  StartDate: '2026-06-18', EndDate: '2026-06-20', Duration: 2, Progress: 0, Predecessor: '2' },
    ],
  },
]

export async function loadGanttTasks(): Promise<GanttTask[]> {
  if (isElectron) {
    let localData: GanttTask[] | null = null
    let storeData: GanttTask[] | null = null

    // 1. Read local file
    if (filesystem) {
      try {
        const raw = await filesystem.readFile(GANTT_PATH)
        localData = JSON.parse(raw) as GanttTask[]
      } catch {
        // File does not exist or is invalid JSON
      }
    }

    // 2. Read store backup
    if (store) {
      try {
        const rawStore = await store.get(STORE_KEY)
        if (rawStore && Array.isArray(rawStore)) {
          storeData = rawStore as GanttTask[]
        }
      } catch {
        // Store read failed
      }
    }

    // 3. Resolve conflicts (Local Wins)
    if (localData) {
      // Local file exists. Sync to store if they are different to defend the backup copy.
      if (JSON.stringify(localData) !== JSON.stringify(storeData)) {
        if (store) {
          void store.set(STORE_KEY, localData).catch(() => { /* ignore */ })
        }
      }
      return localData
    }

    if (storeData) {
      // Local file is missing/corrupted, but store has backup! Restore it to local file and return it.
      if (filesystem) {
        try {
          await filesystem.mkdir('D:\\fuse').catch(() => { /* ignore */ })
          await filesystem.writeFile(GANTT_PATH, JSON.stringify(storeData, null, 2))
        } catch (err) {
          console.error('[gantt] Failed to restore backup from store to local file:', err)
        }
      }
      return storeData
    }

    return DEFAULT_TASKS
  } else {
    // Web Mode (browser localStorage)
    try {
      const raw = localStorage.getItem(STORE_KEY)
      return raw ? JSON.parse(raw) as GanttTask[] : DEFAULT_TASKS
    } catch {
      return DEFAULT_TASKS
    }
  }
}

export async function saveGanttTasks(tasks: GanttTask[]): Promise<void> {
  if (isElectron) {
    // 1. Save to local file
    if (filesystem) {
      try {
        await filesystem.mkdir('D:\\fuse').catch(() => { /* ignore */ })
        await filesystem.writeFile(GANTT_PATH, JSON.stringify(tasks, null, 2))
      } catch (err) {
        console.error('[gantt] Failed to write local JSON file:', err)
      }
    }

    // 2. Save to store backup
    if (store) {
      try {
        await store.set(STORE_KEY, tasks)
      } catch (err) {
        console.error('[gantt] Failed to save to store backup:', err)
      }
    }
  } else {
    // Web Mode (browser localStorage)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(tasks))
    } catch (err) {
      console.error('[gantt] Failed to save to localStorage:', err)
    }
  }
}

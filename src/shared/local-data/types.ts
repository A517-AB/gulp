export interface NoteMeta {
  id: string;
  title: string;
  updatedAt: string;
}

export interface GanttTask {
  TaskID: number
  TaskName: string
  StartDate: string
  EndDate: string
  Duration?: number | undefined
  Progress: number
  Predecessor?: string | undefined
  subtasks?: GanttTask[] | undefined
}

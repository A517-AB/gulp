
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GanttComponent } from '@syncfusion/ej2-react-gantt'
import { Gantt, Edit, Filter, Selection, Sort, Toolbar } from '@syncfusion/ej2-gantt'

Gantt.Inject(Edit, Filter, Selection, Sort, Toolbar)
import { filesystem } from '@shared/bridge'

const GANTT_PATH = 'D:\\fuse\\gantt.json'

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

const TASK_FIELDS = {
  id:           'TaskID',
  name:         'TaskName',
  startDate:    'StartDate',
  endDate:      'EndDate',
  duration:     'Duration',
  progress:     'Progress',
  dependency:   'Predecessor',
  child:        'subtasks',
}

const EDIT_SETTINGS = {
  allowAdding:   true,
  allowEditing:  true,
  allowDeleting: true,
  allowTaskbarEditing: true,
  mode: 'Auto' as const,
}

const TOOLBAR = ['Add', 'Edit', 'Delete', 'Update', 'Cancel', 'ExpandAll', 'CollapseAll', 'Indent', 'Outdent']

const COLUMNS = [
  { field: 'TaskID',      headerText: 'ID',        width: 60,  isPrimaryKey: true, visible: false },
  { field: 'TaskName',    headerText: 'Task',     width: 220 },
  { field: 'StartDate',   headerText: 'Start',    width: 120 },
  { field: 'EndDate',     headerText: 'End',      width: 120 },
  { field: 'Duration',    headerText: 'Days',     width: 80  },
  { field: 'Progress',    headerText: 'Progress', width: 100 },
  { field: 'Predecessor', headerText: 'Deps',     width: 100 },
]

async function loadTasks(): Promise<GanttTask[]> {
  if (!filesystem) return DEFAULT_TASKS
  try {
    const raw = await filesystem.readFile(GANTT_PATH)
    return JSON.parse(raw) as GanttTask[]
  } catch {
    return DEFAULT_TASKS
  }
}

async function saveTasks(tasks: GanttTask[]): Promise<void> {
  if (!filesystem) return
  try {
    await filesystem.mkdir('D:\\fuse')
  } catch { /* already exists */ }
  await filesystem.writeFile(GANTT_PATH, JSON.stringify(tasks, null, 2))
}

function extractPlain(item: unknown): GanttTask {
  const d = item as Record<string, unknown>
  return {
    TaskID: d['TaskID'] as number,
    TaskName: d['TaskName'] as string,
    StartDate: d['StartDate'] as string,
    EndDate: d['EndDate'] as string,
    Duration: d['Duration'] as number | undefined,
    Progress: d['Progress'] as number,
    Predecessor: d['Predecessor'] as string | undefined,
    subtasks: Array.isArray(d['subtasks']) ? d['subtasks'].map(extractPlain) : undefined,
  }
}

export default function GanttPage(): ReactNode {
  const [tasks, setTasks] = useState<GanttTask[]>(DEFAULT_TASKS)
  const ganttRef = useRef<GanttComponent>(null)

  useEffect(() => {
    void loadTasks().then(setTasks)
  }, [])

  const handleActionComplete = useCallback((args: { requestType: string }) => {
    if (!['save', 'delete', 'add'].includes(args.requestType)) return
    if (!ganttRef.current) return
    const plain = (ganttRef.current.dataSource as unknown[]).map(extractPlain)
    setTasks(plain)
    void saveTasks(plain)
  }, [])

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <GanttComponent
        ref={ganttRef}
        dataSource={tasks}
        taskFields={TASK_FIELDS}
        columns={COLUMNS}
        editSettings={EDIT_SETTINGS}
        toolbar={TOOLBAR}
        allowSorting
        allowFiltering
        height="100%"
        actionComplete={handleActionComplete}
      >
      </GanttComponent>
    </div>
  )
}

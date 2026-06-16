import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GanttComponent, type RowSelectEventArgs } from '@syncfusion/ej2-react-gantt'
import { Gantt, Edit, Filter, Selection, Sort, Toolbar } from '@syncfusion/ej2-gantt'
import type { GanttTask } from '@shared/local-data'
import { loadGanttTasks, saveGanttTasks } from '@shared/local-data'
import { NoteEditor } from '@/components/markdown/NoteEditor'

Gantt.Inject(Edit, Filter, Selection, Sort, Toolbar)

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
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [selectedTask, setSelectedTask] = useState<{ id: number; name: string } | null>(null)
  const ganttRef = useRef<GanttComponent>(null)

  useEffect(() => {
    void loadGanttTasks().then(setTasks)
  }, [])

  const handleActionComplete = useCallback((args: { requestType: string }) => {
    if (!['save', 'delete', 'add'].includes(args.requestType)) return
    if (!ganttRef.current) return
    const plain = (ganttRef.current.dataSource as unknown[]).map(extractPlain)
    setTasks(plain)
    void saveGanttTasks(plain)
  }, [])

  const handleRowSelected = useCallback((args: RowSelectEventArgs) => {
    const data = args.data as GanttTask | undefined
    if (data && typeof data.TaskID === 'number') {
      setSelectedTask({ id: data.TaskID, name: data.TaskName })
    }
  }, [])

  const handleRowDeselected = useCallback(() => {
    setSelectedTask(null)
  }, [])

  const noteId = selectedTask ? `gantt-task-${selectedTask.id}` : 'default'
  const noteTitle = selectedTask ? `Task: ${selectedTask.name}` : 'Notes'

  return (
    <div className="h-full w-full flex overflow-hidden">
      <div className="flex-1 h-full overflow-hidden flex flex-col">
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
          rowSelected={handleRowSelected}
          rowDeselected={handleRowDeselected}
        >
        </GanttComponent>
      </div>
      <div className="w-[450px] border-l border-hair h-full bg-surface overflow-y-auto">
        <NoteEditor key={noteId} id={noteId} title={noteTitle} className="h-full" />
      </div>
    </div>
  )
}

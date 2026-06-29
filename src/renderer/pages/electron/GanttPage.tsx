import type {ReactNode} from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {GanttComponent, type RowSelectEventArgs} from '@syncfusion/ej2-react-gantt'
import {Edit, Filter, Gantt, Selection, Sort, Toolbar} from '@syncfusion/ej2-gantt'
import type {GanttTask} from '@shared/local-data'
import {loadGanttTasks, saveGanttTasks} from '@shared/local-data'
import {NoteEditor} from '@/components/markdown/NoteEditor'
import {useTheme} from '@renderer/providers/theme'
import type {NoteBlock} from '@/components/markdown/types'

function blockText(block: NoteBlock): string {
  if (!Array.isArray(block.content)) return ''
  return (block.content as { text?: string }[]).map(c => c.text ?? '').join('')
}

function extractNoteTasks(blocks: NoteBlock[]): { name: string; today: boolean }[] {
  const out: { name: string; today: boolean }[] = []
  for (const block of blocks) {
    const text = blockText(block).trim()
    const m = /^@(today|to-?do)\s+(.+)$/i.exec(text) as [string, string, string] | null
    if (m) out.push({ name: m[2].trim(), today: m[1].toLowerCase() === 'today' })
    for (const child of block.children) {
      out.push(...extractNoteTasks([child]))
    }
  }
  return out
}

function dateStr(offset = 0): string {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
}

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
  const { theme } = useTheme()
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [selectedTask, setSelectedTask] = useState<{ id: number; name: string } | null>(null)
  const ganttRef = useRef<GanttComponent>(null)

  useEffect(() => {
    void loadGanttTasks().then(setTasks)
  }, [])

  useEffect(() => {
    const id = 'syncfusion-gantt-theme'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = theme === 'dark' ? '/gantt-dark.css' : '/gantt-light.css'
    return () => { document.getElementById(id)?.remove() }
  }, [theme])

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

  const handleNoteBlocks = useCallback((blocks: NoteBlock[]) => {
    if (selectedTask) return
    const extracted = extractNoteTasks(blocks)
    if (extracted.length === 0) return
    setTasks(prev => {
      const existing = new Set(prev.map(t => t.TaskName.toLowerCase()))
      const maxId = prev.reduce((m, t) => Math.max(m, t.TaskID), 0)
      let nextId = maxId + 1
      const added: GanttTask[] = []
      for (const { name, today } of extracted) {
        if (existing.has(name.toLowerCase())) continue
        added.push({
          TaskID: nextId++,
          TaskName: name,
          StartDate: dateStr(),
          EndDate: today ? dateStr() : dateStr(7),
          Progress: 0,
        })
      }
      if (added.length === 0) return prev
      const next = [...prev, ...added]
      void saveGanttTasks(next)
      return next
    })
  }, [selectedTask])

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
        <NoteEditor key={noteId} id={noteId} title={noteTitle} className="h-full" onBlocks={handleNoteBlocks} />
      </div>
    </div>
  )
}

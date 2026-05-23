import { useMemo, type ReactNode } from 'react'
import { ListChecks, FileCode, Terminal, Image, Files, Check } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs'
import { ScrollArea } from '@/ui/scroll-area'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { CodeBlock } from '@/ui/code-block'
import { DiffViewer } from '@/ui/diff-viewer'
import { cn } from '@/utils'
import type { ApplyResult } from '@shared/types'

export interface PlanStep {
  id: string
  title: string
  description?: string
  index: number
}

export interface BashEntry {
  id: string
  command: string
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface MediaEntry {
  id: string
  dataUrl: string
  format: string
}

export interface FileEntry {
  path: string
  changeType: 'created' | 'modified' | 'deleted'
  content: string
  additions: number
  deletions: number
}

export type OutputPhase = 'idle' | 'running' | 'awaiting_approval' | 'done' | 'failed'

interface OutputTabsProps {
  phase: OutputPhase
  planSteps: PlanStep[]
  diffPatch: string | null
  bashEntries: BashEntry[]
  mediaEntries: MediaEntry[]
  generatedFiles: FileEntry[]
  applyResult: ApplyResult | null
  branchName: string
  selectedFile: string | null
  onSelectFile: (path: string) => void
  onApprovePlan: () => void
}

export function OutputTabs({
  phase,
  planSteps,
  diffPatch,
  bashEntries,
  mediaEntries,
  generatedFiles,
  applyResult,
  branchName,
  selectedFile,
  onSelectFile,
  onApprovePlan,
}: OutputTabsProps): ReactNode {
  const isActive = phase === 'running' || phase === 'awaiting_approval'

  const defaultTab = useMemo(() => {
    if (planSteps.length > 0 && phase === 'awaiting_approval') return 'plan'
    if (diffPatch) return 'code'
    if (bashEntries.length > 0) return 'terminal'
    if (mediaEntries.length > 0) return 'media'
    if (generatedFiles.length > 0) return 'files'
    return 'plan'
  }, [planSteps, phase, diffPatch, bashEntries, mediaEntries, generatedFiles])

  const selectedFileContent = generatedFiles.find(f => f.path === selectedFile) ?? null

  if (
    phase === 'idle' &&
    !diffPatch &&
    bashEntries.length === 0 &&
    mediaEntries.length === 0 &&
    generatedFiles.length === 0
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="size-12 rounded-xl bg-raised border border-hair flex items-center justify-center">
          <FileCode className="size-5 text-fg-ghost" />
        </div>
        <div className="text-center space-y-1">
          <p className="label-mono text-fg-ghost">No active session</p>
          <p className="text-3xs text-fg-ghost font-mono">Enter a prompt and hit Run</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { value: 'plan', Icon: ListChecks, label: 'Plan', count: planSteps.length },
    { value: 'code', Icon: FileCode, label: 'Code', count: 0 },
    { value: 'terminal', Icon: Terminal, label: 'Terminal', count: bashEntries.length },
    { value: 'media', Icon: Image, label: 'Media', count: mediaEntries.length },
    { value: 'files', Icon: Files, label: 'Files', count: generatedFiles.length },
  ]

  return (
    <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden gap-0">
      <div className="flex items-center px-3 h-toolbar border-b border-hair shrink-0">
        <TabsList className="bg-transparent gap-0.5 h-7">
          {tabs.map(({ value, Icon, label, count }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="text-2xs font-mono gap-1 px-2 h-6 data-[state=active]:bg-raised"
            >
              <Icon className="size-3" />
              {label}
              {count > 0 && <span className="text-3xs text-fg-dim ml-0.5">{count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="plan" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {planSteps.length === 0 ? (
              <p className="label-mono text-fg-ghost text-center pt-12">
                {isActive ? 'Waiting for plan…' : 'No plan generated'}
              </p>
            ) : (
              <>
                {phase === 'awaiting_approval' && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                    <span className="text-xxs font-mono text-amber-400 flex-1">
                      Plan ready — review and approve to proceed
                    </span>
                    <Button size="sm" onClick={onApprovePlan}>
                      <Check className="size-3" /> Approve
                    </Button>
                  </div>
                )}
                {planSteps.map((step, i) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'size-6 rounded-full flex items-center justify-center text-3xs font-mono font-bold',
                        phase === 'awaiting_approval'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-raised text-fg-dim border border-hair',
                      )}>
                        {i + 1}
                      </div>
                      {i < planSteps.length - 1 && <div className="w-px flex-1 bg-hair mt-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <p className="text-xxs font-mono text-fg-primary font-medium leading-relaxed">
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="text-3xs text-fg-muted mt-1 leading-relaxed">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="code" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {diffPatch ? (
              <DiffViewer diff={diffPatch} branch={branchName} />
            ) : applyResult?.diff ? (
              <DiffViewer diff={applyResult.diff} branch={applyResult.branch} />
            ) : (
              <p className="label-mono text-fg-ghost text-center pt-12">
                {isActive ? 'Waiting for code changes…' : 'No code changes'}
              </p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="terminal" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {bashEntries.length === 0 ? (
              <p className="label-mono text-fg-ghost text-center pt-12">
                {isActive ? 'Waiting for commands…' : 'No terminal output'}
              </p>
            ) : (
              bashEntries.map(entry => (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-3xs font-mono text-fg-dim">$</span>
                    <span className="text-xxs font-mono text-fg-primary font-medium">
                      {entry.command}
                    </span>
                    {entry.exitCode !== null && entry.exitCode !== 0 && (
                      <Badge variant="outline" className="text-3xs text-red-400 border-red-400/30 bg-transparent">
                        exit {entry.exitCode}
                      </Badge>
                    )}
                  </div>
                  <CodeBlock
                    code={[entry.stdout, entry.stderr].filter(Boolean).join('\n')}
                    language="bash"
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="media" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {mediaEntries.length === 0 ? (
              <p className="label-mono text-fg-ghost text-center pt-12">
                {isActive ? 'Waiting for media…' : 'No media captured'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mediaEntries.map(entry => (
                  <div key={entry.id} className="rounded-lg border border-hair overflow-hidden bg-raised">
                    <img src={entry.dataUrl} alt={`Screenshot (${entry.format})`} className="w-full h-auto" />
                    <div className="px-2 py-1.5 border-t border-hair">
                      <span className="text-3xs font-mono text-fg-dim uppercase">{entry.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="files" className="flex-1 overflow-hidden">
        {generatedFiles.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="label-mono text-fg-ghost">
              {isActive ? 'Waiting for files…' : 'No generated files'}
            </p>
          </div>
        ) : (
          <div className="flex h-full">
            <div className="w-[200px] shrink-0 border-r border-hair overflow-y-auto">
              {generatedFiles.map(file => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onSelectFile(file.path)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors hover:bg-hover',
                    selectedFile === file.path && 'bg-selected',
                  )}
                >
                  <span className={cn(
                    'text-3xs font-mono font-bold shrink-0',
                    file.changeType === 'created' && 'text-green-400',
                    file.changeType === 'modified' && 'text-amber-400',
                    file.changeType === 'deleted' && 'text-red-400',
                  )}>
                    {file.changeType === 'created' ? 'A' : file.changeType === 'deleted' ? 'D' : 'M'}
                  </span>
                  <span className="text-2xs font-mono text-fg-secondary truncate">{file.path}</span>
                  <span className="text-3xs font-mono text-fg-ghost ml-auto shrink-0">
                    +{file.additions} -{file.deletions}
                  </span>
                </button>
              ))}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {selectedFileContent ? (
                  <CodeBlock code={selectedFileContent.content} language="typescript" />
                ) : (
                  <p className="label-mono text-fg-ghost text-center pt-12">Select a file</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

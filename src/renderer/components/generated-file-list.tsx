import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/utils'


export interface GeneratedFile {
  path: string;
  content?: string;
  changeType: string;
  additions: number;
  deletions: number;
}

interface GeneratedFileListProps {
  files: GeneratedFile[]
}

export function GeneratedFileList({ files }: GeneratedFileListProps) {
  if (files.length === 0) return null

  return (
    <div className="shrink-0 border-t border-hair">
      <div className="px-4 py-2 border-b border-hair">
        <p className="text-[10px] font-semibold text-fg-secondary uppercase tracking-wide">
          Generated files · {files.length}
        </p>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-hair">
        {files.map((file, i) => (
          <FileRow key={i} file={file} />
        ))}
      </div>
    </div>
  )
}

function FileRow({ file }: { file: GeneratedFile }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!file.content) return
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 hover:bg-hover transition-colors">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {file.content ? (
            expanded ? <ChevronDown size={11} className="shrink-0 text-fg-dim" /> : <ChevronRight size={11} className="shrink-0 text-fg-dim" />
          ) : (
            <FileText size={11} className="shrink-0 text-fg-ghost" />
          )}
          <span className={cn(
            'text-[10px] px-1 rounded shrink-0',
            file.changeType === 'created' && 'text-emerald-400',
            file.changeType === 'deleted' && 'text-red-400',
            file.changeType === 'modified' && 'text-blue-400',
          )}>
            {file.changeType[0]?.toUpperCase()}
          </span>
          <span className="font-mono text-[11px] text-fg-primary truncate">{file.path}</span>
          <span className="shrink-0 text-[10px] text-emerald-400">+{file.additions}</span>
          <span className="shrink-0 text-[10px] text-red-400">-{file.deletions}</span>
        </button>

        {file.content && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 p-1 rounded hover:bg-hover text-fg-dim hover:text-fg-primary transition-colors"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        )}
      </div>

      {expanded && file.content && (
        <pre className="px-4 pb-3 pt-0 font-mono text-[10px] text-fg-muted leading-relaxed overflow-x-auto bg-surface/50 border-t border-hair">
          {file.content}
        </pre>
      )}
    </div>
  )
}

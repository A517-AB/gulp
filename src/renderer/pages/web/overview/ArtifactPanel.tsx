import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs'
import { MarkdownEditor } from '@/components/markdown'
import type { JulesLocalGeneratedFile } from '@shared/electron'

interface ArtifactPanelProps {
  files: JulesLocalGeneratedFile[]
  onDismiss: () => void
}

function downloadFile(file: JulesLocalGeneratedFile) {
  const blob = new Blob([file.content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path.split('/').pop() ?? 'artifact.md'
  a.click()
  URL.revokeObjectURL(url)
}

export function ArtifactPanel({ files, onDismiss }: ArtifactPanelProps) {
  const [activeFile, setActiveFile] = useState(0)
  const current = files[activeFile]

  return (
    <motion.div
      className="h-full overflow-hidden flex flex-col relative group/panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Actions — hover only */}
      <div className="absolute top-6 right-6 z-10 flex gap-4 opacity-0 group-hover/panel:opacity-100 transition-opacity duration-300">
        {current && (
          <button
            onClick={() => downloadFile(current)}
            className="text-xs text-fg-ghost hover:text-fg-secondary transition-colors"
          >
            save
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-xs text-fg-ghost hover:text-fg-secondary transition-colors"
        >
          dismiss
        </button>
      </div>

      {/* File tabs — only if multiple */}
      {files.length > 1 && (
        <div className="px-10 pt-8 shrink-0">
          <Tabs
            value={String(activeFile)}
            onValueChange={v => setActiveFile(Number(v))}
          >
            <TabsList className="bg-transparent border-none gap-4 p-0 h-auto">
              {files.map((f, i) => (
                <TabsTrigger
                  key={f.path}
                  value={String(i)}
                  className="text-[10px] font-mono text-fg-ghost data-[state=active]:text-fg-primary bg-transparent border-none shadow-none p-0 pb-1"
                >
                  {f.path.split('/').pop()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-10 pt-16 pb-10" style={{ scrollbarWidth: 'none' }}>
        {current && (
          <MarkdownEditor
            key={current.path}
            initialContent={current.content}
            readOnly
          />
        )}
      </div>
    </motion.div>
  )
}

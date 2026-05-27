import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/ui/popover'
import { cn } from '@/utils'
import { Paperclip, Check } from 'lucide-react'
import type { Snippet } from '@/types/snippets'

export interface SnippetPickerProps {
  snippets: Snippet[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export function SnippetPicker({ snippets, selectedIds, onChange, className }: SnippetPickerProps) {
  const [open, setOpen] = React.useState(false)
  const hasSelection = selectedIds.length > 0

  const toggleSnippet = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  // Group snippets by category
  const julesSnippets = snippets.filter(s => s.category === 'jules')
  const standardSnippets = snippets.filter(s => s.category !== 'jules')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center size-9 rounded-md transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
            hasSelection ? "text-fg-primary" : "text-fg-secondary",
            className
          )}
          title="Attach Snippets"
        >
          <Paperclip className="size-4" />
          {hasSelection && (
            <span className="absolute top-1.5 right-1.5 size-2 bg-blue-500 rounded-full border-2 border-base" />
          )}
        </button>
      </PopoverTrigger>
      
      <AnimatePresence>
        {open && (
          <PopoverContent
            asChild
            forceMount
            align="start"
            className="w-64 p-0 overflow-hidden bg-transparent border-none"
            sideOffset={8}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="z-50 bg-overlay border border-subtle rounded-md shadow-lg"
            >
              <div className="flex flex-col max-h-[300px] overflow-y-auto p-1">
                {snippets.length === 0 ? (
                  <div className="p-3 text-xs text-fg-secondary text-center">
                    No snippets available
                  </div>
                ) : (
                  <>
                    {julesSnippets.length > 0 && (
                      <div className="mb-1">
                        <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-fg-secondary uppercase">
                          Instructions
                        </div>
                        {julesSnippets.map(snippet => (
                          <SnippetItem 
                            key={snippet.id} 
                            snippet={snippet} 
                            isSelected={selectedIds.includes(snippet.id)} 
                            onToggle={() => { toggleSnippet(snippet.id); }} 
                          />
                        ))}
                      </div>
                    )}
                    
                    {standardSnippets.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-fg-secondary uppercase">
                          Context
                        </div>
                        {standardSnippets.map(snippet => (
                          <SnippetItem 
                            key={snippet.id} 
                            snippet={snippet} 
                            isSelected={selectedIds.includes(snippet.id)} 
                            onToggle={() => { toggleSnippet(snippet.id); }} 
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  )
}

function SnippetItem({ snippet, isSelected, onToggle }: { snippet: Snippet, isSelected: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-start gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors w-full text-left",
        isSelected ? "bg-selected text-fg-primary" : "hover:bg-hover text-fg-secondary"
      )}
    >
      <div className="mt-0.5 flex items-center justify-center size-4 shrink-0 border border-subtle rounded-sm bg-base">
        {isSelected && <Check className="size-3 text-fg-primary" />}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="truncate font-medium">{snippet.title || 'Untitled'}</span>
        {snippet.julesMeta?.description && (
          <span className="truncate text-xs text-fg-secondary opacity-70">
            {snippet.julesMeta.description}
          </span>
        )}
      </div>
    </button>
  )
}

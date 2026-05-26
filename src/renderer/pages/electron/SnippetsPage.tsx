import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Search, Code2 } from 'lucide-react'
import { CodeEditor } from '@renderer/ui/code-editor'
import { DynamicDropdown } from '@renderer/components/shared/DynamicDropdown'
import { useSnippets } from '@renderer/hooks/use-snippets'
import { PythonIcon, JavascriptIcon, TypescriptIcon, ShellIcon, JsonIcon } from '@renderer/icons/languages'
import type { LanguagePreset, Snippet } from '../../../types/snippets'

const LANGUAGES: LanguagePreset[] = [
  { id: 'python', name: 'Python', icon: PythonIcon, colorHue: 'oklch(0.85 0.15 95)' }, // yellow
  { id: 'javascript', name: 'JavaScript', icon: JavascriptIcon, colorHue: 'oklch(0.85 0.15 95)' }, // yellow
  { id: 'typescript', name: 'TypeScript', icon: TypescriptIcon, colorHue: 'oklch(0.65 0.15 250)' }, // blue
  { id: 'shell', name: 'Shell', icon: ShellIcon, colorHue: 'oklch(0.7 0.1 150)' }, // green
  { id: 'json', name: 'JSON', icon: JsonIcon, colorHue: 'oklch(0.7 0.1 30)' }, // red-ish
]

export function SnippetsPage() {
  const { snippets, saveSnippet, deleteSnippet } = useSnippets()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // New snippet draft state
  const [draftScript, setDraftScript] = useState('')
  const [draftLang, setDraftLang] = useState<string>('python')
  const [draftTitle, setDraftTitle] = useState('')

  const isCreating = editingId === 'new'
  
  const filteredSnippets = useMemo(() => {
    if (!search) return snippets
    return snippets.filter(s => 
      (s.title?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (s.script.toLowerCase().includes(search.toLowerCase())) ||
      (s.languageId?.toLowerCase().includes(search.toLowerCase()) ?? false)
    )
  }, [snippets, search])

  const handleStartCreate = () => {
    setEditingId('new')
    setDraftScript('')
    setDraftTitle('')
    setDraftLang('python')
  }

  const handleSaveDraft = () => {
    if (!draftScript.trim()) return
    const id = isCreating ? crypto.randomUUID() : (editingId ?? crypto.randomUUID())
    void saveSnippet({
      id,
      title: draftTitle.trim() || null,
      languageId: draftLang || null,
      script: draftScript,
      createdAt: new Date().toISOString()
    })
    setEditingId(null)
  }

  const handleEdit = (snippet: Snippet) => {
    setEditingId(snippet.id)
    setDraftScript(snippet.script)
    setDraftTitle(snippet.title ?? '')
    setDraftLang(snippet.languageId ?? 'python')
  }

  return (
    <div className="flex flex-col h-full w-full bg-base overflow-hidden relative">
      {/* Top Filter Bar */}
      <div className="flex items-center gap-2 p-4 border-b border-hair bg-surface shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-dim" />
          <input 
            type="text" 
            placeholder="Search snippets..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value) }}
            className="w-full h-8 pl-8 pr-3 rounded-md bg-base border border-subtle text-sm text-fg-primary focus:outline-none focus:border-moderate transition-colors"
          />
        </div>
        {!editingId && (
          <button 
            onClick={handleStartCreate}
            className="ml-auto flex items-center gap-1.5 px-3 h-8 bg-raised hover:bg-hover border border-subtle rounded-md text-sm font-medium text-fg-primary transition-colors"
          >
            <Plus className="size-4" />
            <span>New Snippet</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Drop Zone / Inline Editor */}
        <AnimatePresence>
          {editingId && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="flex flex-col gap-2 p-3 rounded-md border border-moderate bg-surface shadow-sm"
            >
              <div className="flex items-center gap-2">
                <DynamicDropdown 
                  items={LANGUAGES.map(l => ({ id: l.id, label: l.name, icon: l.icon, colorHue: l.colorHue }))}
                  value={draftLang}
                  onChange={setDraftLang}
                />
                <input 
                  type="text"
                  placeholder="Snippet Title (optional)"
                  value={draftTitle}
                  onChange={e => { setDraftTitle(e.target.value) }}
                  className="flex-1 bg-transparent border-none text-sm text-fg-primary focus:outline-none placeholder:text-fg-dim"
                />
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setEditingId(null) }}
                    className="px-2 h-7 rounded text-xs font-medium text-fg-muted hover:text-fg-primary hover:bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveDraft}
                    disabled={!draftScript.trim()}
                    className="px-3 h-7 rounded text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="h-64 mt-2">
                <CodeEditor 
                  value={draftScript}
                  onChange={(val) => { setDraftScript(val ?? '') }}
                  language={LANGUAGES.find(l => l.id === draftLang)?.id ?? 'javascript'}
                  options={{ minimap: { enabled: false }, lineNumbers: 'off' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Snippets List */}
        <div className="flex flex-col gap-3">
          {filteredSnippets.map(snippet => {
            const lang = LANGUAGES.find(l => l.id === snippet.languageId)
            const LangIcon = lang?.icon ?? Code2
            return (
              <div 
                key={snippet.id} 
                className="group relative flex flex-col p-3 rounded-md border border-subtle bg-surface hover:border-moderate transition-colors cursor-pointer"
                onClick={() => { handleEdit(snippet) }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 rounded-sm bg-base border border-hair" style={{ color: lang?.colorHue ?? 'var(--fg-secondary)' }}>
                    <LangIcon className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-fg-primary">
                    {snippet.title ?? 'Untitled Snippet'}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); void deleteSnippet(snippet.id); }}
                    className="ml-auto p-1.5 rounded-md text-fg-ghost hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="h-16 overflow-hidden relative border border-hair rounded-sm bg-base pointer-events-none">
                  {/* Read-only mini preview */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-base/80 z-10" />
                  <pre className="p-2 m-0 text-[10px] text-fg-muted font-mono whitespace-pre-wrap bg-transparent">
                    {snippet.script}
                  </pre>
                </div>
              </div>
            )
          })}
          
          {filteredSnippets.length === 0 && !editingId && (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Code2 className="size-8 mb-3 opacity-20" />
              <p className="text-sm">No snippets found.</p>
              <button 
                onClick={handleStartCreate}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                Create your first snippet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

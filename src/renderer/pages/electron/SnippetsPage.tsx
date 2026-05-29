import { useState, useMemo, useCallback, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Code2, Plus, Trash2, Search, Pencil, Copy, Check } from 'lucide-react'
import { useSnippets } from '@/hooks/use-snippets'
import { InlineEdit } from '@/ui/inline-edit'
import { CodeEditor } from '@/ui/code-editor'
import { DynamicDropdown } from '@/components/shared/DynamicDropdown'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/ui/dialog'
import { LANGUAGES, langFor } from '@/lib/languages'
import type { Snippet } from '../../../types/snippets'

const LANGUAGE_ITEMS = LANGUAGES.map(l => ({ id: l.id, label: l.name, icon: l.icon, color: l.color }))

const TITLE_ADJ  = ['swift', 'async', 'clean', 'lazy', 'eager', 'raw', 'pure', 'silent', 'fuzzy', 'dark', 'sharp', 'wild']
const TITLE_NOUN = ['handler', 'parser', 'runner', 'hook', 'util', 'patch', 'probe', 'loop', 'pipe', 'trap', 'drop', 'snap']

function pickRandom(values: readonly string[], fallback: string) {
  const value = values[Math.floor(Math.random() * values.length)]
  return value ?? fallback
}

function randomTitle() {
  const a = pickRandom(TITLE_ADJ, 'fresh')
  const b = pickRandom(TITLE_NOUN, 'snippet')
  return `${a}-${b}`
}

function withAlpha(color: string, a: number) {
  return color.replace(')', ` / ${String(a)})`)
}

interface SnippetRowProps {
  snippet: Snippet
  isCopied: boolean
  onOpen: (s: Snippet) => void
  onCopy: (s: Snippet, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onTitleSave: (s: Snippet, title: string) => void
  onLangChange: (id: string, lang: string) => void
}

const SnippetRow = memo(function SnippetRow({
  snippet, isCopied, onOpen, onCopy, onDelete, onTitleSave, onLangChange,
}: SnippetRowProps) {
  const lang = langFor(snippet.languageId)
  const preview = snippet.script.split('\n').slice(0, 3).join('\n')
  const gradientColor = lang?.color ? withAlpha(lang.color, 0.4) : null
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group/snippet relative flex flex-col py-3 px-2 border-b border-hair last:border-0 rounded cursor-pointer hover:bg-hover transition-colors duration-200"
      onClick={() => { onOpen(snippet) }}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
    >
      {gradientColor && (
        <motion.div
          className="absolute inset-0 rounded pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.2 }}
          style={{ background: `linear-gradient(to top left, ${gradientColor} 0%, transparent 55%)` }}
        />
      )}

      <div className="relative flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2" onClick={e => { e.stopPropagation() }}>
          <InlineEdit
            value={snippet.title ?? ''}
            onSave={v => { onTitleSave(snippet, v) }}
            className="text-sm font-semibold text-fg-primary"
            placeholder="Untitled"
          />
          {snippet.category === 'jules' && (
            <span className="shrink-0 text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase">
              Jules
            </span>
          )}
        </div>
        <pre className="text-xs font-mono text-fg-muted leading-relaxed whitespace-pre-wrap truncate max-h-[4.5em] overflow-hidden bg-transparent border-0 p-0 m-0 antialiased">
          {preview}
        </pre>
      </div>

      <div className="relative flex items-center justify-end gap-1 mt-2" onClick={e => { e.stopPropagation() }}>
        <div className="flex items-center gap-1 opacity-0 group-hover/snippet:opacity-100 transition-opacity duration-200">
          <button
            onClick={e => { onCopy(snippet, e) }}
            title="Copy to clipboard"
            className="flex items-center justify-center h-7 w-7 rounded text-fg-muted hover:text-fg-primary hover:bg-hover transition-all"
          >
            {isCopied
              ? <Check className="h-3 w-3 text-green-500" />
              : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={e => { onOpen(snippet); e.stopPropagation() }}
            title="Edit in editor"
            className="flex items-center justify-center h-7 w-7 rounded text-fg-muted hover:text-fg-primary hover:bg-hover transition-all"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={e => { onDelete(snippet.id, e) }}
            title="Delete snippet"
            className="flex items-center justify-center h-7 w-7 rounded text-fg-muted hover:text-red-500 hover:bg-hover transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <DynamicDropdown
          items={LANGUAGE_ITEMS}
          value={snippet.languageId}
          onChange={v => { onLangChange(snippet.id, v) }}
        />
      </div>
    </div>
  )
})

export function SnippetsPage() {
  const { snippets, saveSnippet, deleteSnippet } = useSnippets()

  // search
  const [search, setSearch] = useState('')

  // editor dialog
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null)
  const [draftScript, setDraftScript] = useState('')
  const [draftLang, setDraftLang] = useState('python')

  // copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return snippets
    const q = search.toLowerCase()
    return snippets.filter(s =>
      (s.title?.toLowerCase().includes(q) ?? false) ||
      s.script.toLowerCase().includes(q) ||
      (s.languageId?.toLowerCase().includes(q) ?? false) ||
      (s.tags?.some(t => t.toLowerCase().includes(q)) ?? false)
    )
  }, [snippets, search])

  const totalSnippets = snippets.length

  // ── handlers ─────────────────────────────────────────────────────────────

  const openEditor = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet)
    setDraftScript(snippet.script)
    setDraftLang(snippet.languageId ?? 'python')
    setEditorOpen(true)
  }, [])

  const openNewEditor = useCallback(() => {
    const newSnippet: Snippet = {
      id: crypto.randomUUID(),
      title: randomTitle(),
      languageId: 'python',
      script: '',
      createdAt: new Date().toISOString(),
    }
    setEditingSnippet(newSnippet)
    setDraftScript('')
    setDraftLang('python')
    setEditorOpen(true)
  }, [])

  const handleEditorSave = useCallback(() => {
    if (!editingSnippet || !draftScript.trim()) return
    saveSnippet({
      ...editingSnippet,
      script: draftScript,
      languageId: draftLang,
    })
    setEditorOpen(false)
    setEditingSnippet(null)
  }, [editingSnippet, draftScript, draftLang, saveSnippet])

  const handleCopy = useCallback((snippet: Snippet, e: React.MouseEvent) => {
    e.stopPropagation()
    void navigator.clipboard.writeText(snippet.script)
    setCopiedId(snippet.id)
    setTimeout(() => { setCopiedId(null) }, 1500)
  }, [])

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSnippet(id)
  }, [deleteSnippet])

  const handleTitleSave = useCallback((snippet: Snippet, newTitle: string) => {
    saveSnippet({ ...snippet, title: newTitle || null })
  }, [saveSnippet])

  const handleLangChange = useCallback((id: string, newLang: string) => {
    const snippet = snippets.find(s => s.id === id)
    if (snippet) {
      saveSnippet({ ...snippet, languageId: newLang })
    }
  }, [snippets, saveSnippet])

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-7xl mx-auto w-full bg-base text-fg-primary">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-surface border border-subtle flex items-center justify-center">
            <Code2 className="h-4 w-4 text-fg-muted" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-fg-primary uppercase">Snippets</h2>
            <p className="text-[10px] text-fg-dim font-mono uppercase tracking-widest">
              snippets.json
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-dim" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              className="h-8 pl-7 pr-3 rounded bg-surface border border-subtle text-[10px] font-mono text-fg-primary uppercase tracking-wider placeholder:text-fg-dim focus:outline-none focus:border-moderate transition-colors w-44"
            />
          </div>
          <button
            onClick={openNewEditor}
            className="bg-surface border border-subtle text-fg-secondary text-xs px-3 py-1.5 rounded flex items-center gap-2 hover:bg-hover hover:text-fg-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            NEW SNIPPET
          </button>
          <span className="bg-surface border border-subtle text-fg-muted text-[10px] px-2.5 py-1 rounded font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {totalSnippets} TOTAL
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto pr-2 pb-12">
        {filtered.map(snippet => (
          <SnippetRow
            key={snippet.id}
            snippet={snippet}
            isCopied={copiedId === snippet.id}
            onOpen={openEditor}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onTitleSave={handleTitleSave}
            onLangChange={handleLangChange}
          />
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-subtle bg-surface p-12 text-center border-dashed">
            <Code2 className="h-6 w-6 text-fg-ghost mx-auto mb-3" />
            <p className="text-xs text-fg-dim uppercase tracking-widest font-mono">
              {search ? 'No matching snippets.' : 'No snippets yet.'}
            </p>
            {!search && (
              <button
                onClick={openNewEditor}
                className="mt-3 text-[10px] font-mono text-fg-muted hover:text-fg-primary transition-colors uppercase tracking-wider"
              >
                Create your first snippet
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Monaco Editor Dialog ─────────────────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={open => {
        if (!open) { setEditorOpen(false); setEditingSnippet(null) }
      }}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-overlay/90 backdrop-blur-2xl border border-subtle shadow-2xl !duration-0 data-[state=closed]:!animate-none data-[state=open]:!animate-none">
          <AnimatePresence>
            {editorOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="flex flex-col h-full w-full"
              >
                <DialogHeader className="px-5 py-4 border-b border-subtle/50 bg-surface/50">
                  <div className="flex items-center gap-3">
                    <DynamicDropdown
                      items={LANGUAGE_ITEMS}
                      value={draftLang}
                      onChange={setDraftLang}
                    />
                    <DialogTitle asChild>
                      <InlineEdit
                        value={editingSnippet?.title ?? ''}
                        onSave={v => { setEditingSnippet(s => s ? { ...s, title: v || null } : s) }}
                        className="text-lg font-bold text-fg-primary tracking-wide bg-transparent"
                        placeholder="Untitled Snippet"
                      />
                    </DialogTitle>
                  </div>
                </DialogHeader>

                <div className="flex-1 w-full relative bg-base/50">
                  <div className="absolute inset-0 pt-2">
                    <CodeEditor
                      value={draftScript}
                      onChange={val => { setDraftScript(val ?? '') }}
                      language={langFor(draftLang)?.id ?? 'javascript'}
                      options={{ 
                        minimap: { enabled: false }, 
                        lineNumbers: 'on',
                        renderLineHighlight: 'none',
                        guides: { indentation: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        padding: { top: 16, bottom: 16 },
                        automaticLayout: true,
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>
                </div>

                <DialogFooter className="px-5 py-3 border-t border-subtle/50 bg-surface/50">
                  <button
                    onClick={() => { setEditorOpen(false); setEditingSnippet(null) }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-fg-muted hover:text-fg-primary hover:bg-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditorSave}
                    disabled={!draftScript.trim()}
                    className="bg-primary/90 text-primary-foreground border border-primary text-sm px-6 py-2 rounded-lg font-medium hover:bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                  >
                    Save Snippet
                  </button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SnippetsPage

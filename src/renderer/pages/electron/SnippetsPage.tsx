import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Code2, Plus, Trash2, Search, Pencil, Copy, Check } from 'lucide-react'
import { useSnippets } from '@renderer/hooks/use-snippets'
import type { SnippetItem } from '@renderer/hooks/use-snippets'
import { InlineEdit } from '@renderer/ui/inline-edit'
import { CodeEditor } from '@renderer/ui/code-editor'
import { DynamicDropdown } from '@renderer/components/shared/DynamicDropdown'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@renderer/ui/dialog'
import { LANGUAGES, langFor, toMonacoLang } from '@renderer/lib/languages'
import { fuseFilePath } from '@shared/fuse'
import {GitSyncButton} from '@renderer/components/git/GitSyncButton'

const LANGUAGE_ITEMS = LANGUAGES.map(l => ({ id: l.id, label: l.name, icon: l.icon, color: l.color }))

const TITLE_ADJ  = ['swift', 'async', 'clean', 'lazy', 'eager', 'raw', 'pure', 'silent', 'fuzzy', 'dark', 'sharp', 'wild']
const TITLE_NOUN = ['handler', 'parser', 'runner', 'hook', 'util', 'patch', 'probe', 'loop', 'pipe', 'trap', 'drop', 'snap']

function randomTitle() {
    const a = TITLE_ADJ[Math.floor(Math.random() * TITLE_ADJ.length)] ?? 'wild'
    const b = TITLE_NOUN[Math.floor(Math.random() * TITLE_NOUN.length)] ?? 'hook'
  return `${a}-${b}`
}

function withAlpha(color: string, a: number) {
    return color.replace(')', ` / ${a.toString()})`)
}

interface SnippetRowProps {
  snippet: SnippetItem
  isCopied: boolean
  onOpen: (s: SnippetItem) => void
  onCopy: (s: SnippetItem, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onTitleSave: (s: SnippetItem, title: string) => void
  onLangChange: (id: string, lang: string) => void
}

const SnippetRow = memo(function SnippetRow({
  snippet, isCopied, onOpen, onCopy, onDelete, onTitleSave, onLangChange,
}: SnippetRowProps) {
  const lang = langFor(snippet.languageId)
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
          {snippet.type === 'build' && (
            <span className="shrink-0 text-3xs font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 uppercase">
              Build
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-fg-dim truncate">
            {snippet.preview ?? snippet.file}
        </p>
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
  const { items, saveItem, updateMeta, deleteItem, readCode } = useSnippets()

  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SnippetItem | null>(null)
  const [draftScript, setDraftScript] = useState('')
  const [draftLang, setDraftLang] = useState('python')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(s =>
      (s.title?.toLowerCase().includes(q) ?? false) ||
      s.languageId.toLowerCase().includes(q) ||
      s.file.toLowerCase().includes(q) ||
      (s.tags.some(t => t.toLowerCase().includes(q)))
    )
  }, [items, search])

  // ── handlers ───────────────────────────────────────────────────────────────

  const openEditor = useCallback(async (item: SnippetItem) => {
    setEditingItem(item)
    setDraftLang(item.languageId)
    setDraftScript('')
    setEditorOpen(true)
    const code = await readCode(item)
    setDraftScript(code)
  }, [readCode])

  const openNewEditor = useCallback(() => {
    const lang = 'python'
    const title = randomTitle()
    const now = new Date().toISOString()
    const newItem: SnippetItem = {
      id: crypto.randomUUID(),
      title,
      languageId: lang,
      type: 'snippet',
      file: fuseFilePath('snippet', lang, title),
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    setEditingItem(newItem)
    setDraftScript('')
    setDraftLang(lang)
    setEditorOpen(true)
  }, [])

  const handleEditorSave = useCallback(() => {
    if (!editingItem || !draftScript.trim()) return
    const now = new Date().toISOString()
      const file = draftLang !== editingItem.languageId
          ? fuseFilePath(editingItem.type, draftLang, editingItem.title ?? 'untitled')
          : editingItem.file
      void saveItem({...editingItem, languageId: draftLang, file, updatedAt: now}, draftScript)
    setEditorOpen(false)
    setEditingItem(null)
  }, [editingItem, draftScript, draftLang, saveItem])

  const handleCopy = useCallback(async (snippet: SnippetItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const code = await readCode(snippet)
    void navigator.clipboard.writeText(code)
    setCopiedId(snippet.id)
    setTimeout(() => { setCopiedId(null) }, 1500)
  }, [readCode])

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    void deleteItem(id)
  }, [deleteItem])

  const handleTitleSave = useCallback((snippet: SnippetItem, newTitle: string) => {
      void updateMeta(snippet, {title: newTitle || null})
  }, [updateMeta])

  const itemsRef = useRef<SnippetItem[]>([])
  useEffect(() => { itemsRef.current = items }, [items])

  const handleLangChange = useCallback((id: string, newLang: string) => {
    const item = itemsRef.current.find(s => s.id === id)
      if (item) void updateMeta(item, {languageId: newLang})
  }, [updateMeta])

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-7xl mx-auto w-full bg-base text-fg-primary">
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-dim"/>
            <input
              type="text"
              placeholder="SEARCH..."
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              className="h-8 pl-8 pr-3 rounded bg-surface border border-subtle text-[10px] font-mono text-fg-primary uppercase tracking-wider placeholder:text-fg-dim focus:outline-none focus:border-moderate transition-colors w-44"
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
            {items.length} TOTAL
          </span>
            <GitSyncButton/>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 pb-12">
        {filtered.map(snippet => (
          <SnippetRow
            key={snippet.id}
            snippet={snippet}
            isCopied={copiedId === snippet.id}
            onOpen={item => { void openEditor(item) }}
            onCopy={(s, e) => { void handleCopy(s, e) }}
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

      <Dialog open={editorOpen} onOpenChange={open => {
        if (!open) { setEditorOpen(false); setEditingItem(null) }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-overlay border-subtle shadow-xl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-hair">
            <div className="flex items-center gap-3">
              <DynamicDropdown
                items={LANGUAGE_ITEMS}
                value={draftLang}
                onChange={setDraftLang}
              />
              <DialogTitle asChild>
                <InlineEdit
                  value={editingItem?.title ?? ''}
                  onSave={v => { setEditingItem(s => s ? { ...s, title: v || null } : s) }}
                  className="text-sm font-bold text-fg-primary uppercase tracking-wider"
                  placeholder="Untitled"
                />
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="h-[60vh] min-h-[400px] w-full p-4 bg-base">
            <CodeEditor
              value={draftScript}
              onChange={val => { setDraftScript(val ?? '') }}
              language={toMonacoLang(draftLang)}
              options={{ minimap: { enabled: false }, lineNumbers: 'on' }}
            />
          </div>

          <DialogFooter className="px-5 py-3 border-t border-hair bg-surface">
            <button
              onClick={() => { setEditorOpen(false); setEditingItem(null) }}
              className="px-3 py-1.5 rounded text-xs font-mono text-fg-muted hover:text-fg-primary transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleEditorSave}
              disabled={!draftScript.trim()}
              className="bg-raised border border-subtle text-fg-primary text-xs px-4 py-1.5 rounded flex items-center gap-2 hover:bg-hover transition-colors disabled:opacity-50 uppercase font-mono tracking-wider"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

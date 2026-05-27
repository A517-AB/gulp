import { useState, useMemo, useCallback } from 'react'
import { Code2, Plus, Trash2, Search, Pencil, Copy, Check } from 'lucide-react'
import { useSnippets } from '@renderer/hooks/use-snippets'
import { InlineEdit } from '@renderer/ui/inline-edit'
import { CodeEditor } from '@renderer/ui/code-editor'
import { DynamicDropdown } from '@renderer/components/shared/DynamicDropdown'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@renderer/ui/dialog'
import { PythonIcon, JavascriptIcon, TypescriptIcon, ShellIcon, JsonIcon } from '@renderer/icons/languages'
import type { LanguagePreset, Snippet } from '../../../types/snippets'

const LANGUAGES: LanguagePreset[] = [
  { id: 'python',     name: 'Python',     icon: PythonIcon,     colorHue: 'oklch(0.85 0.15 95)' },
  { id: 'javascript', name: 'JavaScript', icon: JavascriptIcon, colorHue: 'oklch(0.85 0.15 95)' },
  { id: 'typescript', name: 'TypeScript', icon: TypescriptIcon, colorHue: 'oklch(0.65 0.15 250)' },
  { id: 'shell',      name: 'Shell',      icon: ShellIcon,      colorHue: 'oklch(0.7 0.1 150)' },
  { id: 'json',       name: 'JSON',       icon: JsonIcon,       colorHue: 'oklch(0.7 0.1 30)' },
]

function langFor(id: string | null) {
  return LANGUAGES.find(l => l.id === id)
}

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
      (s.languageId?.toLowerCase().includes(q) ?? false)
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
      title: null,
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
    void saveSnippet({
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
    void deleteSnippet(id)
  }, [deleteSnippet])

  const handleTitleSave = useCallback((snippet: Snippet, newTitle: string) => {
    void saveSnippet({ ...snippet, title: newTitle || null })
  }, [saveSnippet])

  const handleLangChange = useCallback((snippet: Snippet, newLang: string) => {
    void saveSnippet({ ...snippet, languageId: newLang })
  }, [saveSnippet])

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <Code2 className="h-4 w-4 text-white/60" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white uppercase">Snippets</h2>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
              snippets.json
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              className="h-8 pl-7 pr-3 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/80 uppercase tracking-wider placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors w-44"
            />
          </div>
          <button
            onClick={openNewEditor}
            className="bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            NEW SNIPPET
          </button>
          <span className="bg-white/5 border border-white/10 text-white/60 text-[10px] px-2.5 py-1 rounded font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {totalSnippets} TOTAL
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto pr-2 pb-12">
        {filtered.map(snippet => {
          const lang = langFor(snippet.languageId)
          const LangIcon = lang?.icon ?? Code2
          const isCopied = copiedId === snippet.id
          const preview = snippet.script.split('\n').slice(0, 3).join('\n')

          return (
            <div
              key={snippet.id}
              className="group/snippet flex items-start justify-between py-3 px-2 border-b border-white/[0.08] last:border-0 hover:bg-white/[0.02] rounded transition-colors cursor-pointer"
              onClick={() => { openEditor(snippet) }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                {/* language icon */}
                <div
                  className="mt-0.5 p-1.5 rounded-sm bg-white/5 border border-white/10 shrink-0"
                  style={{ color: lang?.colorHue ?? 'var(--fg-secondary)' }}
                >
                  <LangIcon className="h-3.5 w-3.5" />
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {/* title row */}
                  <div className="flex items-center gap-2">
                    <div onClick={e => { e.stopPropagation() }}>
                      <InlineEdit
                        value={snippet.title ?? ''}
                        onSave={v => { handleTitleSave(snippet, v) }}
                        className="text-sm font-semibold text-white/90"
                        placeholder="Untitled"
                      />
                    </div>
                    <div onClick={e => { e.stopPropagation() }}>
                      <DynamicDropdown
                        items={LANGUAGES.map(l => ({ id: l.id, label: l.name, icon: l.icon, colorHue: l.colorHue }))}
                        value={snippet.languageId}
                        onChange={v => { handleLangChange(snippet, v) }}
                      />
                    </div>
                  </div>

                  {/* code preview */}
                  <pre className="text-[10px] font-mono text-white/30 leading-relaxed whitespace-pre-wrap truncate max-h-[3.6em] overflow-hidden">
                    {preview}
                  </pre>
                </div>
              </div>

              {/* actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover/snippet:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={e => { handleCopy(snippet, e) }}
                  title="Copy to clipboard"
                  className="flex items-center justify-center h-8 w-8 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  {isCopied
                    ? <Check className="h-3.5 w-3.5 text-green-400" />
                    : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={e => { openEditor(snippet); e.stopPropagation() }}
                  title="Edit in editor"
                  className="flex items-center justify-center h-8 w-8 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={e => { handleDelete(snippet.id, e) }}
                  title="Delete snippet"
                  className="flex items-center justify-center h-8 w-8 rounded text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-12 text-center border-dashed">
            <Code2 className="h-6 w-6 text-white/20 mx-auto mb-3" />
            <p className="text-xs text-white/30 uppercase tracking-widest font-mono">
              {search ? 'No matching snippets.' : 'No snippets yet.'}
            </p>
            {!search && (
              <button
                onClick={openNewEditor}
                className="mt-3 text-[10px] font-mono text-white/40 hover:text-white transition-colors uppercase tracking-wider"
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
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-zinc-950 border-white/10">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <DynamicDropdown
                items={LANGUAGES.map(l => ({ id: l.id, label: l.name, icon: l.icon, colorHue: l.colorHue }))}
                value={draftLang}
                onChange={setDraftLang}
              />
              <DialogTitle className="text-sm font-bold text-white/90 uppercase tracking-wider">
                {editingSnippet?.title ?? 'New Snippet'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[400px] max-h-[60vh]">
            <CodeEditor
              value={draftScript}
              onChange={val => { setDraftScript(val ?? '') }}
              language={langFor(draftLang)?.id ?? 'javascript'}
              options={{ minimap: { enabled: false }, lineNumbers: 'on' }}
            />
          </div>

          <DialogFooter className="px-5 py-3 border-t border-white/[0.08]">
            <button
              onClick={() => { setEditorOpen(false); setEditingSnippet(null) }}
              className="px-3 py-1.5 rounded text-xs font-mono text-white/40 hover:text-white transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleEditorSave}
              disabled={!draftScript.trim()}
              className="bg-white/10 border border-white/20 text-white text-xs px-4 py-1.5 rounded flex items-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-50 uppercase font-mono tracking-wider"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

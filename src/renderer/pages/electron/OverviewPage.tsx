import type { ReactNode, ChangeEvent, KeyboardEvent } from 'react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJules } from '@/lib/jules/context'
import { BlockEditor } from '@/components/shared/BlockEditor'
import { useChatAliases } from '@/hooks/use-settings'
import type { ChatAlias } from '@/types/settings'

interface MarkdownEntry {
  id: string
  content: string
}

function looksLikeMarkdown(content: string): boolean {
  return (
    /^#{1,6}\s/m.test(content) ||
    content.includes('```') ||
    /\*\*.+\*\*/.test(content) ||
    /^[-*]\s/m.test(content) ||
    /^\d+\.\s/m.test(content)
  )
}

function extractZip(content: string): string | null {
  const match = /(\w[\w.-]+\.zip)/i.exec(content)
  return match ? match[1] : null
}

export default function OverviewPage(): ReactNode {
  const { client } = useJules()
  const [aliases] = useChatAliases()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeAlias, setActiveAlias] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [markdownEntry, setMarkdownEntry] = useState<MarkdownEntry | null>(null)
  const [showAliasMenu, setShowAliasMenu] = useState(false)
  const [aliasQuery, setAliasQuery] = useState('')
  const [aliasMenuIndex, setAliasMenuIndex] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMdIdRef = useRef<string | null>(null)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey) return
      if (document.activeElement === inputRef.current) return
      e.preventDefault()
      setInput('/')
      setAliasQuery('')
      setShowAliasMenu(true)
      setAliasMenuIndex(0)
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!activeSessionId || !client) return

    const doFetch = async () => {
      try {
        const acts = await client.listActivities(activeSessionId)
        const latestMd = [...acts].reverse().find(a => a.role === 'agent' && looksLikeMarkdown(a.content))
        if (latestMd && latestMd.id !== lastMdIdRef.current) {
          lastMdIdRef.current = latestMd.id
          setMarkdownEntry({ id: latestMd.id, content: latestMd.content })
        }
      } catch (e) {
        console.error('[OverviewPage]', e)
      }
    }

    void doFetch()
    pollRef.current = setInterval(() => { void doFetch() }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeSessionId, client])

  const filteredAliases = aliases.filter(a =>
    a.alias.toLowerCase().startsWith(aliasQuery.toLowerCase())
  )

  const selectAlias = (alias: ChatAlias) => {
    setActiveSessionId(alias.sessionId)
    setActiveAlias(alias.alias)
    setMarkdownEntry(null)
    lastMdIdRef.current = null
    setInput('')
    setShowAliasMenu(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.startsWith('/') && !val.includes(' ')) {
      setAliasQuery(val.slice(1))
      setShowAliasMenu(true)
      setAliasMenuIndex(0)
    } else {
      setShowAliasMenu(false)
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || !activeSessionId || !client || isSending) return
    setInput('')
    setIsSending(true)
    try {
      await client.createActivity({
        sessionId: activeSessionId,
        content: `${trimmed}\n\nReport back with markdown please.`,
      })
    } catch (e) {
      console.error('[OverviewPage] send failed:', e)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAliasMenu && filteredAliases.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAliasMenuIndex(i => Math.min(i + 1, filteredAliases.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAliasMenuIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const sel = filteredAliases[aliasMenuIndex]
        if (sel) selectAlias(sel)
        return
      }
      if (e.key === 'Escape') { setShowAliasMenu(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleSave = () => {
    if (!markdownEntry) return
    const blob = new Blob([markdownEntry.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeAlias ?? 'response'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const zipName = markdownEntry ? extractZip(markdownEntry.content) : null

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Editor — full height */}
      <div className="flex-1 overflow-y-auto relative group/md" style={{ scrollbarWidth: 'none' }}>
        {markdownEntry ? (
          <>
            <div className="px-10 pt-16 pb-10">
              <BlockEditor
                key={markdownEntry.id}
                initialContent={markdownEntry.content}
                readOnly
              />
            </div>

            <div className="absolute top-6 right-6 flex items-center gap-4 opacity-0 group-hover/md:opacity-100 transition-opacity duration-300">
              {zipName && (
                <span className="text-xs text-fg-ghost border border-hair rounded-full px-2.5 py-0.5">
                  ↓ {zipName}
                </span>
              )}
              <button onClick={handleSave} className="text-xs text-fg-ghost hover:text-fg-secondary transition-colors">
                save
              </button>
              <button onClick={() => { setMarkdownEntry(null) }} className="text-xs text-fg-ghost hover:text-fg-secondary transition-colors">
                dismiss
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            {activeAlias && <p className="text-xs text-fg-ghost">/{activeAlias}</p>}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative px-14 pb-10 cursor-text group">
        <AnimatePresence>
          {showAliasMenu && filteredAliases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-14 flex flex-col"
            >
              {filteredAliases.map((alias, i) => (
                <button
                  key={alias.alias}
                  onMouseDown={e => { e.preventDefault(); selectAlias(alias) }}
                  className={`text-left py-1 text-sm transition-colors ${
                    i === aliasMenuIndex ? 'text-fg-primary' : 'text-fg-ghost hover:text-fg-secondary'
                  }`}
                >
                  /{alias.alias}
                  {alias.label && <span className="ml-2 text-xs opacity-40">{alias.label}</span>}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}

          rows={1}
          disabled={isSending}
          className="w-full resize-none bg-transparent border-none outline-none ring-0 text-sm text-fg-primary placeholder:text-fg-ghost opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300"
        />
      </div>
    </div>
  )
}

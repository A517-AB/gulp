import { useState, useCallback, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { sdkIpc } from '@shared/bridge'
import { useAliases } from './use-aliases'
import { useArtifactStream } from './use-artifact-stream'
import { GhostInput } from './GhostInput'
import { AliasMenu } from './AliasMenu'
import { ArtifactPanel } from './ArtifactPanel'
import { SavedCommands } from './SavedCommands'
import type { JulesAlias } from './types'

export default function OverviewPage() {
  const { aliases } = useAliases()
  const [activeAlias, setActiveAlias] = useState<JulesAlias | null>(null)
  const [input, setInput] = useState('')
  const [aliasQuery, setAliasQuery] = useState('')
  const [aliasMenuOpen, setAliasMenuOpen] = useState(false)
  const [aliasMenuIndex, setAliasMenuIndex] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [dismissedSession, setDismissedSession] = useState<string | null>(null)

  const filteredAliases = aliases.filter(a =>
    a.command.toLowerCase().startsWith(aliasQuery.toLowerCase())
  )

  const artifactSessionId = activeAlias && activeAlias.sessionId !== dismissedSession
    ? activeAlias.sessionId
    : null

  const files = useArtifactStream(artifactSessionId)
  const hasArtifacts = files.length > 0

  const selectAlias = useCallback((alias: JulesAlias) => {
    setActiveAlias(alias)
    setDismissedSession(null)
    setInput(alias.defaultPrompt ?? '')
    setAliasMenuOpen(false)
    setAliasQuery('')
  }, [])

  const handleChange = useCallback((val: string) => {
    setInput(val)
    if (val.startsWith('/') && !val.includes(' ')) {
      setAliasQuery(val.slice(1))
      setAliasMenuOpen(true)
      setAliasMenuIndex(0)
    } else {
      setAliasMenuOpen(false)
    }
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || !activeAlias || isSending || !sdkIpc) return
    setInput('')
    setIsSending(true)
    try {
      await sdkIpc.sendMessage(activeAlias.sessionId, trimmed)
    } catch (e) {
      console.error('[OverviewPage] send failed:', e)
    } finally {
      setIsSending(false)
    }
  }, [input, activeAlias, isSending])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (aliasMenuOpen && filteredAliases.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAliasMenuIndex(i => Math.min(i + 1, filteredAliases.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAliasMenuIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const sel = filteredAliases[aliasMenuIndex]
        if (sel) selectAlias(sel)
        return
      }
      if (e.key === 'Escape') { setAliasMenuOpen(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [aliasMenuOpen, filteredAliases, aliasMenuIndex, selectAlias, handleSend])

  return (
    <div
      className="flex h-full w-full overflow-hidden relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top fade */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10"
        style={{ background: 'linear-gradient(to bottom, var(--color-base, #0a0a0a) 0%, transparent 100%)' }}
      />

      {/* Left: artifact panel */}
      <AnimatePresence>
        {hasArtifacts && (
          <div className="h-full" style={{ width: '50%' }}>
            <ArtifactPanel
              files={files}
              onDismiss={() => {
                if (activeAlias) setDismissedSession(activeAlias.sessionId)
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Right: input */}
      <div
        className="flex flex-col justify-end h-full transition-all duration-500 ease-in-out"
        style={{ width: hasArtifacts ? '50%' : '100%' }}
      >
        <div className="px-14 pb-10">
          {/* Active alias indicator */}
          {activeAlias && (
            <p className="text-[10px] font-mono text-fg-ghost mb-3">
              /{activeAlias.command}
              {activeAlias.label && <span className="ml-1.5 opacity-50">{activeAlias.label}</span>}
            </p>
          )}

          {/* Alias menu */}
          <div className="relative">
            {aliasMenuOpen && (
              <AliasMenu
                aliases={aliases}
                query={aliasQuery}
                activeIndex={aliasMenuIndex}
                onSelect={selectAlias}
              />
            )}

            <GhostInput
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={activeAlias ? 'ask something...' : 'type / to select a session'}
              disabled={isSending}
            />
          </div>

          {/* Saved commands */}
          <SavedCommands
            aliases={aliases}
            activeId={activeAlias?.id ?? null}
            onSelect={selectAlias}
            visible={hovered}
          />
        </div>
      </div>
    </div>
  )
}

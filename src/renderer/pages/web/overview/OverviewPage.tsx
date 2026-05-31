import { useState, useCallback, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { sdkIpc } from '@shared/bridge'
import type { JulesLocalGeneratedFile } from '@shared/electron'
import { useAliases } from './use-aliases'
import { useArtifactStream } from './use-artifact-stream'
import { GhostInput } from './GhostInput'
import { AliasMenu } from './AliasMenu'
import { ArtifactPanel } from './ArtifactPanel'
import { SavedCommands } from './SavedCommands'
import { MdNotification } from './MdNotification'
import { buildPrompt } from './lib'
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

  const { files, freshCount, refresh } = useArtifactStream(artifactSessionId)
  const hasArtifacts = artifactSessionId !== null && files.length > 0

  const selectAlias = useCallback((alias: JulesAlias) => {
    setActiveAlias(alias)
    setDismissedSession(null)
    setInput('') // empty input + Enter = display mode
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
    if (!activeAlias || isSending || !sdkIpc) return
    const body = input.trim()

    // Display mode — no body, just (re)surface the last markdown for this session.
    if (body === '') {
      refresh()
      return
    }

    // Send mode — body + alias instructions + hardcoded markdown directive.
    setInput('')
    setIsSending(true)
    try {
      await sdkIpc.sendMessage(activeAlias.sessionId, buildPrompt(activeAlias, body))
    } catch (e) {
      console.error('[OverviewPage] send failed:', e)
    } finally {
      setIsSending(false)
    }
  }, [input, activeAlias, isSending, refresh])

  const handleZip = useCallback(async (): Promise<JulesLocalGeneratedFile[]> => {
    if (!activeAlias || !sdkIpc) return files
    try {
      return await sdkIpc.getGeneratedFiles(activeAlias.sessionId)
    } catch {
      return files
    }
  }, [activeAlias, files])

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
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
    >
      {/* Top fade */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10"
        style={{ background: 'linear-gradient(to bottom, var(--color-base, #0a0a0a) 0%, transparent 100%)' }}
      />

      <MdNotification trigger={freshCount} />

      {/* Left: artifact panel */}
      <AnimatePresence>
        {hasArtifacts && (
          <div className="h-full" style={{ width: '50%' }}>
            <ArtifactPanel
              files={files}
              onZip={handleZip}
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
              placeholder={activeAlias ? 'ask, or press enter for the last note' : 'type / to select a session'}
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

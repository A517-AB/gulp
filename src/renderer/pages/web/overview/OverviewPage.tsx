import { useState, useCallback, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { sdkIpc } from '@shared/bridge'
import type { JulesLocalGeneratedFile } from '@shared/electron'
import { TRIGGERS } from '@shared/aliases'
import type { HistoryEntry } from '@shared/history'
import {
  AliasMenu,
  ArtifactPanel,
  GhostInput,
  HistoryPanel,
  MdNotification,
  buildPrompt,
} from '@/components/overview'
import type { JulesAlias } from '@/components/overview'
import { useAliases } from './use-aliases'
import { useHistory } from './use-history'
import { useArtifactStream } from './use-artifact-stream'
import SettingsPage from '../../shared/SettingsPage'

type PanelMode = 'none' | 'aliases' | 'history' | 'settings'

export default function OverviewPage() {
  const { aliases } = useAliases()
  const { entries: historyEntries, push: pushHistory, remove: removeHistory } = useHistory()
  const [activeAlias, setActiveAlias] = useState<JulesAlias | null>(null)
  const [input, setInput] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [panelIndex, setPanelIndex] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [dismissedSession, setDismissedSession] = useState<string | null>(null)
  const [aliasQuery, setAliasQuery] = useState('')

  const filteredAliases = panelMode === 'aliases'
    ? aliases.filter(a => !aliasQuery || a.command.toLowerCase().startsWith(aliasQuery.toLowerCase()))
    : []

  const artifactSessionId = activeAlias && activeAlias.sessionId !== dismissedSession
    ? activeAlias.sessionId : null

  const { files, freshCount, refresh } = useArtifactStream(artifactSessionId)
  const hasArtifacts = artifactSessionId !== null && files.length > 0

  const closePanel = useCallback(() => { setPanelMode('none'); setPanelIndex(0) }, [])

  const selectAlias = useCallback((alias: JulesAlias) => {
    if (alias.action === 'settings') {
      setPanelMode('settings')
      setActiveAlias(null)
      setInput('')
      setAliasQuery('')
      return
    }
    setActiveAlias(alias)
    setDismissedSession(null)
    setInput('')
    setAliasQuery('')
    closePanel()
  }, [closePanel])

  const selectHistory = useCallback((entry: HistoryEntry) => {
    setInput(entry.text)
    closePanel()
  }, [closePanel])

  const handleChange = useCallback((val: string) => {
    setInput(val)
    const trigger = TRIGGERS.find(t => val.startsWith(t))
    if (trigger && !val.includes(' ')) {
      setAliasQuery(val.slice(1))
      setPanelMode('aliases')
      setPanelIndex(0)
    } else if (panelMode === 'aliases' || panelMode === 'settings') {
      closePanel()
      setAliasQuery('')
    }
    if (panelMode === 'history') closePanel()
  }, [panelMode, closePanel])

  const handleSend = useCallback(async () => {
    if (!activeAlias || isSending) return
    const trigger = activeAlias.trigger ?? '/'
    const body = input.trim()

    // / trigger is display-only — never sends to Jules
    if (trigger === '/') {
      refresh()
      return
    }

    // empty + non-action: refresh without sending
    if (body === '' && trigger !== '!') {
      refresh()
      return
    }

    if (!sdkIpc) return
    setInput('')
    setIsSending(true)
    try {
      await sdkIpc.sendMessage(activeAlias.sessionId, buildPrompt(activeAlias, body))
      if (body) void pushHistory(body)
    } catch (e) { console.error('[overview] send failed:', e) }
    finally { setIsSending(false) }
  }, [input, activeAlias, isSending, refresh, pushHistory])

  const handleZip = useCallback(async (): Promise<JulesLocalGeneratedFile[]> => {
    if (!activeAlias || !sdkIpc) return files
    try { return await sdkIpc.getGeneratedFiles(activeAlias.sessionId) }
    catch { return files }
  }, [activeAlias, files])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.code === 'Space' && e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      if (panelMode === 'aliases') { closePanel(); setAliasQuery('') }
      else { setPanelMode('aliases'); setAliasQuery(''); setPanelIndex(0) }
      return
    }

    if (panelMode === 'aliases') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPanelIndex(i => Math.min(i + 1, filteredAliases.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setPanelIndex(i => Math.max(i - 1, 0)); return }
      if ((e.key === 'Enter' || e.key === 'Tab') && filteredAliases.length > 0) {
        e.preventDefault()
        const sel = filteredAliases[panelIndex]
        if (sel) selectAlias(sel)
        return
      }
      if (e.key === 'Escape') { closePanel(); return }
    }

    if (panelMode === 'settings') {
      if (e.key === 'Escape') { closePanel(); return }
    }

    if (panelMode === 'history') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPanelIndex(i => Math.min(i + 1, historyEntries.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setPanelIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') { e.preventDefault(); const sel = historyEntries[panelIndex]; if (sel) selectHistory(sel); return }
      if (e.key === 'Delete' && e.shiftKey) {
        e.preventDefault()
        const sel = historyEntries[panelIndex]
        if (sel) { void removeHistory(sel.id); setPanelIndex(i => Math.max(0, i - 1)) }
        return
      }
      if (e.key === 'Escape') { closePanel(); return }
    }

    if (e.key === 'ArrowUp' && input === '' && panelMode === 'none' && historyEntries.length > 0) {
      e.preventDefault()
      setPanelMode('history')
      setPanelIndex(0)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [panelMode, filteredAliases, historyEntries, panelIndex, selectAlias, selectHistory, removeHistory, closePanel, input, handleSend])

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10"
        style={{ background: 'linear-gradient(to bottom, var(--color-base, #0a0a0a) 0%, transparent 100%)' }}
      />

      <MdNotification trigger={freshCount} />

      <AnimatePresence>
        {hasArtifacts && (
          <div className="h-full" style={{ width: '50%' }}>
            <ArtifactPanel
              files={files}
              onZip={handleZip}
              onDismiss={() => { if (activeAlias) setDismissedSession(activeAlias.sessionId) }}
            />
          </div>
        )}
      </AnimatePresence>

      <div
        className="flex flex-col justify-end h-full transition-all duration-500 ease-in-out"
        style={{ width: hasArtifacts ? '50%' : '100%' }}
      >
        <div className="px-14 pb-10">
          {activeAlias && (
            <p className="text-[10px] font-mono text-fg-ghost mb-3">
              {activeAlias.trigger ?? '/'}{activeAlias.command}
              {activeAlias.label && <span className="ml-1.5 opacity-50">{activeAlias.label}</span>}
            </p>
          )}

          <div className="relative">
            {panelMode === 'settings' && (
              <div className="absolute bottom-full left-0 right-0 mb-4 h-[60vh] bg-[var(--color-base,#0a0a0a)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                <SettingsPage />
              </div>
            )}
            {panelMode === 'aliases' && (
              <AliasMenu
                aliases={filteredAliases}
                activeIndex={panelIndex}
                onSelect={selectAlias}
              />
            )}
            {panelMode === 'history' && (
              <HistoryPanel
                entries={historyEntries}
                activeIndex={panelIndex}
                onSelect={selectHistory}
                onRemove={id => { void removeHistory(id) }}
              />
            )}

            <GhostInput
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

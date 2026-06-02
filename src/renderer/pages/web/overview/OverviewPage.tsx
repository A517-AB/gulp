import { useState, useCallback, useMemo, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { sdkIpc } from '@shared/bridge'
import { TRIGGERS } from '@shared/commands'
import type { Command } from '@shared/commands'
import { TRIGGER_META } from '@shared/commands'
import type { JulesLocalGeneratedFile } from '@shared/electron'
import { useCommands } from '@/hooks/use-commands'
import { useHistory } from '@/hooks/use-history'
import { useArtifactStream } from '@/hooks/use-artifact-stream'
import { GhostInput } from '@/components/overview/GhostInput'
import { CommandMenu } from '@/components/overview/CommandMenu'
import { HistoryPanel } from '@/components/overview/HistoryPanel'
import { ArtifactPanel } from '@/components/overview/ArtifactPanel'
import SettingsPage from '../../shared/settings/SettingsPage'
import type { HistoryEntry } from '@shared/history'

type PanelMode = 'none' | 'commands' | 'history' | 'settings'

function buildPrompt(cmd: Command, body: string): string {
  const mdDirective = cmd.expects === 'md' ? 'Report back in markdown.' : undefined
  return [body.trim(), cmd.instructions, mdDirective]
    .filter((p): p is string => Boolean(p?.trim()))
    .join('\n\n')
}

export default function OverviewPage() {
  const { commands } = useCommands()
  const { entries: historyEntries, push: pushHistory, remove: removeHistory } = useHistory()
  const [activeCommand, setActiveCommand] = useState<Command | null>(null)
  const [input, setInput] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [panelIndex, setPanelIndex] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [dismissedSession, setDismissedSession] = useState<string | null>(null)
  const [commandQuery, setCommandQuery] = useState('')

  const filteredCommands = useMemo(
    () => panelMode === 'commands'
      ? commands.filter(c => !commandQuery || c.command.toLowerCase().startsWith(commandQuery.toLowerCase()))
      : [],
    [panelMode, commands, commandQuery],
  )

  const artifactSessionId = activeCommand?.type === 'jules' && activeCommand.sessionId !== dismissedSession
    ? (activeCommand.sessionId ?? null) : null

  const { files, refresh } = useArtifactStream(artifactSessionId)
  const hasArtifacts = artifactSessionId !== null && files.length > 0

  const closePanel = useCallback(() => { setPanelMode('none'); setPanelIndex(0) }, [])

  const selectCommand = useCallback((cmd: Command) => {
    if (cmd.type === 'local' && cmd.action) {
      setPanelMode(cmd.action as PanelMode)
      setInput('')
      setCommandQuery('')
      return
    }
    setActiveCommand(cmd)
    setDismissedSession(null)
    setInput('')
    setCommandQuery('')
    closePanel()
  }, [closePanel])

  const selectHistory = useCallback((entry: HistoryEntry) => {
    setInput(entry.text)
    closePanel()
  }, [closePanel])

  const handleChange = useCallback((val: string) => {
    setInput(val)
    const trigger = TRIGGERS.find(t => val.startsWith(t))
    // don't open command menu while a send is in flight
    if (trigger && !val.includes(' ') && !isSending) {
      setCommandQuery(val.slice(1))
      setPanelMode('commands')
      setPanelIndex(0)
    } else if (panelMode === 'commands' || panelMode === 'settings') {
      closePanel()
      setCommandQuery('')
    }
    if (panelMode === 'history') closePanel()
  }, [panelMode, closePanel, isSending])

  const handleSend = useCallback(async () => {
    if (!activeCommand || isSending) return
    const { trigger, type, sessionId, action } = activeCommand
    const body = input.trim()

    // local — fire action, never touches Jules
    if (type === 'local') {
      console.log('[overview] local command:', activeCommand.command, action)
      if (action) setPanelMode(action as PanelMode)
      return
    }

    // % display — refresh artifact panel, nothing sent
    if (trigger === '%') {
      console.log('[overview] display:', sessionId)
      refresh()
      return
    }

    // # stream — live activity stream (wired later)
    if (trigger === '#') {
      console.log('[overview] stream requested:', sessionId)
      refresh()
      return
    }

    // @ message — send immediately, body optional
    if (trigger === '@' || trigger === '!') {
      if (!sdkIpc || !sessionId) { console.warn(`[overview] ${trigger} command missing sdkIpc or sessionId`); return }
      const prompt = buildPrompt(activeCommand, body)
      console.log(`[overview] ${TRIGGER_META[trigger].label} → session:`, sessionId)
      setIsSending(true)
      try {
        await sdkIpc.sendMessage(sessionId, prompt)
        if (body) void pushHistory(body)
      } catch (e) { console.error('[overview] send failed:', e) }
      finally { setIsSending(false) }
      return
    }

    // ? query — needs body
    if (trigger === '?') {
      if (body === '') { refresh(); return }
      if (!sdkIpc || !sessionId) { console.warn('[overview] ? command missing sdkIpc or sessionId'); return }
      console.log('[overview] query →', sessionId)
      setInput('')
      setIsSending(true)
      try {
        await sdkIpc.sendMessage(sessionId, buildPrompt(activeCommand, body))
        void pushHistory(body)
      } catch (e) { console.error('[overview] query failed:', e) }
      finally { setIsSending(false) }
    }
  }, [input, activeCommand, isSending, refresh, pushHistory])

  const handleZip = useCallback(async (): Promise<JulesLocalGeneratedFile[]> => {
    if (!activeCommand?.sessionId || !sdkIpc) return files
    try { return await sdkIpc.getGeneratedFiles(activeCommand.sessionId) }
    catch { return files }
  }, [activeCommand, files])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.code === 'Space' && e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      if (panelMode === 'commands') { closePanel(); setCommandQuery('') }
      else { setPanelMode('commands'); setCommandQuery(''); setPanelIndex(0) }
      return
    }

    if (panelMode === 'commands') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPanelIndex(i => Math.min(i + 1, filteredCommands.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setPanelIndex(i => Math.max(i - 1, 0)); return }
      if ((e.key === 'Enter' || e.key === 'Tab') && filteredCommands.length > 0) {
        e.preventDefault()
        const sel = filteredCommands[panelIndex]
        if (sel) selectCommand(sel)
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
  }, [panelMode, filteredCommands, historyEntries, panelIndex, selectCommand, selectHistory, removeHistory, closePanel, input, handleSend])

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10"
        style={{ background: 'linear-gradient(to bottom, var(--color-base, #0a0a0a) 0%, transparent 100%)' }}
      />

      <AnimatePresence>
        {hasArtifacts && (
          <div className="h-full" style={{ width: '50%' }}>
            <ArtifactPanel
              files={files}
              onZip={handleZip}
              onDismiss={() => { if (activeCommand) setDismissedSession(activeCommand.sessionId ?? null) }}
            />
          </div>
        )}
      </AnimatePresence>

      <div
        className="flex flex-col justify-end h-full transition-all duration-500 ease-in-out"
        style={{ width: hasArtifacts ? '50%' : '100%' }}
      >
        <div className="px-14 pb-10">
          {activeCommand && (
            <p className="text-[10px] font-mono text-fg-ghost mb-3">
              {activeCommand.trigger}{activeCommand.command}
              {activeCommand.label && <span className="ml-1.5 opacity-50">{activeCommand.label}</span>}
            </p>
          )}

          <div className="relative">
            {panelMode === 'settings' && (
              <div className="absolute bottom-full left-0 right-0 mb-4 h-[60vh] bg-[var(--color-base,#0a0a0a)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                <SettingsPage />
              </div>
            )}
            {panelMode === 'commands' && (
              <CommandMenu
                commands={filteredCommands}
                activeIndex={panelIndex}
                onSelect={selectCommand}
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

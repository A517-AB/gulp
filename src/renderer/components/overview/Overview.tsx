import {type KeyboardEvent, useCallback, useMemo, useState} from 'react'
import {AnimatePresence} from 'framer-motion'
import type {Command} from '@shared/commands'
import {TRIGGERS} from '@shared/commands'
import {useJules} from '@/lib/jules/provider'
import {useHistory} from '@/hooks/use-history'
import {useArtifactStream} from '@/hooks/use-artifact-stream'
import type {HistoryEntry} from '@shared/history'
import type {PanelMode} from './types'
import {GhostInput} from './GhostInput'
import {CommandMenu} from './CommandMenu'
import {HistoryPanel} from './HistoryPanel'
import {ArtifactPanel} from './ArtifactPanel'
import SettingsPage from '@/pages/shared/settings/SettingsPage'

export function Overview() {
  const { client } = useJules()
    const commands: Command[] = []
  const { entries: historyEntries, push: pushHistory, remove: removeHistory } = useHistory()
  const [activeCommand, setActiveCommand] = useState<Command | null>(null)
  const [input, setInput] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [panelIndex, setPanelIndex] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [dismissedSession, setDismissedSession] = useState<string | null>(null)
  const [commandQuery, setCommandQuery] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const flash = (msg: string) => {
    setStatus(msg)
    setTimeout(() => { setStatus(null) }, 2500)
  }

  const filteredCommands = useMemo(
    () => panelMode === 'commands'
      ? commands.filter(c => !commandQuery || c.command.toLowerCase().startsWith(commandQuery.toLowerCase()))
      : [],
    [panelMode, commands, commandQuery],
  )

    const artifactSessionId = activeCommand?.trigger === '/' && activeCommand.sessionId !== dismissedSession
        ? activeCommand.sessionId : null

  const { files, refresh } = useArtifactStream(artifactSessionId)
  const hasArtifacts = artifactSessionId !== null && files.length > 0

  const closePanel = useCallback(() => { setPanelMode('none'); setPanelIndex(0) }, [])

  const selectCommand = useCallback((cmd: Command) => {
      if (cmd.trigger === '>' && cmd.action) {
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
    const body = input.trim()

      if (activeCommand.trigger === '>') {
      if (activeCommand.action) setPanelMode(activeCommand.action as PanelMode)
      return
    }

      if (activeCommand.trigger === '@') {
      flash(`@ ${activeCommand.command} — terminal not wired yet`)
      return
    }

      if (activeCommand.trigger === '/') {
      flash(`loading ${activeCommand.command}…`)
      refresh()
      return
    }

      if (activeCommand.trigger === '#') {
      flash(`streaming ${activeCommand.command}…`)
      refresh()
      return
    }

      if (activeCommand.trigger === '!') {
      if (!body) return
      const { sessionId, command, instructions } = activeCommand
      if (!client || !sessionId) { flash(`${command} — no session`); return }
      const prompt = [body, instructions].filter(Boolean).join('\n\n')
      setIsSending(true)
      try {
        await client.createActivity({ sessionId, content: prompt })
        void pushHistory(body)
        flash(`sent to ${command}`)
      } catch (e) {
        flash(`${command} — send failed`)
        console.error('[cmd !] send failed:', e)
      } finally { setIsSending(false) }
    }
  }, [input, activeCommand, isSending, refresh, pushHistory, client])

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
              onZip={() => files}
              onDismiss={() => {
                  if (activeCommand?.trigger === '/') setDismissedSession(activeCommand.sessionId)
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <div
        className="flex flex-col justify-end h-full transition-all duration-500 ease-in-out"
        style={{ width: hasArtifacts ? '50%' : '100%' }}
      >
        <div className="px-14 pb-10">
          <p className="text-[10px] font-mono mb-3 h-4">
            {status
              ? <span className="text-fg-secondary">{status}</span>
              : activeCommand && (
                <span className="text-fg-ghost">
                  {activeCommand.trigger}{activeCommand.command}
                  {activeCommand.label && <span className="ml-1.5 opacity-50">{activeCommand.label}</span>}
                </span>
              )
            }
          </p>

          <div className="relative">
            {panelMode === 'settings' && (
              <div className="absolute bottom-full left-0 right-0 mb-4 h-[60vh] bg-[var(--color-base,#0a0a0a)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                <SettingsPage />
              </div>
            )}
            {panelMode === 'commands' && (
              <CommandMenu commands={filteredCommands} activeIndex={panelIndex} onSelect={selectCommand} />
            )}
            {panelMode === 'history' && (
              <HistoryPanel
                entries={historyEntries}
                activeIndex={panelIndex}
                onSelect={selectHistory}
                onRemove={id => { void removeHistory(id) }}
              />
            )}
            <GhostInput value={input} onChange={handleChange} onKeyDown={handleKeyDown} disabled={isSending} />
          </div>
        </div>
      </div>
    </div>
  )
}

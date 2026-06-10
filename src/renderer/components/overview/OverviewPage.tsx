import { useState, useCallback, useEffect } from 'react'
import { sdkIpc } from '@shared/bridge'
import { useCommands } from '@/store/commands'
import { executeAt, executeDisplay } from '@shared/commands'
import { CommandInput } from './CommandInput'
import { BlockDisplay } from './BlockDisplay'
import type { AtCommand, DisplayCommand } from '@shared/commands'

export function OverviewPage() {
  const commands = useCommands(s => s.commands)
  const load     = useCommands(s => s.load)
  const [markdown, setMarkdown] = useState<string | null>(null)

  useEffect(() => { void load() }, [load])
  const [status,   setStatus]   = useState<string | null>(null)

  const handleDisplay = useCallback(async (command: DisplayCommand) => {
    if (!sdkIpc) { setStatus('no connection'); return }
    setStatus('refreshing...')
    const result = await executeDisplay({ hydrate: sdkIpc.session.hydrate, select: sdkIpc.session.select }, command)
    if (result.status === 'ok') {
      setMarkdown(result.markdown)
      setStatus(null)
    } else {
      setStatus(result.status === 'empty' ? 'no messages yet' : (result.error ?? 'error'))
    }
  }, [])

  const handleSend = useCallback(async (command: AtCommand, prompt: string) => {
    if (!sdkIpc) { setStatus('no connection'); return }
    setStatus('sending...')
    const result = await executeAt(sdkIpc.session.send, command, prompt)
    if (result.status === 'sent') {
      setStatus('sent')
      setTimeout(() => { setStatus(null) }, 2000)
    } else {
      setStatus(result.error ?? 'error')
    }
  }, [])

  return (
    <div className="flex flex-row h-full w-full overflow-hidden">

      {/* left: input anchored to bottom */}
      <div className="relative w-1/2 h-full overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 px-14 pb-10">
          {status && (
            <p className="pb-2 text-xs text-fg-ghost">{status}</p>
          )}
          <CommandInput
            commands={commands}
            onDisplay={command => { void handleDisplay(command) }}
            onSend={(command, prompt) => { void handleSend(command, prompt) }}
          />
        </div>
      </div>

      {/* right: markdown result */}
      <div className="flex-1 h-full overflow-y-auto px-10 pt-16 pb-10" style={{ scrollbarWidth: 'none' }}>
        {markdown !== null ? (
          <BlockDisplay content={markdown} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-fg-ghost">no result</p>
          </div>
        )}
      </div>

    </div>
  )
}

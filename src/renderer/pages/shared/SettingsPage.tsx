import { useState } from 'react'
import { sdkIpc } from '@shared/bridge'

export default function SettingsPage() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const testIpc = async () => {
    if (!sdkIpc) { setResult('sdkIpc not available (web mode?)'); return }
    setLoading(true)
    setResult(null)
    try {
      await sdkIpc.setApiKey(localStorage.getItem('jules-api-key'))
      setResult('sdkIpc reachable — API key forwarded to main process')
    } catch (e) {
      setResult(`error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <button
        onClick={() => { void testIpc() }}
        disabled={loading}
        className="px-4 py-2 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary hover:bg-hover transition-colors disabled:opacity-50"
      >
        {loading ? 'testing...' : 'test sdkIpc'}
      </button>
      {result && (
        <p className="text-xs font-mono text-fg-secondary max-w-sm text-center">{result}</p>
      )}
    </div>
  )
}

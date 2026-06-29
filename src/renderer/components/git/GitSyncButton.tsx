import {useCallback, useState} from 'react'
import {GitBranch} from 'lucide-react'
import {git, uiNotification} from '@shared/bridge'

// check this shit later and see what it does
export function GitSyncButton() {
  const [syncing, setSyncing] = useState(false)

  const handleSync = useCallback(async () => {
    if (syncing) return
    if (!git) {
        uiNotification?.show({title: 'Sync Failed', body: 'Git bridge API not available.'})
      return
    }

    setSyncing(true)
    try {
      const addRes = await git.add('D:/fuse')
        if (!addRes.ok) throw new Error(addRes.stderr || 'git add failed')

      const commitRes = await git.commit('D:/fuse', 'sync', true)
        if (!commitRes.ok) throw new Error(commitRes.stderr || 'git commit failed')

      const pushRes = await git.push('D:/fuse')
        if (!pushRes.ok) throw new Error(pushRes.stderr || 'git push failed')

        uiNotification?.show({title: 'Git Sync Success', body: 'Staged, committed, and pushed D:/fuse.'})
    } catch (err) {
      console.error('Git sync error:', err)
        uiNotification?.show({title: 'Git Sync Failed', body: err instanceof Error ? err.message : String(err)})
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  return (
    <button
      onClick={() => { void handleSync() }}
      disabled={syncing}
      className="bg-surface border border-subtle text-fg-muted text-[10px] px-2.5 py-1 rounded font-mono flex items-center gap-1.5 hover:bg-hover hover:text-fg-primary transition-colors uppercase tracking-wider disabled:opacity-50"
      title="Stage, commit, and push changes in D:/fuse"
    >
      <GitBranch className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Git Sync'}
    </button>
  )
}

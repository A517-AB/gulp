import { useState, useCallback } from 'react'
import { GitBranch } from 'lucide-react'
import { git } from '@shared/bridge'
import { useNotification } from '@renderer/library/notification'

export function GitSyncButton() {
  const [syncing, setSyncing] = useState(false)
  const notification = useNotification()

  const handleSync = useCallback(async () => {
    if (syncing) return
    if (!git) {
      notification.error({ 
        title: 'Sync Failed', 
        body: 'Git bridge API not available.' 
      })
      return
    }

    setSyncing(true)
    try {
      // 1. Stage all changes in D:/fuse
      const addRes = await git.add('D:/fuse')
      if (!addRes.ok) {
        throw new Error(addRes.stderr || 'git add failed')
      }

      // 2. Commit changes (allow empty so it doesn't fail if there's nothing new to commit)
      const commitRes = await git.commit('D:/fuse', 'sync', true)
      if (!commitRes.ok) {
        throw new Error(commitRes.stderr || 'git commit failed')
      }

      // 3. Push to upstream
      const pushRes = await git.push('D:/fuse')
      if (!pushRes.ok) {
        throw new Error(pushRes.stderr || 'git push failed')
      }

      notification.success({ 
        title: 'Git Sync Success', 
        body: 'Successfully staged, committed, and pushed changes in D:/fuse.' 
      })
    } catch (err) {
      console.error('Git sync error:', err)
      notification.error({ 
        title: 'Git Sync Failed', 
        body: err instanceof Error ? err.message : String(err) 
      })
    } finally {
      setSyncing(false)
    }
  }, [syncing, notification])

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

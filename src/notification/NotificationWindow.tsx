import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { BrowserSoundController } from './sounds'
import type { SoundId } from './sounds'

// ── types ──────────────────────────────────────────────────────────────────────

export interface NotifAction {
  id:     string
  label:  string
  style?: 'primary' | 'ghost'
}

export interface NotifPayload {
  title:      string
  body?:      string
  type?:      'default' | 'success' | 'error' | 'info' | 'warning'
  actions?:   NotifAction[]
  duration?:  number
  id?:        string | number
  sound?:     SoundId
  extraData?: unknown
  source?:    string
}

interface NotifBridge {
  onShow:    (cb: (data: NotifPayload) => void) => void
  clicked:   (actionId: string, extraData?: unknown) => void
  dismissed: (extraData?: unknown) => void
}

const notif = (window as unknown as { notif: NotifBridge }).notif

// ── theme ──────────────────────────────────────────────────────────────────────

function useLocalTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('gulp:theme') ?? 'dark') as 'light' | 'dark' }
    catch { return 'dark' }
  })
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'gulp:theme') setTheme((e.newValue ?? 'dark') as 'light' | 'dark')
    }
    window.addEventListener('storage', handler)
    return () => { window.removeEventListener('storage', handler) }
  }, [])
  return theme
}

// ── custom toast ───────────────────────────────────────────────────────────────

function NotifToast({ id, data }: { id: string | number; data: NotifPayload }) {
  const hasActions  = (data.actions?.length ?? 0) > 0
  const isClickable = !hasActions && data.extraData !== undefined

  return (
    <div
      onClick={isClickable ? () => { notif.clicked('default', data.extraData); toast.dismiss(id) } : undefined}
      className={`relative flex items-start gap-3 w-full rounded-xl border border-hair bg-overlay/90 backdrop-blur-xl shadow-2xl overflow-hidden px-4 py-3${isClickable ? ' cursor-pointer' : ''}`}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-xs font-medium text-fg-primary leading-snug">{data.title}</p>

        {data.body !== undefined && (
          <p className="text-2xs text-fg-secondary leading-snug">{data.body}</p>
        )}

        {hasActions && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {data.actions?.map((action) => (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation()
                  notif.clicked(action.id, data.extraData)
                  toast.dismiss(id)
                }}
                className={
                  action.style === 'ghost'
                    ? 'text-2xs font-medium px-2.5 py-1 rounded-md text-fg-ghost hover:text-fg-secondary hover:bg-hover transition-colors'
                    : 'text-2xs font-medium px-2.5 py-1 rounded-md bg-selected text-fg-primary hover:bg-hover transition-colors'
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); notif.dismissed(data.extraData); toast.dismiss(id) }}
        className="shrink-0 mt-0.5 text-fg-ghost hover:text-fg-secondary transition-colors"
        aria-label="Dismiss"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ── sound + fire ───────────────────────────────────────────────────────────────

const soundController = new BrowserSoundController({ volume: 0.35 })

function fire(data: NotifPayload) {
  if (data.sound && data.sound !== 'none') {
    void soundController.play(data.sound)
  }

  toast.custom(
    (id) => <NotifToast id={id} data={data} />,
    {
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.id       !== undefined && { id:       data.id }),
    },
  )
}

// ── root ───────────────────────────────────────────────────────────────────────

export function NotificationWindow() {
  const theme = useLocalTheme()

  useEffect(() => {
    notif.onShow(fire)
  }, [])

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      gap={8}
      toastOptions={{ unstyled: true, classNames: { toast: 'w-full' } }}
    />
  )
}

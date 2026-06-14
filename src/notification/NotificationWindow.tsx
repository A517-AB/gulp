import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { BrowserSoundController } from '@/library/notification/sounds'
import { notifBridge, type NotifPayload } from './bridge'

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
    return () => { window.removeEventListener('storage', handler); }
  }, [])

  return theme
}

const soundController = new BrowserSoundController({ volume: 0.35 })

function fire(data: NotifPayload) {
  if (data.sound && data.sound !== 'none') {
    void soundController.play(data.sound)
  }

  const opts = {
    ...(data.body     !== undefined && { description: data.body }),
    ...(data.duration !== undefined && { duration:    data.duration }),
    ...(data.id       !== undefined && { id:          data.id }),
    ...(data.action && {
      action: { label: data.action.label, onClick: () => { notifBridge.click(data.extraData) } },
    }),
    ...(data.cancel && {
      cancel: { label: data.cancel.label, onClick: () => { notifBridge.cancel(data.extraData) } },
    }),
    ...(!data.action && !data.cancel && data.extraData !== undefined && {
      onClick: () => { notifBridge.click(data.extraData) },
    }),
  }

  switch (data.type) {
    case 'success': toast.success(data.title, opts); break
    case 'error':   toast.error(data.title, opts);   break
    case 'info':    toast.info(data.title, opts);     break
    case 'warning': toast.warning(data.title, opts);  break
    default:        toast(data.title, opts);           break
  }
}

export function NotificationWindow() {
  const theme = useLocalTheme()

  useEffect(() => {
    notifBridge.onShow(fire)
  }, [])

  return (
    <Toaster
      theme={theme}
      richColors
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          actionButton:  '!bg-zinc-100 !text-zinc-900 hover:!bg-white !rounded-md !font-medium transition-colors',
          cancelButton:  '!bg-zinc-800 !text-zinc-400 hover:!bg-zinc-700 hover:!text-zinc-200 !rounded-md !font-medium transition-colors',
          closeButton:   '!bg-zinc-900 !border !border-zinc-700/50 !text-zinc-500 hover:!text-zinc-100 hover:!bg-zinc-800 !rounded-md transition-colors',
        },
      }}
    />
  )
}

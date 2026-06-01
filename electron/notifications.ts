import { Notification } from 'electron'
import type { WebContents } from 'electron'
import type { AppNotification } from '../src/shared/notifications'

/** Fires an OS notification (off-window) and pushes to the renderer. */
export function dispatchNotification(
  notification: AppNotification,
  webContents: WebContents | null,
): void {
  if (Notification.isSupported()) {
    new Notification({
      title:  notification.title,
      body:   notification.body,
      silent: !notification.sound,
    }).show()
  }
  webContents?.send('notification.received', notification)
}

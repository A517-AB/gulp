import { Notification } from 'electron'
import type { WebContents } from 'electron'
import type { HubNotification } from '../../src/shared/hub'

export function dispatchNotification(
  notification: HubNotification,
  webContents: WebContents | null,
): void {
  if ((notification.channel === 'alarm' || notification.channel === 'reminder') &&
      Notification.isSupported()) {
    new Notification({
      title:  notification.title,
      body:   notification.body ?? '',
      silent: !notification.sound || notification.sound === 'none',
    }).show()
  }
  webContents?.send('notification.received', notification)
}

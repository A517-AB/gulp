type Sender = Electron.WebContents

export function serialize<T>(data: T): T {
    if (data === undefined || data === null) return data
    return JSON.parse(JSON.stringify(data)) as T
}

export function send(sender: Sender, ch: string, payload?: unknown) {
    if (!sender.isDestroyed()) sender.send(ch, payload)
}

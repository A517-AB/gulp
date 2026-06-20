// Error wire format — pure, no SDK, no electron-main imports.
//
// IPC rejections only carry a `message` string; the thrown Error's class and any
// custom fields (status, url) are lost crossing the boundary. So the main side
// encodes a JSON envelope behind a sentinel (errors.ts), and the renderer decodes
// it back into a typed IpcSdkError here. This file is safe to import from either
// process because it touches nothing platform-specific.

export const SENTINEL = 'JULES_IPC_ERR::'

export interface IpcErrorShape {
  name:     string
  message:  string
  status?:  number
  url?:     string
  cause?:   string
}

/** Error reconstructed on the renderer from an enveloped IPC failure. */
export class IpcSdkError extends Error {
  readonly status: number | undefined
  readonly url:    string | undefined

  constructor(shape: IpcErrorShape) {
    super(shape.message)
    this.name   = shape.name
    this.status = shape.status
    this.url    = shape.url
  }
}

/** Turn an IPC rejection back into a typed error if it carries our envelope. */
export function decodeError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err)
  const at  = raw.indexOf(SENTINEL)
  if (at === -1) return err instanceof Error ? err : new Error(raw)

  try {
    const shape = JSON.parse(raw.slice(at + SENTINEL.length)) as IpcErrorShape
    return new IpcSdkError(shape)
  } catch {
    return err instanceof Error ? err : new Error(raw)
  }
}

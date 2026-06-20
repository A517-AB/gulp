// Public surface of the IPC bridge.
//   - registerSdkHandlers(): wire the SDK into the main process (call once at boot)
//   - sdk: the renderer-facing client, exposed via preload
export { registerSdkHandlers } from './handlers'
export { sdk } from './client'

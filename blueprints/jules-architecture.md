# Jules Architecture

## Local Cache Architecture

The `@google/jules-sdk` manages a highly optimized local cache within the `.jules/cache` directory. This cache ensures that the UI remains highly responsive without needing round-trip network calls or heavy memory usage for historical session data.

### 1. The Append-Only JSON Lines (`.jsonl`) Log
Instead of storing all session data in a single massive JSON array (e.g., `sessions.json`), Jules uses a `.jsonl` file (JSON Lines). 
- **O(1) Writes**: Adding new data to the file is performed via a simple file append operation. The SDK does not need to load, parse, or re-stringify the massive history; it merely drops a new stringified object to the very end of the file. 
- **Fault-Tolerance**: Because each line is a completely independent JSON document, crashes mid-write only corrupt the final line rather than breaking a global JSON array syntax.

### 2. Line-by-Line Async Streaming
To read data, the SDK employs `fs.createReadStream` and asynchronous generators (`for await`).
- **O(1) Memory Footprint**: Even if the cache grows to hundreds of megabytes, reading it never loads more than a single line into RAM at any given time.
- **Lazy Evaluation**: The frontend UI heavily limits data fetching (e.g., `sdkIpc.client.sessions({limit: 20})`). The backend stream only parses the requested number of lines before immediately closing the file descriptor, skipping the rest of the cache entirely.

## IPC Streaming and React Hooks

When implementing streaming via IPC (like the `sdk:activities.updates` streams), special care is needed in the React frontend:

- **Stream Leak Prevention**: If a frontend React component mounts and subscribes to an IPC stream, but the backend loop uses an infinite or continuous `for await` generator, simply removing the `ipcRenderer.on` listener on the frontend during unmount is *not* enough. The backend generator must be explicitly cancelled, otherwise, re-mounting the component will spawn duplicate backend loops.
- **Zustand Deduplication**: Always update streaming lists by `id` rather than blindly appending or ignoring incoming chunks. `const index = existing.findIndex(a => a.id === activity.id)` ensures streaming text chunks properly update an existing message box rather than spawning multiple or failing to register.

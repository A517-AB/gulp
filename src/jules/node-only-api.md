# Jules SDK — Node-Only APIs & Capabilities

This document lists the APIs, classes, and helper functions from the Jules SDK integration that **must** run in a Node.js environment (the Electron main process) and cannot be executed directly within the browser/renderer context.

---

## 1. Storage & Cache Classes
These storage engines require direct access to the local file system (`node:fs`) to read and write activity logs and session indices.

* **`NodeSessionStorage`**
  * **Description:** Manages the index of cached sessions.
  * **Key APIs:** `init()`, `upsert()`, `get()`, `delete()`, `scanIndex()`.
* **`NodeFileStorage`**
  * **Description:** Handles disk-backed activity logs for each individual session.
  * **Key APIs:** `init()`, `append()`, `get()`, `latest()`, `scan()`.

---

## 2. Disk & Cache Utility Functions
These pure utilities query or manipulate the local cache directory path (`~/.jules` or overridden directories).

* **`getRootDir()`** $\rightarrow$ `string` (Resolves the absolute path to the local Jules cache directory)
* **`getCacheInfo(rootDirOverride?)`** $\rightarrow$ `Promise<GlobalCacheInfo>`
* **`getSessionCacheInfo(sessionId, rootOverride?)`** $\rightarrow$ `Promise<SessionCacheInfo | null>`
* **`getActivityCount(sessionId, rootOverride?)`** $\rightarrow$ `Promise<number>`
* **`getLatestActivities(sessionId, n, rootOverride?)`** $\rightarrow$ `Promise<Activity[]>`
* **`getSessionCount(rootOverride?)`** $\rightarrow$ `Promise<number>`
* **`updateGlobalCacheMetadata(rootOverride?)`** $\rightarrow$ `Promise<void>`
* **`isSessionFrozen(lastActivityTime, thresholdDays?)`** $\rightarrow$ `boolean` (Queries session activity timers)

---

## 3. Platform Bridge Interfaces
The SDK utilizes `Platform` dependency injection to interact with runtime environments. The Node implementation (`NodePlatform`) accesses Node-specific modules.

* **`NodePlatform`**
  * **Crypto & Signing:** `crypto.sign()`, `crypto.verify()` (uses `node:crypto`).
  * **Environment Variables:** `getEnv(key)` (uses `process.env`).
  * **Disk I/O:** `saveFile()`, `readFile()`, `writeFile()`, `deleteFile()` (uses `node:fs/promises`).

---

## 4. Git & Workspace Shell Integrations
These operations execute shell processes (e.g. `execFileSync('git', ...)`) to discover local repository structure or apply codebase patches.

* **`resolveGitSource(cwd?)`**
  * **Description:** Runs `git remote get-url origin` to resolve the GitHub repository owner/slug and default branch.
* **`applyPatch(sessionId, options: { cwd: string })`**
  * **Description:** Runs sequence of shell commands to apply the generated git changeset to the target directory:
    1. `git checkout -b <branch>`
    2. Writes `.patch` file.
    3. `git apply <patch>`
    4. `git add .`
    5. `git commit -m <msg>`

---

## 5. Artifact Saving IPC Handlers
Exposed specifically through the Electron main process to allow the React renderer to save downloaded resources to the user's host computer.

* **`sdk:artifact.save(data, filepath)`**
  * **Description:** Writes base64 data to disk.
  * **Implementation:** `fs.promises.writeFile(resolved, Buffer.from(data, 'base64'))`.

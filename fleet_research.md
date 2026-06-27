# Jules Fleet Research

Based on a thorough review of the codebase, here is a complete breakdown of the "Jules Fleet" system, how it's used, how to incorporate it, and how it integrates with the Render side.

## 1. What is Jules Fleet?

Jules Fleet is a multi-agent orchestration system. Instead of a user having a one-on-one session with a single AI agent, Fleet allows you to dispatch multiple, parallel Jules agents against a single repository to automatically triage, diagnose, and fix GitHub issues simultaneously.

## 2. Core Architecture (The Scripts)

The primary engine for Fleet currently lives in `scripts/fleet/`. It is structured as a pipeline of four distinct scripts:

### Phase 1: Analysis & Planning (`fleet-plan.ts` & `fleet-analyze.ts`)
*   **Input**: It reads open GitHub issues from the repository.
*   **Process**: It spins up a "Planner" Jules session using a highly structured prompt (`scripts/fleet/prompts/analyze-issues.ts`).
*   **Output**: The planner generates a task manifest (`.fleet/<date>/issue_tasks.json`) and a markdown summary.
*   **Conflict Avoidance**: The most critical part of the planner is the **File Ownership Matrix**. It strictly ensures that no two parallel tasks modify the same file (including test files) to prevent Git merge conflicts down the line.

### Phase 2: Dispatching (`fleet-dispatch.ts`)
*   **Validation**: It reads the generated `issue_tasks.json` and performs a pre-dispatch check to guarantee no ownership conflicts exist between tasks.
*   **Execution**: It uses `jules.all()` to spin up parallel, independent Jules sessions for each defined task.
*   **Tracking**: It maps the original Task IDs to the newly created Jules Session IDs and saves this in `.fleet/<date>/sessions.json`.

### Phase 3: Merging (`fleet-merge.ts`)
*   **Discovery**: It scans GitHub for open Pull Requests that match the Session IDs.
*   **Sequential Reconciliation**: It processes PRs one by one. Before merging PR #2, it updates PR #2's branch from `main` (which now includes PR #1's changes).
*   **Auto-Retry**: If a merge conflict *does* occur during this update, the script automatically closes the conflicting PR and re-dispatches a brand new Jules session for that task against the updated `main` branch.
*   **CI Validation**: It waits for GitHub Checks (CI) to pass before executing a squash merge.

## 3. Render Side / Frontend UI Integration

The frontend UI integration for Fleet is currently rudimentary and acts more as a task queue than a full orchestrator.

### `QueuesPage.tsx`
*   **Storage**: The UI reads and writes task groups (`FleetTaskGroup`) and individual tasks (`FleetTask`) to a local JSON file (`D:\fuse\tasks.json`) via an Electron IPC channel (`queues.getTasks`, `queues.saveTasks`).
*   **Execution**: When a user clicks "Send" on a task in the UI (`handleSendTask`), it **does not** use the parallel dispatch system. Instead, it simply takes the task's prompt and calls the global `startSession` function, launching a standard, single Jules session.
*   **IPC Stubs**: There are TypeScript interfaces defined in `src/shared/jules-ipc.ts` for a proper `JulesFleetIPC` (with a `run` method that takes tasks and a concurrency limit). There is also a React hook `useJulesFleet` in `src/renderer/hooks/jules-git/use-jules-fleet.ts`. However, this hook currently just returns `null`. The backend IPC handler for `JulesFleetIPC` is not implemented in the Electron main process.

## 4. The `@google/jules-fleet` npm Package

The repository includes an experimental npm package: `@google/jules-fleet` (`^0.0.1-experimental.35`).
According to the `blueprints/testing-audit.md`, there are test playgrounds (`fleet-playground.ts`, `merge-playground.ts`) that experiment with using this package to replace the manual `scripts/fleet/` implementation. The package aims to provide a cleaner `SessionDispatcher` and `MergeHandler` API.

## 5. How to Incorporate, Change, and Upgrade

If you want to fully incorporate and upgrade the Fleet system into the UI, here is the roadmap based on the current architecture:

1.  **Implement the IPC Handler**: In the Electron main process (e.g., `electron/fleet.ts`), implement the `JulesFleetIPC` interface. This handler should wire directly into the logic currently found in `scripts/fleet/fleet-dispatch.ts`.
2.  **Activate the React Hook**: Update `useJulesFleet` to return the `ipcRenderer.invoke` calls for the new Fleet IPC channels.
3.  **Upgrade `QueuesPage.tsx`**: Modify the "Send Group" functionality in the UI to use the new `useJulesFleet().run()` method instead of iterating over `startSession`. This will allow the UI to actually launch parallel agents.
4.  **Migrate to the SDK**: Transition the raw scripts in `scripts/fleet/` to utilize the `@google/jules-fleet` npm package (as seen in `fleet-playground.ts`). This will provide a more stable and robust foundation for orchestrating tasks and managing merges.
5.  **Environment Variables**: Ensure that any user running Fleet has `JULES_API_KEY` and `GITHUB_TOKEN` properly configured in their `.env` file, as the dispatch and merge phases rely heavily on GitHub API access.

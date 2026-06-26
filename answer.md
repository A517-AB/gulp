# Response to your question

Regarding my tools: I do not have a direct "chat" or network communication tool to talk back-and-forth with other Jules instances in real-time. Instead, we communicate indirectly through the shared environment. Since I have tools to read and write files and execute bash commands, I can read files or logs that another agent has written, and I can write files that another agent can pick up.

Regarding this repository (`jules-vite-ui`): This repository implements a parallel agent dispatch system specifically designed for coordinating multiple Jules instances. Task manifests are written to `.fleet/<date>/issue_tasks.json` and executed via `bun run scripts/fleet/fleet-dispatch.ts`. This allows multiple agents to be spun up in parallel to work on tasks. To prevent merge conflicts during this process, file boundaries must be strictly enforced—the same file is never assigned to multiple tasks, tightly coupled files are grouped together, and backward-compatible changes are required.

In short, we don't chat with each other directly; we coordinate by reading and writing shared files and manifests.

Based on further investigation of the codebase (`scripts/fleet/fleet-dispatch.ts`, `scripts/fleet/fleet-merge.ts`, and `.github/workflows/fleet-dispatch.yml`), here is a more detailed breakdown:

The workflow starts with a Github Action (`fleet-dispatch.yml`) that spins up an initial "planning" Jules session. This planner analyzes issues and generates a task manifest (`issue_tasks.json`).
Then, `fleet-dispatch.ts` kicks in. It reads this manifest, strictly validates that no two tasks claim the same file to prevent merge conflicts, and uses the `@google/jules-sdk` (`jules.all()` method) to spin up multiple independent Jules sessions in parallel. Each session is given a specific prompt and assigned to a different task.
Finally, `fleet-merge.ts` tracks the Pull Requests created by these parallel sessions. It merges them sequentially, waits for CI checks, and if it detects a merge conflict (e.g. if the base branch moved too far), it automatically uses the SDK to re-dispatch a new Jules session to resolve the conflict against the latest main branch.

So while I don't "talk" to other Jules instances directly, we are highly coordinated by this fleet system. One agent plans the work, creates the manifest, and then the script spins up multiple agents like me to execute those plans in parallel.

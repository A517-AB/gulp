# TESTING/ Audit

## What's in there

Four things in `TESTING/`:

```
BlockNoteExperiment.tsx
jules-accurate/
jules-sdk-bundle.d.ts
jules-sdk-rollup.d.ts
```

---

## `BlockNoteExperiment.tsx` — broken scratch file

Unfinished experiment, never ran. Multiple errors:

- `import react, { usestate }` — `usestate` should be `useState`. Default React import not needed in modern JSX.
- `import { eye, eyeoff, keyboard, calender, checkcircle }` — all lowercase, lucide exports are PascalCase (`Eye`, `EyeOff`, `Keyboard`, `CheckCircle`). `calender` is also a typo — should be `Calendar`.
- `const daily_snippit` — missing comma after `day: 1`.
- The enum body (`SUCCESS = 'SUCCESS'` etc.) is floating outside any block — the `{` was never opened.
- File cuts off mid-function (`handleResponse<T>`), never completed.

**Status: abandoned scratch. Either fix or delete.**

---

## `jules-sdk-bundle.d.ts` — failed bundle attempt

Contents:
```ts
export * from "./errors.js";
export {};
```

A `dts-bundle-generator` run that only captured the errors module and nothing else. All the actual types (`JulesClient`, `SessionClient`, `Activity`, etc.) are missing.

**Status: broken artifact, useless as-is.**

---

## `jules-sdk-rollup.d.ts` — correct reference file

A flat re-export of everything in the SDK — all types, `connect`, `jules`, `MemoryStorage`, `MemorySessionStorage`, `NodePlatform`, all activity subtypes, query schema, validation utilities. This is the accurate one.

**Status: good reference, keep it.**

---

## `jules-accurate/` — solid test playground

Three source files and three matching test files, plus a `tsconfig.json`. Well-structured, all tests mock at the right boundary.

### `sdk-playground.ts`

Typed wrappers around the core `@google/jules-sdk`:

| Function | What it does |
|---|---|
| `createSdkClient(apiKey?)` | `connect({ apiKey })`, throws if no key |
| `createSessionConfig(request)` | Maps a flat request object to `SessionConfig` |
| `startSession(request, client?)` | Creates a new session |
| `resumeSession(sessionId, client?)` | Rehydrates existing session by ID |
| `approvePlanIfRequested(session)` | `waitFor('awaitingPlanApproval')` then `approve()` |
| `streamSession(session)` | Drains `session.stream()`, returns activities + last agent message |
| `collectSessionArtifacts(session)` | Runs stream, result, snapshot in parallel — returns everything |
| `runSession(request, client?)` | Full end-to-end: create → stream → collect |

### `fleet-playground.ts`

Wrappers around `@google/jules-fleet`:

| Function | What it does |
|---|---|
| `createFleetClient()` | `createFleetOctokit()` |
| `createSdkDispatcher(client?)` | Builds a `SessionDispatcher` backed by the Jules SDK |
| `analyzeGoals(input, deps?)` | Parses input, runs `AnalyzeHandler` |
| `dispatchFleet(input, deps?)` | Parses input, runs `DispatchHandler` |
| `mergeFleet(input, deps?)` | Parses input, runs `MergeHandler` |

The dispatcher wires `jules.session(config)` for creating and `client.session(id).send()` for messaging — correct bridge between fleet and SDK.

### `merge-playground.ts`

Wrappers around `@google/jules-merge` — full reconciliation pipeline:

| Function | What it does |
|---|---|
| `createMergeClient()` | `createMergeOctokit()` |
| `scanPullRequests(input, octokit?)` | Detect overlapping files across PRs |
| `getFileContents(input, octokit?)` | Fetch file at base / main / pr:N |
| `stageResolution(input)` | Write resolved content for a conflicted file |
| `getMergeStatus(input?)` | Check reconciliation manifest — ready or pending |
| `pushReconciliation(input, octokit?)` | Create multi-parent commit + PR |
| `mergeReconciliation(input, octokit?)` | Merge the reconciliation PR |

All functions validate input with Zod before calling the handler, so bad input throws before anything hits the network.

### Tests

All three test files are complete and well-written:

- **`sdk-playground.test.ts`** — 9 tests, covers all exported functions, mocks `@google/jules-sdk` at the module boundary
- **`fleet-playground.test.ts`** — 7 tests, mocks `@google/jules-fleet` handlers, uses your actual repo (`A517-AB/gulp`) in the input fixtures
- **`merge-playground.test.ts`** — 7 tests, mocks all `@google/jules-merge` handlers, validates invalid input rejection

### `tsconfig.json`

Strict Node/ESM config: `NodeNext` module resolution, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Tighter than the main app tsconfig.

---

## Changes needed

### 1. Install the missing packages

`@google/jules-fleet` and `@google/jules-merge` are imported but not installed. The earlier attempt failed because `package.json` was locked by the dev server. Close it and run:

```bash
npm install @google/jules-fleet @google/jules-mcp @google/jules-merge --legacy-peer-deps
```

(`--legacy-peer-deps` because `@google/jules-mcp` declares `peerDependency: @google/jules-sdk@^0.1.0` but you have `0.2.0`.)

### 2. Fix `jules-sdk-bundle.d.ts` or delete it

Either regenerate with `dts-bundle-generator` pointed at the correct entry, or just delete it — `jules-sdk-rollup.d.ts` already does the job.

### 3. Fix or delete `BlockNoteExperiment.tsx`

It's non-functional scratch. If the BlockNote editor experiment is still wanted, it needs to be rewritten from scratch. If not, delete it.

### 4. Wire `jules-accurate/` tests to the project's test runner

The folder has its own `tsconfig.json` but no `vitest.config`. Either:
- Add a `vitest.config.ts` inside `jules-accurate/` and run tests independently
- Or move the files into `src/renderer/lib/jules/` (where `client.test.ts` already lives) and let the root Vitest config pick them up

The tests are ready to run — they just need to be hooked up.

# Command System

Commands are aliases you configure once and fire with a single trigger character. The trigger determines what happens — not the alias. The alias is just the name you give it.

## Triggers

| Trigger | What it does | Prompt |
|---------|-------------|--------|
| `/` | Pulls the latest markdown from a Jules session | None — fires immediately |
| `@` | Sends a message to a Jules session, no response | Required — typed after the alias |

## How to use

### `/` — Pull markdown

Type `/` in the input. A menu appears with your configured display commands. Select one and it immediately fetches the last agent message from that session and renders it as markdown on the right.

No prompt needed. It's a refresher — it just goes and gets the latest.

### `@` — Send a message

Type `@` in the input. A menu appears with your configured message commands. Select one — it inserts `@alias ` into the editor. Type your message after it, then press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac) to send.

```
@last go fix the auth bug
       ↑ your message
```

The message is sent fire-and-forget. Jules receives it, you move on. No response is waited on.

## Why Ctrl+Enter instead of Enter

BlockNote is a block-based editor. Regular Enter creates a new paragraph — that's its default behavior and we don't want to fight it. Ctrl+Enter is a deliberate submission gesture that BlockNote doesn't intercept, so it's a clean signal that the user is done typing and wants to send.

## Commands are stored in `commands.json`

Each command is a JSON object with a trigger, alias, and a Jules session ID. Adding a new command means adding an entry to the file — the alias is whatever word you want, the session ID is where it points.

```json
{
  "id": "cmd_at_1",
  "trigger": "@",
  "alias": "last",
  "enabled": true,
  "createdAt": 1749513600000,
  "sessionId": "18241105784768399959"
}
```

Toggle `enabled: false` to disable a command without deleting it.

### `>` — Run a script

Type `>` in the input. A menu appears with your configured terminal commands. Select one and it immediately starts a PTY, runs `python "script"` inside it, and switches the right panel to a live xterm terminal showing output.

No prompt needed. Fires on selection.

```json
{
  "id": "cmd_run_1",
  "trigger": ">",
  "alias": "weather",
  "enabled": true,
  "createdAt": 1749513600000,
  "script": "D:/fuse/scripts/weather.py",
  "cwd": "D:/fuse/scripts"
}
```

`script` is the absolute path to the `.py` file. `cwd` is optional — defaults to home directory if omitted.

---

## Adding a new trigger symbol

Every trigger walks the same 7-step pipeline in order. Do not skip steps or reorder them.

### Step 1 — `src/shared/commands/types.ts`

Add the character to `Trigger`. Define a Command interface and a Result interface.

```ts
export type Trigger = '@' | '/' | '#'   // add your char here

export interface HashCommand {
  id:         string
  trigger:    '#'
  alias:      string
  enabled:    boolean
  createdAt:  number
  updatedAt?: number
  // add any fields specific to this trigger
}

export interface HashResult {
  trigger:   '#'
  commandId: string
  alias:     string
  sentAt:    number
  status:    'ok' | 'error'
  error?:    string
}

// add to unions at the bottom of the file
export type Command       = AtCommand | DisplayCommand | HashCommand
export type CommandResult = AtResult  | DisplayResult  | HashResult
```

**Rules:**
- `trigger` field must be a string literal matching the character exactly
- Result must have `status` with at least `'error'` as an option, and `error?: string`
- Add to both `Command` and `CommandResult` unions

### Step 2 — `src/shared/commands/triggers.ts`

Define the executor type contract. The executor receives only what it needs — no `jules` client, no bridge, no globals.
Inject dependencies as arguments.

```ts
import type { HashCommand, HashResult } from './types'

// inject whatever SDK/IPC functions this trigger needs as arguments
export type HashExecutor = (dep: SomeDependencyFn, command: HashCommand) => Promise<HashResult>

export const HASH_META = {
  trigger:     '#' as const,
  label:       'hash',
  description: 'What this trigger does',
}
```

**Rules:**
- Executor receives injected deps first, command second, optional prompt last
- Use exact types for deps (`Jules['session']['send']` not `Function`)
- META object must have `trigger as const`, `label`, `description`

### Step 3 — `src/shared/commands/parse.ts`

Add a parse function and wire it into `parseInput`.

```ts
import type { HashCommand } from './types'

function parseHash(input: string, registry: Command[]): ParseResult {
  const alias = input.slice(1).trim()
  if (!alias) return { ok: false, error: 'Alias required' }

  const command = registry.find((c): c is HashCommand => c.trigger === '#' && c.alias === alias && c.enabled)
  if (!command) return { ok: false, error: `Unknown command: #${alias}` }

  return { ok: true, value: { trigger: '#', command } }
}

// wire into parseInput
export function parseInput(input: string, registry: Command[]): ParseResult {
  const trigger = input.trim()[0]
  if (trigger === '@') return parseAt(input.trim(), registry)
  if (trigger === '/') return parseDisplay(input.trim(), registry)
  if (trigger === '#') return parseHash(input.trim(), registry)   // add here
  return { ok: false, error: 'Unknown trigger' }
}
```

If your trigger needs a prompt (like `@`), copy the `parseAt` pattern. If it fires immediately (like `/`), copy `parseDisplay`.

Also add to `ParsedInput`:

```ts
export interface HashParsed { trigger: '#'; command: HashCommand }
export type ParsedInput = AtParsed | DisplayParsed | HashParsed
```

### Step 4 — `src/shared/commands/execute.ts`

Add a concrete executor that matches the type from Step 2.

```ts
import type { HashResult } from './types'
import type { HashExecutor } from './triggers'

export const executeHash: HashExecutor = async (dep, command) => {
  const sentAt = Date.now()
  try {
    await dep(/* args */)
    return { trigger: '#', commandId: command.id, alias: command.alias, sentAt, status: 'ok' } satisfies HashResult
  } catch (err) {
    return { trigger: '#', commandId: command.id, alias: command.alias, sentAt, status: 'error', error: err instanceof Error ? err.message : String(err) } satisfies HashResult
  }
}
```

**Rules:**
- Always catch and return `status: 'error'` — never let the executor throw
- Use `satisfies HashResult` on each return so TS catches shape mismatches
- Do not import `jules` or `bridge` here — accept deps as arguments

### Step 5 — `src/shared/commands/index.ts`

Export everything new from the barrel.

```ts
export type { HashCommand, HashResult } from './types'
export type { HashExecutor } from './triggers'
export { HASH_META } from './triggers'
export type { HashParsed } from './parse'
export { executeHash } from './execute'
```

### Step 6 — `src/renderer/components/overview/CommandInput.tsx`

Add a `SuggestionMenuController` for the new character.

```tsx
import type { HashCommand } from '@shared/commands'

const getHashItems = useCallback((query: string): Promise<DefaultReactSuggestionItem[]> =>
  Promise.resolve(
    commands
      .filter((c): c is HashCommand => c.trigger === '#' && c.enabled)
      .filter(c => !query || c.alias.toLowerCase().startsWith(query.toLowerCase()))
      .map(c => ({
        title:       c.alias,
        subtext:     'what this does',
        onItemClick: () => {
          // if trigger needs a prompt: insert text so user can type after it
          editor.insertInlineContent([{ type: 'text', text: `#${c.alias} `, styles: {} }])
          // if trigger fires immediately: call onHash(c) directly
        },
      }))
  )
, [commands])
```

Add `<SuggestionMenuController triggerCharacter="#" getItems={getHashItems} />` inside `<BlockNoteView>`.

If the trigger needs a prompt, handle it in the `onKeyDown` listener:

```ts
const parsed = parseInput(text, commands)
if (!isParseOk(parsed)) return

if (parsed.value.trigger === '@') { onSend(parsed.value.command, parsed.value.prompt); clear() }
if (parsed.value.trigger === '#') { onHash(parsed.value.command); clear() }
```

Add the corresponding prop to the `Props` interface.

### Step 7 — `src/renderer/components/overview/OverviewPage.tsx`

Add a handler that calls the executor with injected deps.

```ts
const handleHash = useCallback(async (command: HashCommand) => {
  if (!jules) { setStatus('no connection'); return }
  setStatus('working...')
  const result = await executeHash(jules.someMethod, command)
  if (result.status === 'ok') {
    setStatus(null)
  } else {
    setStatus(result.error ?? 'error')
  }
}, [])
```

Pass it to `CommandInput` as a new prop.

---

## Checklist

Before shipping a new trigger:

- [ ] `Trigger` union updated in `types.ts`
- [ ] Command + Result interfaces defined in `types.ts`
- [ ] Both added to `Command` and `CommandResult` unions
- [ ] Executor type in `triggers.ts`, deps are injected not imported
- [ ] META object in `triggers.ts`
- [ ] Parse function in `parse.ts`, wired into `parseInput`
- [ ] `ParsedInput` union updated
- [ ] Concrete executor in `execute.ts`, uses `satisfies`, never throws
- [ ] All new exports in `index.ts`
- [ ] `SuggestionMenuController` added in `CommandInput.tsx`
- [ ] Handler in `OverviewPage.tsx` using the executor
- [ ] `npx tsc -p tsconfig.app.json --noEmit` passes with no new errors

---

## Implemented triggers

| Trigger | File | Behavior |
|---------|------|----------|
| `@` | `AtCommand` | Fire-forget message to Jules session |
| `/` | `DisplayCommand` | Pull latest markdown from Jules session |
| `>` | `TerminalCommand` | Run a Python script, output live in xterm panel |

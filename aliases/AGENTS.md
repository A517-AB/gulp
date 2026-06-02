# Aliases

Aliases live in `aliases/aliases.json` and are watched live — changes take effect without restart.

## Schema

```ts
{
  id: string          // required, unique — use crypto.randomUUID()
  trigger: string  // any single character — letters, symbols, whatever
  command: string     // required, internal name
  type: 'jules' | 'local' | 'script'    // required
  label?: string      // display name
  sessionId?: string  // for type 'jules' — the Jules session to attach
  instructions?: string  // prompt/instructions passed to the session
  expects?: 'md' | 'zip' // expected output format
  action?: string     // for type 'local' — maps to a localJules method
  script?: string     // for type 'script' — path to script file from repo root
}
```

## Types

- `jules` — attached to a Jules session. Needs `sessionId`. Use `expects: 'md'` if the session returns markdown.
- `local` — calls a local IPC function. Use `action` to specify which one.
- `script` — runs a script via `script` path. Use for CLI tools like monitor.

## Triggers (all taken/available)

| Trigger | Command | Type |
|---------|---------|------|
| `?` | notes | jules |
| `/` | testing | jules |
| `@` | sessions | local |
| `m` | monitor | script |
| `#` | — | available |

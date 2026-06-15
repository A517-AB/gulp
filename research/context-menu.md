# Context Menu — Resolved

> Updated: 2026-06-15

## What was actually wrong

`asChild` on `ContextMenu.Trigger` requires the child to forward its ref (Radix uses `Slot` internally).
Custom components that don't `forwardRef` silently swallow the trigger — no error, no right-click.

Nothing to do with transparent windows, z-index, or `preventDefault`. That was all wrong.

## Fix

```tsx
<ContextMenu.Trigger className="contents">
  {children}
</ContextMenu.Trigger>
```

Drop `asChild`, add `className="contents"`. The wrapper span becomes invisible to layout,
right-click binds correctly regardless of what children are.

## Applied to

- `SessionContextMenu.tsx` — fixed
- `FileTree.tsx` — needs same fix

# Context Menu in Electron — Research

> Researched: 2026-06-13
> Sources: electronjs.org/docs/latest/tutorial/context-menu, radix-ui/primitives GitHub issues

## Why Radix ContextMenu fails in this app

Two likely causes:

1. **`transparent: true` on BrowserWindow** — Radix uses a Portal that appends to `document.body`. 
   With transparent Electron windows, the OS compositor can clip or misorder the portal layer. 
   Known issue in radix-ui/primitives #3049 (unfocused window hover breaks context menu).

2. **`main.tsx` global listener** — `window.addEventListener('contextmenu', e => e.preventDefault(), true)` 
   runs capture-phase before Radix. `preventDefault()` alone shouldn't kill Radix's JS handler, 
   but combined with transparent window compositing it may.

## Two real options

### Option A: Fix Radix (web-style, custom-styled)
- Ensure Radix portal has `z-index` above everything (currently `z-50` in context-menu.tsx — may need higher)
- Try `container` prop on ContextMenuPortal to render into a specific DOM node instead of body
- Pro: fully custom styled, matches app design
- Con: fragile in Electron transparent windows, may need ongoing fixes

### Option B: Native IPC (OS-styled, reliable)
Pattern: renderer sends action list + position via IPC → main builds `Menu.buildFromTemplate()` → `.popup()`

```ts
// preload: expose
contextMenu: (items, x, y) => ipcRenderer.invoke('context-menu.show', items, x, y)

// main: handle
ipcMain.handle('context-menu.show', (e, items, x, y) => {
  const menu = Menu.buildFromTemplate(items)
  menu.popup({ window: BrowserWindow.fromWebContents(e.sender), x, y })
})

// renderer: on right-click
window.electron.contextMenu(menuItems, e.clientX, e.clientY)
```

Pro: Always works in Electron, no z-index/compositing issues
Con: OS-styled (Windows native look), no custom design

### Option C: Hybrid
- `isElectron` → native IPC menu
- Web mode → Radix

## Recommendation

Try Option A fix first (raise z-index, change portal container). If still broken → Option B native.
The app already calls `isElectron` throughout so hybrid is trivial to add later.

## Status: unconfirmed — needs testing before implementing

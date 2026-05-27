# Stack Gaps

Living note for the stuff this repo can already do with installed packages, but the current codebase is barely using or not using at all.

Last updated: 2026-05-27

How to read this:
- "Missing" means absent or very light in a targeted repo scan.
- This is not a package inventory.
- The point is to surface moves you will not reach for if you do not know they exist.

## Learn These First

1. React `startTransition`, `useDeferredValue`, `useOptimistic`
2. React Router URL state, `useNavigation`, `useFetcher`, loaders/actions
3. Motion `layout` and `layoutId`
4. Electron session partitions, deep links, utility processes, native polish APIs
5. Vite `import.meta.glob`
6. Tailwind `has-*`, `supports-*`, `aria-*`, container-query-driven layouts

## React

Docs: https://react.dev/reference/react

### `startTransition` / `useTransition`

What it is:
- Lets React treat an update as non-urgent so the input or click stays responsive while heavier UI work catches up.

When it is handy:
- Search boxes that filter big lists.
- Switching tabs or panels that cause heavy markdown, diff, or code rendering.
- Anything where the update is correct but does not need to block the user's next keystroke.

Mental trigger:
- "Typing feels sticky, but the expensive update can land a beat later."

Good fits in an app like this:
- Session search.
- Activity filtering.
- Large diff or output panes.

### `useDeferredValue`

What it is:
- Lets one value update immediately and another lag behind on purpose.

When it is handy:
- Text input that drives expensive filtering or rendering.
- Search-as-you-type over lists, logs, markdown, or code results.

Mental trigger:
- "The text box should update now. The expensive derived view can update second."

### `useOptimistic`

What it is:
- Temporary UI state that shows the result before the server confirms it.

When it is handy:
- Sending chat messages.
- Approving plans.
- Adding or deleting queued items.
- Toggling archive, favorite, follow, like, done, etc.

Why it matters:
- If you always wait for the round-trip, the app feels slower than it is.

Mental trigger:
- "The user already committed. Show it now unless the server rejects it."

### `useActionState`

What it is:
- A cleaner way to run async form actions and carry pending or returned state without hand-rolling booleans everywhere.

When it is handy:
- Settings forms.
- Create session dialogs.
- Any submit flow with validation or returned messages.

Mental trigger:
- "This form has submit state, errors, success text, and I am about to build that all manually."

### `useEffectEvent`

What it is:
- Lets an effect keep a stable subscription while still seeing fresh values from props or state.

When it is handy:
- Polling.
- WebSocket listeners.
- Global events.
- Timers.

Why it matters:
- It cuts down on stale closure bugs and "effect dependency soup".

Mental trigger:
- "This effect should stay mounted, but the callback inside it needs current state."

### `Suspense` + `lazy`

What it is:
- Code-split heavy components and routes so they only load when needed.

When it is handy:
- Monaco editors.
- Diff viewers.
- Big analytics pages.
- Secondary Electron-only pages.

Mental trigger:
- "This screen is heavy, but most users do not need it on first paint."

## React Router 7

Docs: https://reactrouter.com/home

### URL search params as real UI state

What it is:
- Put view state in the URL instead of hiding it in React state.

When it is handy:
- Filters.
- Sort order.
- Selected tabs.
- Layout mode.
- Open sidebars or focused panes.

Why it matters:
- Refresh-safe.
- Linkable.
- Back-button-friendly.
- Less state syncing garbage.

Mental trigger:
- "If I refresh, share the link, or hit back, should this state survive?"

### `useNavigation`

What it is:
- Router-owned pending state for navigations and submissions.

When it is handy:
- Disabling buttons during route transitions.
- Showing route-level busy indicators.
- Avoiding custom `isLoading` flags for simple route submits.

Mental trigger:
- "I am building a spinner for navigation with manual state."

### `useFetcher`

What it is:
- Submit or load data through the router without navigating away.

When it is handy:
- Inline mutations.
- Toggle buttons.
- Row-level actions.
- Dialog forms.

Why it matters:
- Gives you pending, formData, and result state without inventing another fetch abstraction for little actions.

Mental trigger:
- "This action should talk to the server but stay on the same screen."

### Loaders, actions, and `<Form>`

What it is:
- Router-managed data loading and submissions instead of pushing every request through ad hoc hooks and local state.

When it is handy:
- Pages whose data belongs to the route.
- Forms that should progressively enhance.
- Server-validated submits.

Why it matters:
- The router can own revalidation, pending state, and action results.

Mental trigger:
- "This page fetches on mount, stores loading state, then re-fetches after submit."

### Route-level lazy modules

What it is:
- Split route code at the router boundary instead of only inside components.

When it is handy:
- Electron-only screens.
- Rare admin or settings screens.
- Heavy views with charts or editors.

Mental trigger:
- "This route is expensive and not part of the hot path."

## Vite

Docs: https://vite.dev/guide/

### `import.meta.glob`

What it is:
- Build-time file discovery.

When it is handy:
- Auto-registering snippets.
- Preset libraries.
- Template directories.
- Icon packs.
- Demo pages.
- Content registries.

Why it matters:
- Kills manual import lists.
- Great when the feature is "everything in this folder is a thing".

Mental trigger:
- "I keep editing an index file every time I add one more file to a folder."

### `?raw` and `?url` imports

What it is:
- Import file contents as strings or asset URLs directly.

When it is handy:
- Markdown templates.
- Prompt snippets.
- Embedded shell scripts.
- SVG source.
- Downloadable assets.

Mental trigger:
- "This file is content, not code, and I still want it in the build graph."

### Mode-aware config with `loadEnv`

What it is:
- Use environment-specific values inside Vite config, not just inside the app.

When it is handy:
- Different ports.
- Plugin toggles.
- Build flags.
- Proxy targets.

Mental trigger:
- "The config itself needs env, not just the app code."

### Dynamic import and route chunking

What it is:
- Push rare screens or heavyweight widgets into separate chunks.

When it is handy:
- Monaco.
- Charts.
- Large diff tools.
- Optional Electron features.

Why it matters:
- Faster initial load.
- Vite also handles CSS splitting with it.

Mental trigger:
- "This feature is heavy and not part of the first 5 seconds of usage."

### Workers outside editor tooling

What it is:
- Move CPU-ish work off the main thread with Vite worker support.

When it is handy:
- Diff preprocessing.
- Large JSON transforms.
- Parsing archives.
- Search indexing.
- Syntax-ish preprocessing.

Mental trigger:
- "This freezes the UI, but it is not actually UI work."

## Electron

Docs: https://www.electronjs.org/docs/latest/tutorial/process-model

### Session partitions

What it is:
- Separate browser storage and cookies by using `session` or `partition` per window or flow.

When it is handy:
- Multiple account contexts.
- Isolated auth windows.
- Temporary browser sessions.
- Sandboxed embedded web content.

Mental trigger:
- "This flow should not share cookies or browser state with the rest of the app."

### Deep links and custom protocols

What it is:
- Register the app to handle custom URLs like `myapp://...`.

When it is handy:
- Open a specific session from elsewhere.
- OAuth return flows.
- Launching directly into queued work.

Mental trigger:
- "I want the desktop app to be a real endpoint, not just a window I open manually."

### OS-level notifications and taskbar or dock status

What it is:
- Native notifications plus progress or status on the app icon/window.

When it is handy:
- Long-running session work.
- Queue completion.
- Failed jobs.
- Waiting for approval.

Mental trigger:
- "The user should know something finished without staring at the app."

Useful APIs to remember:
- `Notification`
- `win.setProgressBar()`
- `win.setOverlayIcon()` on Windows

### `shell.openExternal()` and `shell.openPath()`

What it is:
- Hand off URLs or files to the OS instead of recreating browser or file-manager behavior yourself.

When it is handy:
- Open repo URLs.
- Reveal artifacts.
- Open generated files.
- Jump to docs.

Mental trigger:
- "The operating system already knows how to open this better than I do."

### `utilityProcess`

What it is:
- Electron's dedicated process type for isolated or crash-prone background work.

When it is handy:
- CPU-heavy transforms.
- Untrusted tooling wrappers.
- Long-running helpers you do not want in main.

Why it matters:
- Better isolation than stuffing everything into the main process.

Mental trigger:
- "This should not be able to freeze or take down the Electron main process."

### Window polish APIs

What it is:
- The native-feeling stuff people forget exists.

Good ones to remember:
- `ready-to-show` and `backgroundColor` to avoid ugly first paint.
- `setTitleBarOverlay()` for better custom titlebars.
- `setBackgroundMaterial()` for Windows 11 mica or acrylic.
- `setContentProtection()` for sensitive content.

Mental trigger:
- "This works, but it still feels like a wrapped website instead of a desktop app."

## Motion

Docs: https://motion.dev/docs/react

### `layout`

What it is:
- Automatic animation when size or position changes after a React render.

When it is handy:
- Accordions.
- Resizable panels.
- Reordered lists.
- Expanding cards.
- Sidebar open or collapse.

Mental trigger:
- "The layout jumps, and I want that movement to feel intentional."

### `layoutId`

What it is:
- Shared element transitions between different components or states.

When it is handy:
- Moving selection underlines.
- Card-to-modal transitions.
- Thumbnail-to-detail views.
- Route transitions where one element becomes another.

Mental trigger:
- "These two elements are conceptually the same thing in two different states."

### `LayoutGroup`

What it is:
- Coordinates layout animations across related components.

When it is handy:
- Multiple accordions.
- Compound panels.
- Lists where one item expanding shifts the others.

Mental trigger:
- "One component changes layout, but the neighbors also need to animate correctly."

### Scroll-linked animation: `useScroll` and `useTransform`

What it is:
- Drive motion directly from scroll position.

When it is handy:
- Reading progress bars.
- Sticky header compression.
- Parallax.
- Timeline progress.

Mental trigger:
- "This animation should map to scroll, not just trigger once on scroll."

### Reveal-on-scroll: `whileInView` and `useInView`

What it is:
- Enter animation when an element reaches the viewport.

When it is handy:
- Marketing or overview pages.
- Analytics cards.
- Staggered section reveals.

Mental trigger:
- "This should wake up when it comes into view, not before."

### Drag and reorder

What it is:
- Built-in gesture primitives for dragging and sortable interfaces.

When it is handy:
- Queue ordering.
- Preset or snippet ordering.
- Kanban-like movement.

Mental trigger:
- "This interaction is spatial, not just click-to-move."

Useful names to remember:
- `drag`
- `useDragControls`
- `Reorder`

### `LazyMotion` and `useReducedMotion`

What it is:
- Smaller bundle entry for animation features and better accessibility behavior.

When it is handy:
- Animation-heavy pages.
- Respecting reduced-motion users.

Mental trigger:
- "I want richer motion without paying the full cost everywhere."

### `AnimatePresence` modes

What it is:
- Better sequencing and layout behavior for enter/exit animations.

Useful modes:
- `wait` for one-at-a-time transitions.
- `popLayout` when surrounding layout should reflow immediately.

Mental trigger:
- "The exit animation works, but the entering item collides with it or the layout feels wrong."

## Tailwind 4

Docs: https://tailwindcss.com/docs

### `has-*`

What it is:
- Style a parent based on what it contains.

When it is handy:
- Cards that change when they contain actions.
- Inputs that style differently when a child error message exists.
- Shell pieces that react to nested state.

Mental trigger:
- "I want the parent to react to the child without extra JS state."

### `supports-*`

What it is:
- Only apply styles if the browser supports a feature.

When it is handy:
- Progressive enhancement for blur, advanced layout, or newer CSS features.

Mental trigger:
- "This style is nice-to-have and should only exist where the platform can really do it."

### `aria-*` variants

What it is:
- Style based on ARIA state without extra class toggling.

When it is handy:
- Toggle buttons.
- Disclosure UI.
- Selected nav items.
- Accessible custom controls.

Mental trigger:
- "This thing already has semantic state. I should style from that instead of duplicating it in JS."

### Container queries as a layout system

What it is:
- Components respond to the size of their container, not only the viewport.

When it is handy:
- Sidebars.
- Resizable panes.
- Cards reused in different widths.
- Embedded widgets.

Mental trigger:
- "This component breaks when dropped into a narrower parent even though the screen is wide."

### CSS variable-driven utilities

What it is:
- Treat CSS variables like component inputs and let Tailwind utilities consume them.

When it is handy:
- Resizable panels.
- Theme tokens.
- Dynamic spacing or sizes.
- User-configurable UI dimensions.

Mental trigger:
- "The value changes at runtime, but I still want utility-class ergonomics."

### `@source`

What it is:
- Tell Tailwind where to scan for classes when your content is not in the usual places.

When it is handy:
- External templates.
- Generated content.
- Shared package folders.

Mental trigger:
- "The class exists, but Tailwind did not generate it because the scanner never saw the file."

## Next Packages Worth Mining Later

These are not the first pass, but they are high-value follow-ups already in your stack.

- TanStack Query: cache invalidation, optimistic mutations, background refetch, query cancellation.
- Zustand: slice architecture, persisted state, selectors, derived state.
- Zod: runtime validation for forms, IPC, filesystem, and API payloads.
- DnD Kit: sensors, sortable lists, collision strategies, keyboard drag.
- Monaco: diff editor, custom themes, custom languages, decorations, inline tooling.
- xterm: fit, search, web links, session persistence, terminal UX polish.
- Radix: accessible primitives, focus management, collision-aware overlays.
- Hono and OpenAPI tooling: typed endpoints, validation-first handlers, client generation.

## Expansion Template

When you add to this file later, use this shape so the note stays useful.

### Capability name

What it is:
- One blunt sentence.

When it is handy:
- Concrete trigger.
- Concrete trigger.

Mental trigger:
- The sentence that should make you remember it exists.

Good fit here:
- Specific place in this app.
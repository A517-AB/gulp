# Opportunities — React Router 7 + React 19

> Research session 2026-06-15.

---

## React Router 7

### Loaders
Async function on a route that runs before the component renders. Data is available instantly on first paint — no `useEffect` fetch patterns.

```ts
{
  path: '/items',
  loader: async () => {
    return await db.getItems()
  },
  Component: ItemsPage,
}
// in component:
const data = useLoaderData()
```

### Actions
Handles mutations (form submits, deletes, etc). Auto-revalidates the loader after it runs.

```ts
{
  path: '/items',
  loader: async () => db.getItems(),
  action: async ({ request }) => {
    const data = await request.formData()
    await db.addItem(data.get('title'))
    return { ok: true }
  },
  Component: ItemsPage,
}
```

### `shouldRevalidate`
Controls when a loader re-runs. Skip unnecessary refetches (e.g. back navigation, same params).

```ts
{
  path: '/items',
  shouldRevalidate: ({ currentUrl, nextUrl }) => currentUrl.pathname !== nextUrl.pathname,
  loader: ...,
}
```

### Per-route `errorElement`
Each route can render its own error UI instead of bubbling to the root boundary.

```ts
{ path: '/items', errorElement: <ItemsError />, Component: ItemsPage }
```

### `id` + `useRouteLoaderData`
Name a route with an `id`, read its loader data from anywhere in the tree without prop drilling.

```ts
{ id: 'user', path: '/app', loader: () => getUser(), Component: AppLayout }

// anywhere in the subtree:
const user = useRouteLoaderData('user')
```

### `lazy` (route-level)
Code-split a route. The module's default export becomes the Component automatically.

```ts
{ path: '/heavy', lazy: () => import('./HeavyPage') }
```

### `patchRoutesOnNavigation`
Dynamically add child routes at runtime — useful when route structure comes from config or user data.

### `handle` + `useMatches`
Attach arbitrary metadata to a route, read it anywhere (breadcrumbs, permissions, titles).

```ts
{ path: '/items', handle: { title: 'Items', breadcrumb: 'Items' }, Component: ItemsPage }

// anywhere:
const matches = useMatches()
const titles = matches.map(m => m.handle?.title)
```

---

## React 19

### `ref` as a prop
No more `forwardRef`. Function components accept `ref` directly.

```tsx
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />
}
```

### `use(promise)`
Read a promise inside render. Suspends until resolved. Works with Suspense boundaries.

```tsx
const data = use(fetchItems()) // component suspends until done
```

### `useActionState`
Manages state for an async action. Returns `[state, dispatchFn, isPending]`.

```tsx
const [error, submitAction, isPending] = useActionState(
  async (prev, formData) => {
    const err = await save(formData.get('name'))
    return err ?? null
  },
  null
)
```

### `useOptimistic`
Show a value optimistically before async confirms. Reverts automatically on failure.

```tsx
const [optimisticName, setOptimistic] = useOptimistic(serverName)
// set immediately on user action, reverts if save fails
```

### `useFormStatus`
Inside any component nested in a `<form>`, gives `{ pending }` without prop drilling.

```tsx
function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>Save</button>
}
```

### Context as JSX (no `.Provider`)
```tsx
// before
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
// after
<ThemeContext value={theme}>{children}</ThemeContext>
```

### React Compiler
Auto-memoizes components and values. Replaces most manual `useMemo` / `useCallback`. Already active in this project via `reactCompilerPreset`.

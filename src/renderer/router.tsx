import { useDeferredValue, useMemo, useState } from 'react'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom'
import {
  Form,
  NavLink,
  Outlet,
  createHashRouter,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
  useRouteLoaderData,
} from 'react-router-dom'
import type { WorkspacePreferences } from '../shared/bridge'
import { cacheStrategies, releaseChannels, topbarDensities } from '../shared/bridge'
import {
  loadDiagnosticsPageData,
  loadOverviewPageData,
  loadShellSnapshot,
  loadWorkspacePageData,
  saveWorkspacePreferences,
} from './desktop'

const rootRouteId = 'root'

interface WorkspaceActionData {
  savedAt: string
  preferences: WorkspacePreferences
}

async function rootLoader() {
  return loadShellSnapshot()
}

async function overviewLoader() {
  return loadOverviewPageData()
}

async function workspaceLoader() {
  return loadWorkspacePageData()
}

async function diagnosticsLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)

  return loadDiagnosticsPageData(url.searchParams.get('refresh') === '1')
}

function readEnumValue<T extends readonly string[]>(
  formData: FormData,
  key: string,
  options: T,
): T[number] {
  const value = formData.get(key)

  if (typeof value !== 'string' || !options.includes(value)) {
    throw new Response(`Invalid value for ${key}`, {
      status: 400,
      statusText: 'Invalid form payload',
    })
  }

  return value
}

function parseWorkspacePreferences(formData: FormData): WorkspacePreferences {
  const workspaceLabelValue = formData.get('workspaceLabel')

  if (typeof workspaceLabelValue !== 'string') {
    throw new Response('Workspace label is required', {
      status: 400,
      statusText: 'Invalid workspace label',
    })
  }

  const workspaceLabel = workspaceLabelValue.trim()

  if (workspaceLabel.length < 3 || workspaceLabel.length > 48) {
    throw new Response('Workspace label must be between 3 and 48 characters.', {
      status: 400,
      statusText: 'Invalid workspace label',
    })
  }

  return {
    workspaceLabel,
    releaseChannel: readEnumValue(formData, 'releaseChannel', releaseChannels),
    cacheStrategy: readEnumValue(formData, 'cacheStrategy', cacheStrategies),
    topbarDensity: readEnumValue(formData, 'topbarDensity', topbarDensities),
    crashGuard: formData.get('crashGuard') === 'on',
  }
}

async function workspaceAction({ request }: ActionFunctionArgs): Promise<WorkspaceActionData> {
  const formData = await request.formData()
  const preferences = parseWorkspacePreferences(formData)
  const saved = await saveWorkspacePreferences(preferences)

  return {
    savedAt: new Date().toISOString(),
    preferences: saved,
  }
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${String(bytes)} B`
  }

  const kilobytes = bytes / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function navigationClassName(isActive: boolean) {
  return isActive
    ? 'rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm'
    : 'rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white/70 hover:text-stone-950'
}

function RootLayout() {
  const snapshot = useRouteLoaderData<typeof rootLoader>(rootRouteId)
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'

  if (!snapshot) {
    throw new Error('Root route data was not available for the shell layout')
  }

  return (
    <main className="min-h-screen px-4 py-5 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[28px] border border-stone-950/10 bg-white/80 px-5 py-4 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                <span>{snapshot.appName}</span>
                <span className="text-stone-400">/</span>
                <span>{snapshot.platform}</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.08em] text-stone-950 sm:text-4xl">
                  {snapshot.preferences.workspaceLabel}
                </h1>
                <span className="rounded-full border border-stone-950/10 bg-stone-950/5 px-3 py-1 text-xs font-medium text-stone-700">
                  v{snapshot.appVersion}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 sm:justify-end">
              <span className="rounded-full border border-stone-950/10 bg-white px-3 py-1.5 font-medium">
                {snapshot.preferences.releaseChannel} channel
              </span>
              <span className="rounded-full border border-stone-950/10 bg-white px-3 py-1.5 font-medium">
                {snapshot.preferences.cacheStrategy} cache
              </span>
              <span className="rounded-full border border-stone-950/10 bg-white px-3 py-1.5 font-medium">
                {isNavigating ? 'syncing route data' : 'route data ready'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-stone-950/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-2">
              <NavLink end to="/" className={({ isActive }) => navigationClassName(isActive)}>
                Overview
              </NavLink>
              <NavLink to="/workspace" className={({ isActive }) => navigationClassName(isActive)}>
                Workspace
              </NavLink>
              <NavLink to="/diagnostics" className={({ isActive }) => navigationClassName(isActive)}>
                Diagnostics
              </NavLink>
            </nav>

            <p className="text-sm text-stone-600">
              Top bar only, hash-router based, and protected by both route and runtime boundaries.
            </p>
          </div>
        </header>

        <Outlet />
      </div>
    </main>
  )
}

function OverviewPage() {
  const data = useLoaderData<typeof overviewLoader>()

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <section className="grid gap-6">
        <div className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
              Overview
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              Fast boot, nested routes, and zero lazy indirection.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-700">
              The router loads synchronously, the shell stays inside one top-bar layout, and the route
              data is cached just long enough to stop pointless churn while you are editing aggressively.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.cards.map((card) => (
              <article key={card.label} className="rounded-3xl border border-stone-950/10 bg-stone-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                  {card.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{card.hint}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
                Recent source surface
              </p>
              <p className="mt-2 text-sm text-stone-600">
                Last scanned at {formatDateTime(data.lastScanAt)} from {data.projectRoot}
              </p>
            </div>
            <span className="rounded-full border border-stone-950/10 bg-stone-950/5 px-3 py-1 text-xs font-medium text-stone-700">
              {data.folders.length} tracked folders
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {data.recentFiles.map((file) => (
              <article
                key={file.path}
                className="flex flex-col gap-2 rounded-3xl border border-stone-950/10 bg-stone-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-950">{file.name}</p>
                  <p className="text-sm text-stone-600">{file.path}</p>
                </div>
                <div className="text-sm text-stone-600 sm:text-right">
                  <p>{formatBytes(file.bytes)}</p>
                  <p>{formatDateTime(file.updatedAt)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="grid gap-6">
        <section className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
            Route stance
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-stone-700">
            <p>Hash data router with child routes keeps the shell stable in Electron without server coordination.</p>
            <p>No lazy route boundaries means every screen is immediately resident and predictable while you build.</p>
            <p>Short-lived caches live in the loader layer instead of sprinkling memoization through every page.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-950/10 bg-stone-950 p-6 text-stone-100 shadow-[0_24px_60px_rgba(41,30,16,0.2)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
            Guard rails
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-stone-200">
            <li>Route error boundaries catch loader, action, and render failures inside each branch.</li>
            <li>The outer runtime boundary keeps the shell visible if a component crashes outside route handling.</li>
            <li>Preferences can be saved through the bridge, but the browser fallback keeps the router alive during pure web work.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function WorkspacePage() {
  const data = useLoaderData<typeof workspaceLoader>()
  const actionData = useActionData<typeof workspaceAction>()
  const navigation = useNavigation()
  const isSaving = navigation.state === 'submitting'

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
            Workspace controls
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.06em] text-stone-950">
            Save the shell defaults that keep your route work predictable.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-stone-700">
            This uses a route action rather than a loose local handler, so malformed payloads fail inside the
            data router instead of detonating random UI branches later.
          </p>
        </div>

        <Form method="post" className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-800">Workspace label</span>
            <input
              name="workspaceLabel"
              defaultValue={data.preferences.workspaceLabel}
              className="rounded-2xl border border-stone-950/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-orange-600 focus:bg-white"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-800">Release channel</span>
              <select
                name="releaseChannel"
                defaultValue={data.preferences.releaseChannel}
                className="rounded-2xl border border-stone-950/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-orange-600 focus:bg-white"
              >
                {releaseChannels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-800">Cache strategy</span>
              <select
                name="cacheStrategy"
                defaultValue={data.preferences.cacheStrategy}
                className="rounded-2xl border border-stone-950/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-orange-600 focus:bg-white"
              >
                {cacheStrategies.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-800">Topbar density</span>
              <select
                name="topbarDensity"
                defaultValue={data.preferences.topbarDensity}
                className="rounded-2xl border border-stone-950/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-orange-600 focus:bg-white"
              >
                {topbarDensities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-3xl border border-stone-950/10 bg-stone-50/80 p-4">
            <input
              type="checkbox"
              name="crashGuard"
              defaultChecked={data.preferences.crashGuard}
              className="mt-1 size-4 rounded border-stone-400 text-stone-950 focus:ring-orange-600"
            />
            <span className="grid gap-1">
              <span className="text-sm font-medium text-stone-900">Keep the outer crash guard on</span>
              <span className="text-sm leading-6 text-stone-600">
                Leave this enabled while routes, loaders, and the Electron bridge are still changing often.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={isSaving}
            >
              {isSaving ? 'Saving shell defaults...' : 'Save shell defaults'}
            </button>
            {actionData ? (
              <p className="text-sm text-stone-600">
                Saved {actionData.preferences.workspaceLabel} at {formatDateTime(actionData.savedAt)}
              </p>
            ) : null}
          </div>
        </Form>
      </section>

      <aside className="grid gap-6">
        <section className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
            Active surface
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-stone-700">
            <p>{data.projectRoot}</p>
            <div className="flex flex-wrap gap-2">
              {data.folders.map((folder) => (
                <span
                  key={folder}
                  className="rounded-full border border-stone-950/10 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {folder}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
            Source files in play
          </p>
          <div className="mt-4 grid gap-3">
            {data.files.map((file) => (
              <article key={file.path} className="rounded-3xl border border-stone-950/10 bg-stone-50/80 p-4">
                <p className="font-medium text-stone-950">{file.path}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {formatBytes(file.bytes)} · {formatDateTime(file.updatedAt)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-950/10 bg-stone-950 p-6 text-stone-100 shadow-[0_24px_60px_rgba(41,30,16,0.2)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
            Package scripts
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.scripts.map((script) => (
              <span key={script} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-stone-100">
                {script}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

function DiagnosticsPage() {
  const data = useLoaderData<typeof diagnosticsLoader>()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return data.items
    }

    return data.items.filter((item) => {
      const haystack = `${item.title} ${item.detail} ${item.hint}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [data.items, deferredQuery])

  const counts = useMemo(() => {
    return filteredItems.reduce(
      (summary, item) => {
        summary[item.level] += 1
        return summary
      },
      { stable: 0, warning: 0, blocking: 0 },
    )
  }, [filteredItems])

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
              Diagnostics
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.06em] text-stone-950">
              Keep the shell honest while the route map expands.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-700">
              Diagnostics stay close to the bridge contract, route surface, and crash guard status. Search is
              deferred so filtering stays cheap without turning the page tree into a memoization shrine.
            </p>
          </div>

          <Form method="get">
            <button
              type="submit"
              name="refresh"
              value="1"
              className="inline-flex items-center rounded-full border border-stone-950/10 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-950/20 hover:bg-stone-50"
            >
              Refresh snapshot
            </button>
          </Form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-stone-950/10 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Inspected</p>
            <p className="mt-3 text-lg font-semibold text-stone-950">{formatDateTime(data.inspectedAt)}</p>
          </article>
          <article className="rounded-3xl border border-stone-950/10 bg-emerald-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Stable</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-emerald-950">{counts.stable}</p>
          </article>
          <article className="rounded-3xl border border-stone-950/10 bg-amber-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Warning</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-amber-950">{counts.warning}</p>
          </article>
          <article className="rounded-3xl border border-stone-950/10 bg-rose-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Blocking</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-rose-950">{counts.blocking}</p>
          </article>
        </div>

        <div className="mt-6">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-800">Filter issues or notes</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              placeholder="Search diagnostics, hints, or routes"
              className="rounded-2xl border border-stone-950/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-orange-600 focus:bg-white"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="rounded-[28px] border border-stone-950/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={
                      item.level === 'stable'
                        ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800'
                        : item.level === 'warning'
                          ? 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800'
                          : 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800'
                    }
                  >
                    {item.level}
                  </span>
                  <h3 className="text-xl font-semibold tracking-[-0.04em] text-stone-950">{item.title}</h3>
                </div>
                <p className="text-sm leading-7 text-stone-700">{item.detail}</p>
              </div>

              <p className="text-sm text-stone-500">{formatDateTime(item.updatedAt)}</p>
            </div>

            <div className="mt-4 rounded-3xl border border-stone-950/10 bg-stone-50/80 p-4 text-sm leading-7 text-stone-700">
              {item.hint}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function RouteErrorBoundary() {
  const error = useRouteError()

  let title = 'Unexpected route failure'
  let detail = 'A route loader, action, or render branch failed before it could finish.'

  if (isRouteErrorResponse(error)) {
    title = `${String(error.status)} ${error.statusText}`
    detail = typeof error.data === 'string' ? error.data : detail
  } else if (error instanceof Error) {
    detail = error.message
  }

  return (
    <section className="rounded-[28px] border border-red-950/10 bg-red-50/90 p-6 text-red-950 shadow-[0_24px_60px_rgba(116,30,30,0.12)]">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Route boundary</p>
        <h2 className="text-3xl font-semibold tracking-[-0.06em]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-red-900/80">{detail}</p>
        <p className="max-w-3xl text-sm leading-7 text-red-900/80">
          Keep this boundary while the route tree is still accumulating loaders, actions, and bridge calls.
          Once those contracts stop changing constantly, you can decide whether the fallback should become more
          minimal instead of disappearing entirely.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="#/"
          className="inline-flex items-center rounded-full bg-red-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-900"
        >
          Return to overview
        </a>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-red-950/10 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
          onClick={() => {
            window.location.reload()
          }}
        >
          Reload app
        </button>
      </div>
    </section>
  )
}

export const router = createHashRouter([
  {
    id: rootRouteId,
    path: '/',
    loader: rootLoader,
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        loader: overviewLoader,
        element: <OverviewPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'workspace',
        loader: workspaceLoader,
        action: workspaceAction,
        element: <WorkspacePage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'diagnostics',
        loader: diagnosticsLoader,
        element: <DiagnosticsPage />,
        errorElement: <RouteErrorBoundary />,
      },
    ],
  },
])
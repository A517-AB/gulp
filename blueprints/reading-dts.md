# Reading `.d.ts` Files

A `.d.ts` file is a TypeScript declaration file — it's the types stripped out of a compiled package. No implementation, no runtime code. Pure shapes.

When you install a package that ships types, everything lives in its `dist/` folder. The entry is always `dist/index.d.ts`. That's where you start.

---

## The `declare` keyword

In a `.d.ts`, everything is prefixed with `declare`. It just means "this thing exists at runtime, I'm only describing its shape here."

```ts
// In a .d.ts
export declare function connect(options?: JulesOptions): JulesClient
export declare const jules: JulesClient
```

Read it the same as if `declare` wasn't there:

- `connect` is a function you can call
- `jules` is a pre-built object you can use immediately

---

## `export` vs `export type`

This is the most important distinction:

```ts
export { MemoryStorage, MemorySessionStorage }   // real values — import and use them
export type { SessionClient, JulesOptions }       // types only — use for annotations, not runtime
export * from './errors.js'                       // re-exports everything from that file
```

**`export type`** is erased at compile time. You can use it to annotate a variable but you cannot call it, instantiate it, or check `instanceof` against it.

**`export {}`** is a real value. You can `new` it, call it, pass it around.

---

## Reading an `interface`

An interface is a named object shape. Every property is either required or optional (`?`):

```ts
interface SessionConfig {
    prompt: string          // required — must provide this
    source?: SourceInput    // optional — can skip
    title?: string          // optional
    requireApproval?: boolean
    autoPr?: boolean
}
```

When you see `?`, it means the property can be absent or `undefined`. When you see no `?`, TypeScript will error if you forget it.

---

## Reading a `type` alias

`type` is used for things that aren't just plain object shapes — unions, intersections, primitives:

```ts
type SessionState =
  | 'unspecified'
  | 'queued'
  | 'planning'
  | 'awaitingPlanApproval'
  | 'awaitingUserFeedback'
  | 'inProgress'
  | 'paused'
  | 'failed'
  | 'completed'
```

This is a string union. The variable can only ever be one of those exact strings. TypeScript will catch typos.

---

## Discriminated unions

When you see a `type` that's a union of objects, each object has a `type` (or similar) property that uniquely identifies it. This is a **discriminated union**.

```ts
type Activity =
  | ActivityAgentMessaged
  | ActivityUserMessaged
  | ActivityPlanGenerated
  | ActivityPlanApproved
  | ActivityProgressUpdated
  | ActivitySessionCompleted
  | ActivitySessionFailed
```

Each of those is an interface with a unique `type` field:

```ts
interface ActivityAgentMessaged extends BaseActivity {
    type: 'agentMessaged'
    message: string
}

interface ActivityProgressUpdated extends BaseActivity {
    type: 'progressUpdated'
    title: string
    description: string
}
```

When you narrow with `switch` or `if`, TypeScript gives you the right shape:

```ts
for await (const activity of session.stream()) {
    switch (activity.type) {
        case 'agentMessaged':
            // activity is now ActivityAgentMessaged
            console.log(activity.message)
            break
        case 'progressUpdated':
            // activity is now ActivityProgressUpdated
            console.log(activity.title)
            break
        case 'planGenerated':
            // activity is now ActivityPlanGenerated
            console.log(activity.plan.steps.length)
            break
    }
}
```

Without the `switch`, `activity.message` would be a type error because not every activity has `.message`.

---

## Reading method signatures

Methods on an interface look like this:

```ts
interface SessionClient {
    stream(options?: StreamActivitiesOptions): AsyncIterable<Activity>
    ask(prompt: string): Promise<ActivityAgentMessaged>
    result(): Promise<SessionOutcome>
    waitFor(state: SessionState): Promise<void>
    approve(): Promise<void>
    snapshot(options?: { activities?: boolean }): Promise<SessionSnapshot>
}
```

The pattern is always: `name(inputs): output`

- `Promise<X>` → `await` it, you get back `X`
- `AsyncIterable<X>` → use with `for await`, each iteration gives you `X`
- `Promise<void>` → `await` it, you get nothing back (you're just waiting for it to finish)

So reading `ask(prompt: string): Promise<ActivityAgentMessaged>` tells you: call it with a string, await the result, you get an `ActivityAgentMessaged` object back (which has `.message` on it).

---

## Intersection types (`&`)

```ts
type Source = {
    name: string
    id: string
} & {
    type: 'githubRepo'
    githubRepo: GitHubRepo
}
```

`&` means "all of these combined." The resulting type has `name`, `id`, `type`, and `githubRepo`. It's used to merge shapes together.

---

## Generics (`<T>`)

Generics are placeholders for a type that gets filled in at the call site:

```ts
select<T extends JulesDomain>(query: JulesQuery<T>): Promise<QueryResult<T>[]>
```

`T` is the placeholder. `extends JulesDomain` constrains it — `T` can only be `'sessions'` or `'activities'`.

When you call it:

```ts
jules.select({ from: 'sessions', ... })
// T is inferred as 'sessions'
// return type becomes Promise<QueryResult<'sessions'>[]>
// which resolves to Promise<SessionResource[]>
```

You don't usually write `<T>` explicitly when calling — TypeScript infers it from your arguments.

---

## `readonly`

```ts
interface SessionSnapshot {
    readonly id: string
    readonly state: SessionState
    readonly activities: readonly Activity[]
}
```

`readonly` means you can read it but not assign to it. `readonly Activity[]` means you also can't push/pop from the array. It's a promise from the library that it won't change after you receive it.

---

## `extends` on interfaces

```ts
interface ActivityAgentMessaged extends BaseActivity {
    type: 'agentMessaged'
    message: string
}
```

`extends BaseActivity` means it inherits everything from `BaseActivity` and adds the extra properties. Look up `BaseActivity` to see what the base fields are:

```ts
interface BaseActivity {
    name: string
    id: string
    description?: string
    createTime: string
    originator: 'user' | 'agent' | 'system'
    artifacts: Artifact[]
}
```

So every activity has `id`, `createTime`, `originator`, `artifacts` — plus whatever specific fields its own interface adds.

---

## Following the chain

The skill is knowing when to follow a reference. When you see a type name you don't recognise:

1. In VSCode: `Ctrl+Click` it to jump to the definition
2. In a raw file: search for `interface TypeName` or `type TypeName =` in the same `dist/` folder

For example, `result(): Promise<SessionOutcome>` — you don't know `SessionOutcome`. You search for it in `types.d.ts`:

```ts
interface SessionOutcome {
    sessionId: string
    title: string
    state: 'completed' | 'failed'
    pullRequest?: PullRequest
    outputs: SessionOutput[]
    generatedFiles(): GeneratedFiles
    changeSet(): ChangeSetArtifact | undefined
}
```

Now you know what you actually get back. `generatedFiles()` is a method — call it, get a `GeneratedFiles` object. Follow that too if you need to know what's on it.

---

## Callable interfaces

Sometimes an interface is itself callable — it describes a function that also has properties:

```ts
interface SourceManager {
    (options?: ListSourcesOptions): AsyncIterable<Source>   // callable
    get(filter: { github: string }): Promise<Source | undefined>  // also has a method
}
```

`jules.sources` is a `SourceManager`. You can call it as a function (`jules.sources()`) to iterate, or call `.get()` on it. Both are valid.

---

## The reading workflow

1. Open `dist/index.d.ts` — see what's exported
2. Identify what you need (`connect`, `jules`, `MemoryStorage`, etc.)
3. Find the type of the thing you got back (`JulesClient`, `SessionClient`, etc.)
4. Read its interface — every method is documented right there
5. Follow return types when you need to know what you get back
6. Use discriminated unions with `switch` to narrow to the specific shape you need

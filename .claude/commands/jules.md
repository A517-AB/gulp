# Jules SDK Docs Index

Jules is an API to a remote VM that executes coding tasks.

All docs at `D:\jules rest\modjules-main\`

## docs/

- `README.md`
- `getting-started.md`
- `sessions.md`
- `activity.md`
- `artifacts.md`
- `automated-runs.md`
- `interactive-sessions.md`
- `batch-processing.md`
- `local-first.md`
- `browser.md`
- `github-design.md`
- `mcp-integrations.md`
- `mcp-configuration.md`
- `mcp-tool-reference.md`
- `mcp-composing-servers.md`
- `mcp-use-cases.md`
- `PROXY.md`
- `PROXY_USE_CASES.md`

## context/

- `features.md`
- `jules-rest-api.md`
- `session-analysis.md`

## Type lookup

To extract a specific type definition from the Jules d.ts files without reading whole files:

```
deno run --allow-read scripts/lookup-type.ts <TypeName> "D:\jules rest\modjules-main" --ext dts
```

Flags: `--similar` (partial name match) · `--related` (pull referenced types too) · `--copy` (clean output)

#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/* eslint-disable */
/**
 * Jules API coverage + timing check.
 *
 * Usage:
 *   deno run --allow-net --allow-env --allow-read scripts/jules-api.ts
 *   deno run --allow-net --allow-env --allow-read scripts/jules-api.ts --env-file .env
 *
 * Or with explicit key:
 *   JULES_API_KEY=xxx deno run --allow-net --allow-env scripts/jules-api.ts
 */

import { jules, SESSION_SCHEMA, ACTIVITY_SCHEMA } from "npm:@google/jules-sdk";

declare const Deno: any;

// ── Config ────────────────────────────────────────────────────────────────────

const key = Deno.env.get("JULES_API_KEY");
if (!key) {
  console.error("JULES_API_KEY not set");
  Deno.exit(1);
}

const client = jules.with({ apiKey: key });

// ── Known types from schema ───────────────────────────────────────────────────

const EXPECTED_ACTIVITY_TYPES: string[] = ACTIVITY_SCHEMA.fields
  .find((f: any) => f.name === "type")
  ?.description.match(/"([^"]+)"/g)
  ?.map((s: string) => s.replace(/"/g, "")) ?? [
    "agentMessaged",
    "userMessaged",
    "planGenerated",
    "planApproved",
    "progressUpdated",
    "sessionCompleted",
    "sessionFailed",
  ];

const EXPECTED_SESSION_STATES: string[] = SESSION_SCHEMA.fields
  .find((f: any) => f.name === "state")
  ?.description.match(/"([^"]+)"/g)
  ?.map((s: string) => s.replace(/"/g, "")) ?? [
    "queued",
    "planning",
    "awaitingPlanApproval",
    "awaitingUserFeedback",
    "inProgress",
    "paused",
    "failed",
    "completed",
  ];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    console.log(`  ✓ ${label} — ${ms}ms`);
    return result;
  } catch (err: any) {
    const ms = Math.round(performance.now() - t0);
    console.log(`  ✗ ${label} — ${ms}ms  [${err?.message ?? err}]`);
    throw err;
  }
}

function coverage(seen: Set<string>, expected: string[], label: string) {
  const missing = expected.filter(e => !seen.has(e));
  const extra = [...seen].filter(s => !expected.includes(s));
  const pct = Math.round((seen.size / expected.length) * 100);
  console.log(`\n  ${label} coverage: ${seen.size}/${expected.length} (${pct}%)`);
  console.log(`    seen:    ${[...seen].sort().join(", ") || "(none)"}`);
  if (missing.length) console.log(`    missing: ${missing.join(", ")}`);
  if (extra.length)   console.log(`    extra:   ${extra.join(", ")} (not in schema)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n━━━ Jules API Check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const seenStates    = new Set<string>();
  const seenActTypes  = new Set<string>();
  let firstSessionId  = "";
  let sessionCount    = 0;

  // ── 1. List sessions (first page only — no drain) ─────────────────────────
  console.log("1. Sessions");
  let sessions: any[] = [];
  try {
    const page = await timed("sessions list", () => client.sessions());
    sessions = page.sessions ?? [];
    sessionCount = sessions.length;
    console.log(`     page size: ${sessionCount}`);

    for (const s of sessions) {
      if (s.state) seenStates.add(s.state);
      if (!firstSessionId && s.id) firstSessionId = s.id;
    }

    // Print a compact session table
    const rows = sessions.slice(0, 10).map((s: any) =>
      `    [${(s.state ?? "?").padEnd(22)}] ${s.id?.slice(0, 8) ?? "?"}  ${(s.title ?? "").slice(0, 50)}`
    );
    rows.forEach(r => console.log(r));
    if (sessions.length > 10) console.log(`    ... and ${sessions.length - 10} more`);
  } catch {
    console.log("    (skipped — check key)");
  }

  // ── 2. List sources ────────────────────────────────────────────────────────
  console.log("\n2. Sources");
  try {
    const sourceList: any[] = await timed("sources list", async () => {
      const result: any[] = [];
      for await (const s of client.sources()) {
        result.push(s);
      }
      return result;
    });
    console.log(`     count: ${sourceList.length}`);
    sourceList.slice(0, 5).forEach((s: any) =>
      console.log(`    ${s.id ?? s.name ?? JSON.stringify(s).slice(0, 60)}`)
    );
  } catch {
    console.log("    (skipped)");
  }

  // ── 3. Activities for most recent session ─────────────────────────────────
  console.log("\n3. Activities");
  if (!firstSessionId) {
    console.log("    (no sessions to inspect)");
  } else {
    try {
      const acts: any[] = await timed(
        `activities for ${firstSessionId.slice(0, 8)}`,
        async () => {
          const result: any[] = [];
          for await (const a of client.session(firstSessionId).activities.history()) {
            result.push(a);
          }
          return result;
        }
      );
      console.log(`     count: ${acts.length}`);

      for (const a of acts) {
        if (a.type) seenActTypes.add(a.type);
      }

      // Show type distribution
      const byType = new Map<string, number>();
      for (const a of acts) {
        const t = a.type ?? "unknown";
        byType.set(t, (byType.get(t) ?? 0) + 1);
      }
      [...byType.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([t, n]) => console.log(`    ${n.toString().padStart(4)}  ${t}`));
    } catch (err: any) {
      console.log(`    (failed: ${err?.message})`);
    }
  }

  // ── 4. Spot-check get session ──────────────────────────────────────────────
  if (firstSessionId) {
    console.log("\n4. Get session");
    try {
      const s = await timed(
        `session.info(${firstSessionId.slice(0, 8)})`,
        () => client.session(firstSessionId).info()
      );
      console.log(`     title: ${(s as any).title ?? "(none)"}`);
      console.log(`     state: ${(s as any).state ?? "?"}`);
    } catch {
      console.log("    (failed)");
    }
  }

  // ── 5. Coverage report ────────────────────────────────────────────────────
  console.log("\n━━━ Coverage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  coverage(seenStates,   EXPECTED_SESSION_STATES, "Session states");
  coverage(seenActTypes, EXPECTED_ACTIVITY_TYPES, "Activity types");

  console.log(`\n  Sessions checked: ${sessionCount}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(err => {
  console.error("\nFatal:", err?.message ?? err);
  Deno.exit(1);
});

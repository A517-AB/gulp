#!/usr/bin/env -S deno run --allow-run --allow-write
// deno task check [tc|lint|test|all]  — defaults to all

const arg = Deno.args[0] ?? "all"
const date = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16)

async function run(label: string, cmd: string[]): Promise<boolean> {
  const logFile = `${label}_${date}.log`
  process.stdout.write(`▶ ${label} `)

  const proc = new Deno.Command(cmd[0]!, {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  })

  const { code, stdout, stderr } = await proc.output()
  const out = new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr)
  await Deno.writeTextFile(logFile, out)

  const errors = out.split("\n").filter(l => / error /i.test(l))
  const ok = code === 0

  if (ok) {
    console.log("✓")
  } else {
    console.log(`✗  (${errors.length} errors → ${logFile})`)
    errors.slice(0, 8).forEach(l => console.log(`   ${l.trim()}`))
    if (errors.length > 8) console.log(`   … +${errors.length - 8} more`)
  }

  return ok
}

const jobs: [string, string[]][] = []
if (arg === "tc"   || arg === "all") jobs.push(["typecheck", ["npm", "run", "typecheck"]])
if (arg === "lint" || arg === "all") jobs.push(["lint",      ["npm", "run", "lint"]])
if (arg === "test" || arg === "all") jobs.push(["test",      ["npm", "run", "test", "--", "--run"]])

const results = await Promise.all(jobs.map(([label, cmd]) => run(label, cmd)))
Deno.exit(results.every(Boolean) ? 0 : 1)

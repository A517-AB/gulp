import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const cwd = 'D:\\LAST\\src\\renderer\\pages\\electron\\repos'

function upgradeStyling(filename) {
  const filepath = join(cwd, filename)
  let content = readFileSync(filepath, 'utf8')

  // Upgrade Cards
  content = content.replace(/className="border-white\/10 bg-zinc-950\/80 text-white"/g, 'className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl text-white transition-all duration-500 hover:bg-black/50"')
  
  // Upgrade Inputs and Textareas
  content = content.replace(/className="(min-h-\[[^\]]+\]\s+)?border-white\/10 bg-black\/40 text-white placeholder:text-white\/30"/g, 'className="$1border-white/10 bg-black/60 text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all duration-300"')
  
  // Upgrade List Items (buttons)
  content = content.replace(/className=\{`w-full rounded-xl border px-3 py-[23] text-left (text-sm )?transition \$\{([^\}]+) \? 'border-sky-400\/35 bg-sky-500\/10( text-white)?' : 'border-white\/10 bg-black\/20( text-white\/70)? hover:bg-white\/5'\}`\}/g, 
    'className={`group w-full rounded-xl border px-4 py-3 text-left $1transition-all duration-300 ${$2 ? \'border-sky-500/50 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]\' : \'border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200\'}`}')

  // Upgrade secondary blocks (like snapshot/outcome details)
  content = content.replace(/className="rounded-xl border border-white\/10 bg-black\/30 p-3( text-sm text-white\/70)?"/g, 'className="rounded-xl border border-white/5 bg-white/5 p-4 shadow-inner backdrop-blur-md$1 transition-colors hover:bg-white/10"')
  
  // Upgrade empty state messages
  content = content.replace(/className="rounded-xl border border-dashed border-white\/10 bg-black\/20 px-4 py-6 text-sm text-white\/45"/g, 'className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm font-medium text-zinc-500 shadow-inner"')

  // Upgrade activity transcript items
  content = content.replace(/className="rounded-xl border border-white\/10 bg-black\/25 p-3"/g, 'className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:shadow-lg"')

  // Upgrade buttons (primary and outline)
  content = content.replace(/className="border-white\/10 bg-transparent text-white hover:bg-white\/10"/g, 'className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"')

  // Add Lucide imports if not present (simple hack: insert near the top if we want, but actually replacing Lucide icons requires more targeted edits, so let's stick to pure CSS classes here)

  writeFileSync(filepath, content, 'utf8')
  console.log(`Upgraded ${filename}`)
}

upgradeStyling('FleetIssueDispatch.tsx')
upgradeStyling('RepolessWorkbench.tsx')

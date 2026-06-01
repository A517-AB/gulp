import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const cwd = 'D:\\LAST\\src\\renderer\\pages\\electron\\repos'

function fixOpacities(filename) {
  const filepath = join(cwd, filename)
  let content = readFileSync(filepath, 'utf8')

  // Fix opacities
  content = content.replace(/text-white\/35/g, 'text-white/40')
  content = content.replace(/text-white\/45/g, 'text-white/50')
  content = content.replace(/text-white\/55/g, 'text-white/60')
  content = content.replace(/text-white\/65/g, 'text-white/70')
  content = content.replace(/text-white\/75/g, 'text-white/80')
  content = content.replace(/text-white\/85/g, 'text-white/90')

  // Checkbox styling (appearance-none custom checkbox)
  content = content.replace(/className="mr-2 h-3 w-3 border-white\/20 bg-black"/g, 'className="mr-2 size-3.5 appearance-none rounded border border-white/20 bg-black/40 checked:bg-sky-500 checked:border-sky-500 transition-all focus:ring-1 focus:ring-sky-500/50 cursor-pointer"')
  
  // Fleet sessions list consistency
  content = content.replace(/className=\{`group w-full rounded-xl border px-4 py-3 text-left transition-all duration-300 \$\{active \? 'border-sky-500\/50 bg-sky-500\/10 shadow-\[0_0_15px_rgba\(14,165,233,0\.15\)\]' : 'border-white\/5 bg-white\/5 hover:border-white\/20 hover:bg-white\/10'\}`\}/g,
    'className={`group w-full rounded-xl border px-4 py-3 text-left transition-all duration-300 ${active ? \\'border-sky-500/50 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]\\' : \\'border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200\\'}`}')
  
  writeFileSync(filepath, content, 'utf8')
}

fixOpacities('FleetIssueDispatch.tsx')
fixOpacities('RepolessWorkbench.tsx')

// Fix indentation in ReposWorkbench.tsx
let rp = join(cwd, 'ReposWorkbench.tsx')
let rpC = readFileSync(rp, 'utf8')
rpC = rpC.replace(/             <div className="rounded-full border border-white\/5/g, '            <div className="rounded-full border border-white/5')
rpC = rpC.replace(/               sources • history • snapshot • result • fleet/g, '              sources • history • snapshot • result • fleet')
rpC = rpC.replace(/             <\/div>/g, '            </div>')
writeFileSync(rp, rpC, 'utf8')

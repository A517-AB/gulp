import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { FleetIssueDispatch } from './FleetIssueDispatch'
import { RepolessWorkbench } from './RepolessWorkbench'
import { TerminalSquare, Server } from 'lucide-react'

export function ReposWorkbench() {
  return (
    <div className="relative h-full overflow-auto bg-neutral-950 text-white selection:bg-sky-500/30">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-sky-900/20 blur-[120px]" />
        <div className="absolute -right-[10%] top-[40%] h-[60%] w-[40%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1700px] flex-col gap-8 p-6 md:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">
              <Server className="size-3" /> Local Jules Tools
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                Repos Control Room
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                This environment stays local to Electron, communicating via the shared Jules bridge. Manage a real repoless tool and direct fleet operations across connected repositories.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-400 backdrop-blur-md">
              sources • history • snapshot • result • fleet
            </div>
          </div>
        </div>

        <Tabs defaultValue="fleet" className="flex flex-col gap-6">
          <TabsList className="h-12 w-full justify-start rounded-xl bg-white/5 p-1 text-zinc-400 backdrop-blur-md md:w-fit">
            <TabsTrigger 
              value="fleet" 
              className="rounded-lg px-6 py-2 transition-all data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-300"
            >
              Fleet fix dispatch
            </TabsTrigger>
            <TabsTrigger 
              value="repoless" 
              className="rounded-lg px-6 py-2 transition-all data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
            >
              <TerminalSquare className="mr-2 size-4" />
              Repoless workbench
            </TabsTrigger>
          </TabsList>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-1 shadow-2xl backdrop-blur-sm">
            <TabsContent value="fleet" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <FleetIssueDispatch />
            </TabsContent>

            <TabsContent value="repoless" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <RepolessWorkbench />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
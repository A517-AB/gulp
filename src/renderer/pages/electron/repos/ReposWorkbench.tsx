import { useState } from 'react'
import { localJules } from '@/lib/jules/local'
import { Button } from '@/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card'
import { Input } from '@/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { FleetIssueDispatch } from './FleetIssueDispatch'
import { RepolessWorkbench } from './RepolessWorkbench'
import { Sparkles, TerminalSquare, KeyRound, Server } from 'lucide-react'

export function ReposWorkbench() {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyMessage, setApiKeyMessage] = useState<string | null>(null)
  const [savingApiKey, setSavingApiKey] = useState(false)

  const applyApiKey = async (value: string | null) => {
    try {
      setSavingApiKey(true)
      setApiKeyMessage(null)
      await localJules.setApiKey(value)
      setApiKeyMessage(
        value
          ? 'Electron Jules API key override applied for new local sessions.'
          : 'Electron Jules API key override cleared.',
      )
      if (!value) {
        setApiKey('')
      }
    } catch (cause) {
      setApiKeyMessage(cause instanceof Error ? cause.message : 'Failed to update the local Jules API key override.')
    } finally {
      setSavingApiKey(false)
    }
  }

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

        <Card className="border-white/5 bg-black/40 text-white shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-sky-400" />
              <CardTitle className="text-lg">Runtime API key override</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Leave blank to fall back to your default environment key. This override only affects Electron-local SDK operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full border-white/10 bg-black/60 pl-4 text-white placeholder:text-zinc-600 transition-all duration-300 focus:border-sky-500/50 focus:ring-sky-500/20"
                />
              </div>
              <div className="flex shrink-0 gap-3">
                <Button
                  onClick={() => {
                    void applyApiKey(apiKey.trim() || null)
                  }}
                  disabled={savingApiKey}
                  className="bg-sky-600 text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500"
                >
                  {savingApiKey ? 'Saving...' : 'Apply Override'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void applyApiKey(null)
                  }}
                  disabled={savingApiKey}
                  className="border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
                >
                  Clear Override
                </Button>
              </div>
            </div>
            {apiKeyMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                <Sparkles className="size-4" />
                <span>{apiKeyMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>

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
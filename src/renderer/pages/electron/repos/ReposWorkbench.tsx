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
    <div className="h-full overflow-auto bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/40">
              Local Jules Tools
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Repos control room</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                This page stays local to Electron, talks through the shared Jules bridge, and gives you a real repoless tool plus a fleet dispatch surface against connected repositories.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
            sources • history • snapshot • result • fleet
          </div>
        </div>

        <Card className="border-white/10 bg-zinc-950/80 text-white">
          <CardHeader>
            <CardTitle>Runtime API key override</CardTitle>
            <CardDescription className="text-white/55">
              Leave it blank to fall back to your configured environment key. This only affects Electron-local Jules SDK calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void applyApiKey(apiKey.trim() || null)
                }}
                disabled={savingApiKey}
              >
                {savingApiKey ? 'Saving...' : 'Apply Override'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void applyApiKey(null)
                }}
                disabled={savingApiKey}
                className="border-white/10 bg-transparent text-white hover:bg-white/10"
              >
                Clear Override
              </Button>
            </div>
          </CardContent>
          {apiKeyMessage && (
            <CardContent className="pt-0 text-sm text-white/65">{apiKeyMessage}</CardContent>
          )}
        </Card>

        <Tabs defaultValue="fleet" className="gap-4">
          <TabsList className="w-full justify-start bg-white/5 p-1 text-white/65 md:w-fit">
            <TabsTrigger value="fleet">Fleet fix dispatch</TabsTrigger>
            <TabsTrigger value="repoless">Repoless workbench</TabsTrigger>
          </TabsList>

          <TabsContent value="fleet" className="mt-0">
            <FleetIssueDispatch />
          </TabsContent>

          <TabsContent value="repoless" className="mt-0">
            <RepolessWorkbench />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
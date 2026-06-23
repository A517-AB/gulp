import { useState, useEffect } from 'react'
import { DynamicDropdown } from '@/components/shared/DynamicDropdown'
import { TerminalConsole } from '@/components/workspace/activity/terminal-console'
import { Folder, GitBranch, Zap } from 'lucide-react'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/ui/select'
import { Separator } from '@/ui/separator'
import { Label } from '@/ui/label'
import { ScrollArea } from '@/ui/scroll-area'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/ui/sheet'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/ui/dialog'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/ui/tooltip'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/ui/context-menu'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/ui/accordion'
import {
  CommandDialog, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem, CommandSeparator,
} from '@/ui/command'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-3xs font-mono uppercase tracking-label text-fg-ghost">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function KitPage() {
  const [selectVal, setSelectVal] = useState('')
  const [dropdownVal, setDropdownVal] = useState<string | null>(null)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); }
  }, [])

  return (
    <TooltipProvider>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-8 max-w-2xl">

          <Section title="Button — variants">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Section>

          <Section title="Button — sizes">
            <Button size="lg">Large</Button>
            <Button size="default">Default</Button>
            <Button size="sm">Small</Button>
            <Button size="icon">✦</Button>
            <Button size="icon-sm">✦</Button>
            <Button variant="outline" disabled>Disabled</Button>
          </Section>

          <Separator />

          <Section title="Badge">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </Section>

          <Separator />

          <Section title="Avatar">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar className="size-6">
              <AvatarFallback className="text-3xs">XS</AvatarFallback>
            </Avatar>
          </Section>

          <Separator />

          <Section title="Tabs">
            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">One</TabsTrigger>
                <TabsTrigger value="two">Two</TabsTrigger>
                <TabsTrigger value="three">Three</TabsTrigger>
              </TabsList>
              <TabsContent value="one"><p className="text-xs text-fg-secondary pt-1">Content for one</p></TabsContent>
              <TabsContent value="two"><p className="text-xs text-fg-secondary pt-1">Content for two</p></TabsContent>
              <TabsContent value="three"><p className="text-xs text-fg-secondary pt-1">Content for three</p></TabsContent>
            </Tabs>
          </Section>

          <Separator />

          <Section title="Select">
            <Select value={selectVal} onValueChange={setSelectVal}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Pick one…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Alpha</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
                <SelectItem value="gamma">Gamma</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          <Separator />

          <Section title="DynamicDropdown">
            <DynamicDropdown
              value={dropdownVal}
              onChange={setDropdownVal}
              placeholder="Pick one…"
              items={[
                { id: 'folder', label: 'Folder', icon: Folder, color: 'var(--color-primary)' },
                { id: 'branch', label: 'Git Branch', icon: GitBranch, color: '#a78bfa' },
                { id: 'zap', label: 'Zap', icon: Zap, color: '#facc15' },
              ]}
            />
          </Section>

          <Separator />

          <Section title="Label">
            <div className="flex flex-col gap-1">
              <Label htmlFor="demo-input">Field label</Label>
              <input id="demo-input" className="h-7 rounded border border-hair bg-raised px-2 text-xs text-fg-secondary outline-none" placeholder="input…" />
            </div>
          </Section>

          <Separator />

          <Section title="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>This is a tooltip</TooltipContent>
            </Tooltip>
          </Section>

          <Separator />

          <Section title="Sheet">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Open right</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet title</SheetTitle>
                  <SheetDescription>This slides in from the right.</SheetDescription>
                </SheetHeader>
                <p className="text-xs text-fg-secondary px-4">Content goes here.</p>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Open bottom</Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Bottom sheet</SheetTitle>
                  <SheetDescription>Slides up from the bottom.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </Section>

          <Separator />

          <Section title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>This is the dialog description.</DialogDescription>
                </DialogHeader>
                <p className="text-xs text-fg-secondary">Body content here.</p>
              </DialogContent>
            </Dialog>
          </Section>

          <Separator />

          <Section title="Accordion — dot (static) + meta + action">
            <div className="w-full">
              <Accordion type="single">
                <AccordionItem id="a1">
                  <AccordionTrigger
                    dot={{ color: "bg-green-500" }}
                    meta={<><span className="text-green-400">+142</span><span className="text-fg-ghost">3.2s</span></>}
                    action={<span className="px-2 py-0.5 rounded border border-hair text-2xs font-mono text-fg-muted hover:text-fg-primary hover:border-subtle transition-colors">apply</span>}
                  >
                    <span className="text-sm font-semibold text-fg-primary">Fetching dependencies</span>
                    <span className="block text-2xs font-mono text-fg-ghost mt-0.5">lockfile · 142 packages</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-fg-muted">Resolved 142 packages from lockfile. No network requests needed.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem id="a2">
                  <AccordionTrigger
                    dot={{ color: "bg-purple-500", ping: true }}
                    meta={<span className="text-fg-dim">84 files</span>}
                  >
                    <span className="text-sm font-semibold text-fg-primary">Running type checks</span>
                    <span className="block text-2xs font-mono text-fg-ghost mt-0.5">inProgress</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-fg-muted">tsc --noEmit passed with 0 errors across 84 files.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem id="a3">
                  <AccordionTrigger dot={{ color: "bg-fg-ghost/20" }} meta={<span className="text-fg-ghost">1.2s</span>}>
                    <span className="text-sm font-semibold text-fg-primary">Building output</span>
                    <span className="block text-2xs font-mono text-fg-ghost mt-0.5">completed</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-fg-muted">Rolldown bundled 3 entry points in 1.2s.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Section>

          <Separator />

          <Section title="Accordion — icon slot (pass anything)">
            <div className="w-full">
              <Accordion type="single">
                <AccordionItem id="b1">
                  <AccordionTrigger icon={<Zap className="h-3 w-3 text-yellow-400" />}>
                    <span className="text-xs font-mono text-fg-secondary">Fetching dependencies</span>
                  </AccordionTrigger>
                  <AccordionContent indent={false}>
                    <p className="text-xs text-fg-muted">Resolved 142 packages from lockfile.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem id="b2">
                  <AccordionTrigger icon={<Zap className="h-3 w-3 text-yellow-400" />}>
                    <span className="text-xs font-mono text-fg-secondary">Running type checks</span>
                  </AccordionTrigger>
                  <AccordionContent indent={false}>
                    <p className="text-xs text-fg-muted">tsc --noEmit passed with 0 errors.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Section>

          <Separator />

          <Section title="Accordion — dot=false (no left slot at all)">
            <div className="w-full">
              <Accordion type="single">
                <AccordionItem id="c1">
                  <AccordionTrigger dot={false}>
                    <span className="text-xs font-mono text-fg-secondary">Fetching dependencies</span>
                  </AccordionTrigger>
                  <AccordionContent indent={false}>
                    <p className="text-xs text-fg-muted">Resolved 142 packages from lockfile.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem id="c2">
                  <AccordionTrigger dot={false}>
                    <span className="text-xs font-mono text-fg-secondary">Running type checks</span>
                  </AccordionTrigger>
                  <AccordionContent indent={false}>
                    <p className="text-xs text-fg-muted">tsc --noEmit passed with 0 errors.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Section>

          <Separator />

          <Section title="TerminalConsole">
            <div className="w-full">
              <TerminalConsole bashOutputs={[
                { type: 'bashOutput', command: 'npm install', stdout: 'added 142 packages in 3.2s\n\n142 packages are up to date.', stderr: '', exitCode: 0 },
                { type: 'bashOutput', command: 'tsc --noEmit', stdout: '', stderr: "src/foo.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.", exitCode: 1 },
                { type: 'bashOutput', command: 'git status', stdout: 'On branch main\nYour branch is up to date.\n\nnothing to commit, working tree clean', stderr: '', exitCode: 0 },
              ]} />
            </div>
          </Section>

          <Separator />

          <Section title="Context Menu — right-click the box">
            <ContextMenu>
              <ContextMenuTrigger>
                <div className="w-48 h-16 rounded-lg border border-hair bg-raised flex items-center justify-center text-xs text-fg-ghost select-none cursor-default">
                  right-click me
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Action one</ContextMenuItem>
                <ContextMenuItem>Action two</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Section>

          <Separator />

          <Section title="Command palette — ctrl+space or button">
            <Button variant="outline" size="sm" onClick={() => { setCmdOpen(true); }}>
              Open palette
            </Button>
            <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
              <CommandInput placeholder="Type a command…" />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup heading="Sessions">
                  <CommandItem>Open new session</CommandItem>
                  <CommandItem>Resume last session</CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Navigation">
                  <CommandItem>Go to explorer</CommandItem>
                  <CommandItem>Go to activity</CommandItem>
                  <CommandItem>Go to settings</CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>
          </Section>

          <Separator />

          <Section title="ScrollArea">
            <ScrollArea className="h-32 w-64 rounded-lg border border-hair bg-raised">
              <div className="p-3 space-y-1">
                {Array.from({ length: 20 }, (_, i) => (
                  <p key={i} className="text-xs text-fg-secondary font-mono">Line {i + 1} — scroll content</p>
                ))}
              </div>
            </ScrollArea>
          </Section>

        </div>
      </ScrollArea>
    </TooltipProvider>
  )
}

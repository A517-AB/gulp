import { useState } from 'react'
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

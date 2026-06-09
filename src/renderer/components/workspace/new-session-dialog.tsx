import {useState} from "react";
import {Plus} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/ui/dialog.tsx";
import {Button} from "@/ui/button.tsx";
import {Input} from "@/ui/input.tsx";
import {Textarea} from "@/ui/textarea.tsx";
import {Label} from "@/ui/label.tsx";
import {DynamicDropdown} from "@/components/shared/DynamicDropdown";
import {useNewSessionForm} from "@/hooks/use-new-session-form.ts";
import type {NewSessionDialogProps} from "@/types/activity-feed.ts";

export function NewSessionDialog({ onSessionCreated, initialValues, trigger, open: controlledOpen, onOpenChange }: NewSessionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen;

  const { sources, branches, formData, setFormData, error, handleSubmit } = useNewSessionForm({
    open,
    ...(initialValues ? { initialValues } : {}),
    ...(onSessionCreated ? { onSessionCreated } : {}),
    onClose: () => { setOpen(false); },
  });

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    { setFormData((p) => ({ ...p, [k]: e.target.value })); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>
          {trigger ?? <Button className="h-8 text-[10px] font-mono uppercase tracking-widest border-0"><Plus className="h-3.5 w-3.5 mr-1.5" />New Session</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription className="text-xs">Describe what Jules should do. Attach a repository or leave it
                repoless.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Source Repository</Label>
              <DynamicDropdown
                  items={[
                      {id: '', label: 'No repository (repoless)'},
                      ...sources.map(s => ({id: s.id, label: s.name.replace(/^sources\/github\//, '')})),
                  ]}
                  value={formData.sourceId || null}
                  onChange={(v) => {
                      setFormData((p) => ({...p, sourceId: v, autoCreatePr: v ? p.autoCreatePr : false}));
                  }}
                  placeholder="Select a repository"
                  className="w-full h-9 justify-between px-3"
              />
          </div>
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Branch (Optional)</Label>
              <DynamicDropdown items={branches.map(b => ({ id: b, label: b }))} value={formData.startingBranch || null} onChange={(v) => { setFormData((p) => ({ ...p, startingBranch: v })); }} placeholder="main" className="w-full h-9 justify-between px-3" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Title (Optional)</Label>
            <Input placeholder="e.g., Fix authentication bug" value={formData.title} onChange={set("title")} className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Instructions *</Label>
            <Textarea placeholder="Describe what you want Jules to do..." value={formData.prompt} onChange={set("prompt")} className="min-h-[100px] max-h-[200px] overflow-y-auto text-xs" required />
          </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="interactive" checked={formData.interactive} onChange={(e) => {
                        setFormData((p) => ({...p, interactive: e.target.checked}));
                    }} className="h-3.5 w-3.5 rounded border-white/20 bg-black/20 text-purple-600"/>
                    <label htmlFor="interactive" className="text-xs text-white/80">Interactive — review plan before
                        execution</label>
                </div>
                {formData.sourceId && (
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="autopr" checked={formData.autoCreatePr} onChange={(e) => {
                            setFormData((p) => ({...p, autoCreatePr: e.target.checked}));
                        }} className="h-3.5 w-3.5 rounded border-white/20 bg-black/20 text-purple-600"/>
                        <label htmlFor="autopr" className="text-xs text-white/80">Automatically create Pull Request when
                            ready</label>
                    </div>
                )}
          </div>
          {error && <div className="rounded bg-red-950/30 p-2.5"><p className="text-xs text-red-400">{error}</p></div>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); }} className="h-8 text-[10px] font-mono uppercase tracking-widest">Cancel</Button>
              <Button type="submit" disabled={!formData.prompt}
                      className="h-8 text-[10px] font-mono uppercase tracking-widest">
              Create Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

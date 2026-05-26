import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@renderer/ui/dialog";
import { Button } from "@renderer/ui/button";
import { Input } from "@renderer/ui/input";
import { Textarea } from "@renderer/ui/textarea";
import { Label } from "@renderer/ui/label";
import { Combobox } from "@renderer/ui/combobox";
import { useNewSessionForm } from "@renderer/hooks/use-new-session-form";
import type { NewSessionDialogProps } from "@/types/activity-feed";

export function NewSessionDialog({ onSessionCreated, initialValues, trigger, open: controlledOpen, onOpenChange }: NewSessionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const { sources, formData, setFormData, loading, error, handleSubmit } = useNewSessionForm({
    open, initialValues, onSessionCreated, onClose: () => setOpen(false),
  });

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="h-8 text-[10px] font-mono uppercase tracking-widest border-0"><Plus className="h-3.5 w-3.5 mr-1.5" />New Session</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription className="text-xs">Select a repository and describe what Jules should do.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source Repository *</Label>
            <Combobox options={sources.map((s) => ({ value: s.id, label: s.name }))} value={formData.sourceId} onValueChange={(v) => setFormData((p) => ({ ...p, sourceId: v }))} placeholder={sources.length === 0 ? "No repositories available" : "Select a repository"} searchPlaceholder="Search repositories..." emptyMessage="No repositories found." className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Branch (Optional)</Label>
            <Input placeholder="main" value={formData.startingBranch} onChange={set("startingBranch")} className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Title (Optional)</Label>
            <Input placeholder="e.g., Fix authentication bug" value={formData.title} onChange={set("title")} className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Instructions *</Label>
            <Textarea placeholder="Describe what you want Jules to do..." value={formData.prompt} onChange={set("prompt")} className="min-h-[100px] max-h-[200px] overflow-y-auto text-xs" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autopr" checked={formData.autoCreatePr} onChange={(e) => setFormData((p) => ({ ...p, autoCreatePr: e.target.checked }))} className="h-3.5 w-3.5 rounded border-white/20 bg-black/20 text-purple-600" />
            <label htmlFor="autopr" className="text-xs text-white/80">Automatically create Pull Request when ready</label>
          </div>
          {error && <div className="rounded bg-red-950/30 p-2.5"><p className="text-xs text-red-400">{error}</p></div>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-8 text-[10px] font-mono uppercase tracking-widest">Cancel</Button>
            <Button type="submit" disabled={loading || !formData.sourceId || !formData.prompt} className="h-8 text-[10px] font-mono uppercase tracking-widest">
              {loading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Creating...</> : "Create Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

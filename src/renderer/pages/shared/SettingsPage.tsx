import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, } from 'lucide-react';
import { useSettingsStore, type Preset } from '@renderer/store/settings';
import { Button } from '@renderer/ui/button';
import { Input } from '@renderer/ui/input';
import { Textarea } from '@renderer/ui/textarea';
import { ScrollArea } from '@renderer/ui/scroll-area';

export default function SettingsPage() {
  const { presets, addPreset, updatePreset, deletePreset } = useSettingsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Preset, 'id'>>({ name: '', prompt: '' });
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (preset: Preset) => {
    setEditingId(preset.id);
    setEditForm({ name: preset.name, prompt: preset.prompt });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', prompt: '' });
    setIsAdding(false);
  };

  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.prompt.trim()) return;

    if (isAdding) {
      addPreset(editForm);
    } else if (editingId) {
      updatePreset(editingId, editForm);
    }
    cancelEdit();
  };

  return (
    <div className="flex flex-col h-full bg-black text-white/90">
      <div className="border-b border-white/[0.08] bg-zinc-950/95 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-white">Settings</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setIsAdding(true); setEditingId(null); setEditForm({ name: '', prompt: '' }); }}
          className="border-white/10 hover:bg-white/5 text-xs h-8"
          disabled={isAdding || editingId !== null}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Preset
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto w-full space-y-8">

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-white mb-1">Quick Prompts</h2>
              <p className="text-xs text-white/50">Manage the quick prompt presets available in the activity feed dropdown.</p>
            </div>

            <div className="space-y-3">
              {isAdding && (
                <div className="border border-white/10 rounded-lg p-4 bg-zinc-900/50 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 block font-mono">Preset Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Code Review"
                      className="bg-black/50 border-white/10 text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 block font-mono">Prompt Template</label>
                    <Textarea
                      value={editForm.prompt}
                      onChange={(e) => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Enter the prompt content..."
                      className="bg-black/50 border-white/10 text-xs min-h-[80px] resize-y"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs text-white/60 hover:text-white">Cancel</Button>
                    <Button variant="outline" size="sm" onClick={saveEdit} className="h-7 text-xs border-white/10 hover:bg-white/10" disabled={!editForm.name.trim() || !editForm.prompt.trim()}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              )}

              {presets.map(preset => (
                <div key={preset.id} className="border border-white/10 rounded-lg bg-zinc-950/50 p-4 transition-colors hover:border-white/20">
                  {editingId === preset.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 block font-mono">Preset Name</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-black/50 border-white/10 text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 block font-mono">Prompt Template</label>
                        <Textarea
                          value={editForm.prompt}
                          onChange={(e) => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                          className="bg-black/50 border-white/10 text-xs min-h-[80px] resize-y"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs text-white/60 hover:text-white">Cancel</Button>
                        <Button variant="outline" size="sm" onClick={saveEdit} className="h-7 text-xs border-white/10 hover:bg-white/10" disabled={!editForm.name.trim() || !editForm.prompt.trim()}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="font-medium text-sm text-white/90">{preset.name}</div>
                        <div className="text-xs text-white/50 line-clamp-2">{preset.prompt}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(preset)} className="h-7 w-7 text-white/40 hover:text-white/90 hover:bg-white/5" disabled={isAdding || (editingId !== null && editingId !== preset.id)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePreset(preset.id)} className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-400/10" disabled={isAdding || editingId !== null}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!isAdding && presets.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                  <p className="text-xs text-white/40">No presets found. Add one to get started.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
}

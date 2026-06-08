import { useEffect, useMemo, useCallback, type FormEvent } from "react";
import { useJules } from "@/lib/jules/provider";
import { useStore } from "@/store/app";
import type { UseNewSessionFormProps, UseNewSessionFormReturn } from "@/types/activity-feed";

export function useNewSessionForm({
  open,
  initialValues,
  onSessionCreated,
  onClose,
}: UseNewSessionFormProps): UseNewSessionFormReturn {
  const { client } = useJules();
  const sources       = useStore(s => s.sources);
  const formData      = useStore(s => s.newSessionForm);
  const setFormData   = useStore(s => s.setNewSessionForm);
  const resetForm     = useStore(s => s.resetNewSessionForm);
  const loadSources   = useStore(s => s.loadSources);

  useEffect(() => {
    if (!open) return;
    loadSources(client);
    if (initialValues) setFormData(initialValues);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFormData({ startingBranch: '' });
  }, [formData.sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const branches = useMemo<string[]>(() => {
    const selected = sources.find(s => s.id === formData.sourceId);
    const repo = (selected?.metadata as Record<string, unknown> | undefined)?.['githubRepo'] as Record<string, unknown> | undefined;
    const list = repo?.['branches'] as { displayName?: string }[] | undefined;
    return list?.map(b => b.displayName ?? '').filter(Boolean) ?? [];
  }, [sources, formData.sourceId]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!client || !formData.sourceId || !formData.prompt) return;
    try {
      await client.createSession({
        sourceId: formData.sourceId,
        prompt: formData.prompt,
        ...(formData.title ? { title: formData.title } : {}),
        ...(formData.startingBranch ? { startingBranch: formData.startingBranch } : {}),
        autoCreatePr: formData.autoCreatePr,
      });
      resetForm();
      onClose();
      onSessionCreated?.();
    } catch (err) {
      console.error('[useNewSessionForm] createSession failed:', err);
    }
  }, [client, formData, onClose, onSessionCreated, resetForm]);

  return {
    sources,
    branches,
    formData,
    setFormData: (patch) => setFormData(typeof patch === 'function' ? patch(formData) : patch),
    error: null,
    handleSubmit,
  };
}

import {type FormEvent, useCallback, useEffect, useMemo} from "react";
import {useStore} from "@/store/app";
import {sdkIpc} from "@shared/bridge";
import type {UseNewSessionFormProps, UseNewSessionFormReturn} from "@/types/activity-feed";

export function useNewSessionForm({
  open,
  initialValues,
  onSessionCreated,
  onClose,
}: UseNewSessionFormProps): UseNewSessionFormReturn {
    const sources = useStore(s => s.sources);
    const formData = useStore(s => s.newSessionForm);
    const setFormData = useStore(s => s.setNewSessionForm);
    const resetForm = useStore(s => s.resetNewSessionForm);
    const loadSources = useStore(s => s.loadSources);

  useEffect(() => {
    if (!open) return;
      void loadSources();
    if (initialValues) setFormData(initialValues);
  }, [open, loadSources, initialValues, setFormData]);

  useEffect(() => {
    setFormData({ startingBranch: '' });
  }, [formData.sourceId, setFormData]);

  const branches = useMemo<string[]>(() => {
    const selected = sources.find(s => s.id === formData.sourceId);
      if (!selected || selected.type !== 'githubRepo') return [];
      return selected.githubRepo.branches ?? [];
  }, [sources, formData.sourceId]);

    const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
        if (!sdkIpc || !formData.prompt) return;
    try {
        const ownerRepo = formData.sourceId.replace(/^(?:sources\/)?github\//, '')
        const config = {
        prompt: formData.prompt,
        ...(formData.title ? { title: formData.title } : {}),
            ...(formData.autoCreatePr ? {autoPr: true} : {}),
            ...(ownerRepo ? {source: {github: ownerRepo, baseBranch: formData.startingBranch || 'main'}} : {}),
        }
        const result = formData.interactive
            ? await sdkIpc.session.create(config)
            : await sdkIpc.client.run(config)
        await sdkIpc.session.info(result.id);
      resetForm();
      onClose();
      onSessionCreated?.();
    } catch (err) {
      console.error('[useNewSessionForm] createSession failed:', err);
    }
    }, [formData, onClose, onSessionCreated, resetForm]);

  return {
    sources,
    branches,
    formData,
    setFormData: (patch) => setFormData(typeof patch === 'function' ? patch(formData) : patch),
    error: null,
    handleSubmit,
  };
}

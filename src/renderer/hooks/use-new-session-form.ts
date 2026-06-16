import {type SyntheticEvent, useCallback, useEffect, useMemo} from "react";
import {useStore} from "@/store/app";
import type {SessionFormData} from "@/store/app";
import type {SessionInitialValues} from '@jules';
import type {Source} from "@google/jules-sdk/types";

interface UseNewSessionFormProps {
    open: boolean;
    initialValues?: SessionInitialValues;
    onSessionCreated?: () => void;
    onClose: () => void;
}

interface UseNewSessionFormReturn {
    sources: Source[];
    branches: string[];
    formData: SessionFormData;
    setFormData: (patch: Partial<SessionFormData> | ((prev: SessionFormData) => Partial<SessionFormData>)) => void;
    error: string | null;
    handleSubmit: (e: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}

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
    const createSession = useStore(s => s.createSession);

  useEffect(() => {
    if (!open) return;
      void loadSources();
    if (initialValues) setFormData(initialValues);
  }, [open, loadSources, initialValues, setFormData]);

  useEffect(() => {
    setFormData({ startingBranch: '' });
  }, [formData.sourceId, setFormData]);

  const branches = useMemo<string[]>(() => {
    const selected = sources.find(s => s.id === formData.sourceId)
    return selected?.githubRepo.branches ?? []
  }, [sources, formData.sourceId]);

    const handleSubmit = useCallback(async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
        if (!formData.prompt) return;
    try {
        const ownerRepo = formData.sourceId.replace(/^(?:sources\/)?github\//, '')
        const config = {
            prompt: formData.prompt,
            ...(formData.title ? { title: formData.title } : {}),
            ...(formData.autoCreatePr ? { autoPr: true } : {}),
            ...(formData.interactive ? { requireApproval: true } : {}),
            ...(ownerRepo ? { source: { github: ownerRepo, baseBranch: formData.startingBranch || 'main' } } : {}),
        }
        await createSession(config)
      resetForm();
      onClose();
      onSessionCreated?.();
    } catch (err) {
      console.error('[useNewSessionForm] createSession failed:', err);
    }
    }, [formData, onClose, onSessionCreated, resetForm, createSession]);

  return {
    sources,
    branches,
    formData,
    setFormData: (patch) => { setFormData(typeof patch === 'function' ? patch(formData) : patch) },
    error: null,
    handleSubmit,
  };
}

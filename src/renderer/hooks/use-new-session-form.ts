import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useJules } from "@/lib/jules/provider";
import type { Source, SessionFormData, UseNewSessionFormProps, UseNewSessionFormReturn } from "@/types/activity-feed";

const DEFAULT_FORM: SessionFormData = {
  sourceId: "",
  title: "",
  prompt: "",
  startingBranch: "",
  autoCreatePr: false,
};

export function useNewSessionForm({
  open,
  initialValues,
  onSessionCreated,
  onClose,
}: UseNewSessionFormProps): UseNewSessionFormReturn {
  const { client } = useJules();
  const [sources, setSources] = useState<Source[]>([]);
  const [formData, setFormData] = useState<SessionFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    if (!client) return;
    try {
      setError(null);
      const data = await client.listSources();
      setSources(data);
      if (data.length === 0) {
        setError("No repositories found. Connect a GitHub repository in the Jules web app first.");
      } else {
        setFormData((prev) => ({ ...prev, sourceId: prev.sourceId || data.at(0)?.id || "" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repositories");
    }
  }, [client]);

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      sourceId: initialValues?.sourceId ?? prev.sourceId,
      title: initialValues?.title ?? prev.title,
      prompt: initialValues?.prompt ?? prev.prompt,
      startingBranch: initialValues?.startingBranch ?? prev.startingBranch,
    }));
    loadSources();
  }, [open, initialValues, loadSources]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!client || !formData.sourceId || !formData.prompt) return;
    try {
      setLoading(true);
      setError(null);
      await client.createSession({
        sourceId: formData.sourceId,
        prompt: formData.prompt,
        ...(formData.title ? { title: formData.title } : {}),
        ...(formData.startingBranch ? { startingBranch: formData.startingBranch } : {}),
        autoCreatePr: formData.autoCreatePr,
      });
      setFormData(DEFAULT_FORM);
      onClose();
      onSessionCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }, [client, formData, onClose, onSessionCreated]);

  return { sources, formData, setFormData, loading, error, handleSubmit };
}

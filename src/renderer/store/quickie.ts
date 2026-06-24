import { create } from 'zustand';
import {jules} from '@jules';
import type { SessionConfig } from '@jules';
import type { QuickieContextType, QuickiePreset, QuickieData } from '@/components/quickie/types';

export interface QuickieJob {
  id: string;
  presetId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  resultSummary?: string;
}

interface QuickieState {
  jobs: Record<string, QuickieJob>;
  executeQuickie: <T extends QuickieContextType>(
    preset: QuickiePreset<T>,
    data: QuickieData<T>
  ) => Promise<{ id: string; resultPromise: Promise<string> }>;
}

export const useQuickieStore = create<QuickieState>((set) => ({
  jobs: {},

  executeQuickie: async (preset, data) => {
    const prompt = preset.generatePrompt(data);
    const title = `Quickie: ${preset.label}`;

    const config = { prompt, title } as SessionConfig;

    if (preset.contextType === 'existing_repo_new_message') {
      const repoData = data as { repo: string; branch: string; message: string };
      (config as unknown as Record<string, unknown>)['source'] = { github: repoData.repo, baseBranch: repoData.branch };
    }

      const run = await jules.run(config);
      const id = run.id;

    set((s) => ({
      jobs: {
        ...s.jobs,
        [id]: { id, presetId: preset.id, status: 'running', startedAt: new Date().toISOString() }
      }
    }));

      const resultPromise = run.result()
          .then(() => {
              const summary = `${preset.label} finished successfully.`;
              set((s) => {
                  const job = s.jobs[id];
                  if (!job) return s;
                  return {jobs: {...s.jobs, [id]: {...job, status: 'completed', resultSummary: summary}}};
              });
              return summary;
          })
          .catch((err: unknown) => {
              set((s) => {
                  const job = s.jobs[id];
                  if (!job) return s;
                  return {jobs: {...s.jobs, [id]: {...job, status: 'failed'}}};
              });
              throw err instanceof Error ? err : new Error(String(err));
          });

    return { id, resultPromise };
  }
}));

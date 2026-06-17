import { create } from 'zustand';
import { sdkIpc } from '@shared/bridge';
import type { SessionConfig } from '@jules';
import type { QuickieContextType, QuickiePreset, QuickieData } from '@/components/quickie/types';
import { useStore } from './app';

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
    if (!sdkIpc) {
      throw new Error('[Quickie] sdkIpc not available');
    }

    const prompt = preset.generatePrompt(data);
    const title = `Quickie: ${preset.label}`;

    const config = { prompt, title } as SessionConfig;

    if (preset.contextType === 'existing_repo_new_message') {
      const repoData = data as { repo: string; branch: string; message: string };
      (config as Record<string, unknown>).source = { github: repoData.repo, baseBranch: repoData.branch };
    }

    // 1. Kick off the session headless
    const { id } = await sdkIpc.client.run(config);
    
    // 2. Track it locally
    set((s) => ({
      jobs: {
        ...s.jobs,
        [id]: { id, presetId: preset.id, status: 'running', startedAt: new Date().toISOString() }
      }
    }));

    // 3. Trigger a global session reload so the sidebar updates
    await useStore.getState().loadSessions();

    // 4. Return the ID and a promise that resolves when the job actually finishes
    const resultPromise = new Promise<string>((resolve, reject) => {
      sdkIpc.session.waitFor(id, 'completed')
        .then(async () => {
          let summary = `${preset.label} finished successfully.`;
          try {
            const res = await sdkIpc.session.result(id) as Record<string, unknown>;
            if (typeof res.summary === 'string') summary = res.summary;
          } catch (e) {
            console.warn('[Quickie] Failed to get session result summary', e);
          }

          set((s) => {
            const job = s.jobs[id];
            if (!job) return s;
            return {
              jobs: { ...s.jobs, [id]: { ...job, status: 'completed', resultSummary: summary } }
            };
          });
          
          resolve(summary);
        })
        .catch((err: unknown) => {
          set((s) => {
            const job = s.jobs[id];
            if (!job) return s;
            return {
              jobs: { ...s.jobs, [id]: { ...job, status: 'failed' } }
            };
          });
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    return { id, resultPromise };
  }
}));

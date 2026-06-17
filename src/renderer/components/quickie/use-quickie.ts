import { useCallback } from 'react';
import { useNotification } from '@/library/notification';
import type { QuickiePreset, QuickieData, QuickieContextType } from './types';
import { useQuickieStore } from '@/store/quickie';

export function useQuickie() {
  const { notify, success, error } = useNotification();
  const executeQuickie = useQuickieStore((s) => s.executeQuickie);

  const execute = useCallback(async <T extends QuickieContextType>(
    preset: QuickiePreset<T>,
    data: QuickieData<T>
  ) => {
    notify({
      title: 'Quickie Started',
      body: `Running ${preset.label}...`,
      id: `quickie-start-${Date.now()}`,
      duration: 3000,
      sound: 'pulse'
    });

    try {
      const { id, resultPromise } = await executeQuickie(preset, data);

      // Wait for the background job to finish and then notify
      resultPromise
        .then((summary) => {
          success({
            title: 'Quickie Complete',
            body: summary,
            sound: 'chime',
            duration: 8000,
            actions: [{ id: 'view_session', label: 'View' }],
            extraData: { sessionId: id }
          });
        })
        .catch((err: unknown) => {
          error({ 
            title: 'Quickie Failed', 
            body: err instanceof Error ? err.message : 'Session failed' 
          });
        });

    } catch (err) {
      error({ 
        title: 'Quickie Error', 
        body: err instanceof Error ? err.message : 'Failed to start' 
      });
    }
  }, [notify, success, error, executeQuickie]);

  return { execute };
}

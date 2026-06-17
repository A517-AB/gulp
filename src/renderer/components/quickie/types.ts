export type QuickieContextType = 'repoless_file' | 'existing_repo_new_message';

export type QuickieData<T extends QuickieContextType> =
  T extends 'repoless_file' ? { filename: string; content: string } :
  T extends 'existing_repo_new_message' ? { repo: string; branch: string; message: string } :
  never;

export interface QuickiePreset<T extends QuickieContextType> {
  id: string;
  label: string;
  contextType: T;
  generatePrompt: (data: QuickieData<T>) => string;
}

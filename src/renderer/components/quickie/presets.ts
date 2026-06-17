import type { QuickiePreset } from './types';

export const analyzeFilePreset: QuickiePreset<'repoless_file'> = {
  id: 'analyze-file',
  label: 'Analyze File',
  contextType: 'repoless_file',
  generatePrompt: (data) => `Please act as a senior software engineer and conduct a code review of this file named \`${data.filename}\`.\n\nIdentify any potential bugs, edge cases, type-safety issues, or performance optimizations. Be concise and direct.\n\n\`\`\`\n${data.content}\n\`\`\``,
};

// Ready for future use
export const customRepoMessagePreset: QuickiePreset<'existing_repo_new_message'> = {
  id: 'repo-message',
  label: 'Send Message',
  contextType: 'existing_repo_new_message',
  generatePrompt: (data) => data.message,
};

export const PRESETS = {
  analyzeFile: analyzeFilePreset,
  customRepoMessage: customRepoMessagePreset,
};

# Quickie System

`Quickie` is a strictly-typed, preset-based system for running ad-hoc Jules interactions from anywhere in the UI (e.g., context menus, global shortcuts, or isolated buttons).

## Why?
Sometimes you don't want to open a full "New Session" modal just to ask Jules to analyze a file or write a quick commit message. Quickie lets you fire off predefined prompts (`QuickiePreset`) with specific contextual data (`QuickieData`) headless-ly.

## Features
- **Strict Typing:** Presets enforce exactly what data they need (e.g., `repoless_file` requires a `filename` and `content`). No loose strings.
- **Headless Execution:** Uses `sdkIpc.client.run` to immediately start the session in the background.
- **Notification Integration:** Automatically displays a toast when the quickie starts, and listens in the background via `waitFor('completed')` to fire a success notification with the results when Jules finishes.

## Usage Example
```tsx
import { useQuickie, PRESETS } from '@/components/quickie';

function MyComponent() {
  const { execute } = useQuickie();

  const handleAnalyze = async () => {
    // 1. Gather required data
    const content = await filesystem.readFile('/path/to/file.ts');
    
    // 2. Execute strictly-typed preset
    execute(PRESETS.analyzeFile, {
      filename: 'file.ts',
      content: content
    });
  }

  return <button onClick={handleAnalyze}>Analyze</button>
}
```

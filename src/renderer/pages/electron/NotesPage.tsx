import { MarkdownEditor } from '@renderer/components/markdown';

export default function NotesPage() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto pt-16 pb-32 px-8 text-sm font-light">
        <MarkdownEditor initialContent="# Welcome to Notes\n\nStart typing and press `/` for commands." />
      </div>
    </div>
  );
}

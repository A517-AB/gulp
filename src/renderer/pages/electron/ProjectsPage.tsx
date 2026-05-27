import { useState, useEffect, useRef } from "react";
import { Pencil, Check } from "lucide-react";
import { MarkdownContent } from "@renderer/components/shared/MarkdownContent";

const STORAGE_KEY = "jules:projects-notes";

const DEFAULT_CONTENT = `# Projects

## Active

- [ ]

## Notes

`;

function loadContent(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONTENT;
  } catch {
    return DEFAULT_CONTENT;
  }
}

function saveContent(content: string): void {
  // TODO: wire through filesystem IPC (filesystem.ts) to read/write a real .md file on disk
  try {
    localStorage.setItem(STORAGE_KEY, content);
  } catch { /* ignore */ }
}

function toggleCheckbox(markdown: string, idx: number, checked: boolean): string {
  let count = 0;
  return markdown.replace(/- \[[ x]\]/g, (match) => {
    if (count++ === idx) return checked ? "- [x]" : "- [ ]";
    return match;
  });
}

export default function ProjectsPage() {
  const [content, setContent] = useState(loadContent);
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    saveContent(content);
  }, [content]);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
    }
  }, [editing]);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-8 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="label-mono text-fg-ghost">notes.md</span>
        <button
          onClick={() => { setEditing((e) => !e); }}
          className="flex items-center gap-1.5 text-2xs font-mono text-fg-ghost hover:text-fg-muted transition-colors"
        >
          {editing
            ? <><Check className="h-3 w-3" /> done</>
            : <><Pencil className="h-3 w-3" /> edit</>
          }
        </button>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); }}
          className="flex-1 resize-none bg-transparent text-fg-primary text-sm font-mono leading-relaxed outline-none placeholder:text-fg-ghost"
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <MarkdownContent
            onCheckboxToggle={(idx, checked) => {
              setContent((c) => toggleCheckbox(c, idx, checked));
            }}
          >
            {content}
          </MarkdownContent>
        </div>
      )}
    </div>
  );
}

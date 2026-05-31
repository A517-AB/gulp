import type { BlockNoteEditor, Block, PartialBlock } from "@blocknote/core";

export type { BlockNoteEditor, Block, PartialBlock };

export interface MarkdownEditorProps {
  initialContent?: string;
  readOnly?: boolean;
  className?: string;
}

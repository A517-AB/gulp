import type { Block, PartialBlock, BlockNoteEditor } from "@blocknote/core";

export type { Block, PartialBlock, BlockNoteEditor };

// Convenience aliases using BlockNote's inferred default schemas
export type NoteBlock = Block;
export type NotePartialBlock = PartialBlock;

export interface MarkdownEditorProps {
  initialContent?: NotePartialBlock[];
  readOnly?: boolean;
  className?: string;
  onChange?: (blocks: NoteBlock[]) => void;
}

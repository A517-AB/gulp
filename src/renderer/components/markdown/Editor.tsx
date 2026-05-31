import { useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { cn } from '@renderer/utils';
import '@blocknote/mantine/style.css';
import type { MarkdownEditorProps } from './types';

export function MarkdownEditor({ initialContent, readOnly, className }: MarkdownEditorProps) {
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (initialContent) {
      const blocks = editor.tryParseMarkdownToBlocks(initialContent);
      editor.replaceBlocks(editor.document, blocks);
    }
  }, [editor, initialContent]);

  return (
    <div className={cn("w-full h-full", className)}>
      {/* @ts-expect-error BlockNote internal types violate exactOptionalPropertyTypes */}
      <BlockNoteView editor={editor} editable={!readOnly} theme="light" />
    </div>
  );
}

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export interface BlockEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  /** Fired whenever the content changes, returning the new markdown */
  onChange?: (markdown: string) => void;
  /** Optional classname for wrapper */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
}

export function BlockEditor({
  initialContent = "",
  onChange,
  className = "",
  readOnly = false,
}: BlockEditorProps) {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();
  const [isLoaded, setIsLoaded] = useState(false);

  // Load the initial markdown content once the editor is ready
  useEffect(() => {
    if (initialContent) {
      const blocks = editor.tryParseMarkdownToBlocks(initialContent);
      editor.replaceBlocks(editor.document, blocks);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, [editor, initialContent]);

  const { resolvedTheme } = useTheme();

  return (
    <div className={`relative w-full ${className}`}>
      {isLoaded ? (
        <BlockNoteView
          editor={editor}
          editable={!readOnly}
          theme={resolvedTheme === 'dark' ? {
            ...darkDefaultTheme,
            fontFamily: "Roboto, sans-serif",
          } : {
            ...lightDefaultTheme,
            fontFamily: "Roboto, sans-serif",
          }}
          onChange={() => {
            if (!onChange) return;
            const markdown = editor.blocksToMarkdownLossy(editor.document);
            onChange(markdown);
          }}
        />
      ) : (
        <div className="p-4 text-sm text-gray-500">Loading editor...</div>
      )}
    </div>
  );
}


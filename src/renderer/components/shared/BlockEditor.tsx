import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, lightDefaultTheme, darkDefaultTheme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { codeBlockOptions } from "@blocknote/code-block";
import { useEffect, useState } from "react";
import { useTheme } from "@/providers/theme";

export interface BlockEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function BlockEditor({
  initialContent = "",
  onChange,
  className = "",
  readOnly = false,
}: BlockEditorProps) {
  const editor = useCreateBlockNote(codeBlockOptions);
  const [isLoaded, setIsLoaded] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    async function load() {
      const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
      editor.replaceBlocks(editor.document, blocks);
      setIsLoaded(true);
    }
    void load();
  }, [editor, initialContent]);

  return (
    <div className={`relative w-full ${className}`}>
      {isLoaded ? (
        <BlockNoteView
          editor={editor}
          editable={!readOnly}
          theme={theme === 'dark'
            ? { ...darkDefaultTheme, fontFamily: "Roboto, sans-serif" }
            : { ...lightDefaultTheme, fontFamily: "Roboto, sans-serif" }
          }
          onChange={() => {
            if (!onChange) return;
            void editor.blocksToMarkdownLossy(editor.document).then(onChange);
          }}
        />
      ) : (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      )}
    </div>
  );
}

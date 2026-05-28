import { useEffect, useState, type ReactNode } from 'react'
import { BlockEditor } from '@/components/shared/BlockEditor'

export default function NotesPage(): ReactNode {
    const draftPath = "D:\\LAST\\blueprints\\draft.md";
    const [initialContent, setInitialContent] = useState<string | null>(() => {
        // If not in electron, we can synchronously load from localStorage
        if (!window.electron) {
            return localStorage.getItem("notes-draft") ?? "# Blueprint\n\nStart typing here...";
        }
        return null;
    });

    useEffect(() => {
        if (window.electron) {
            window.electron.filesystem.exists(draftPath).then(async (exists) => {
                if (exists) {
                    const content = await window.electron.filesystem.readFile(draftPath);
                    setInitialContent(content || "# Blueprint\n\nStart typing here...");
                } else {
                    setInitialContent("# Blueprint\n\nStart typing here...");
                }
            }).catch(console.error);
        }
    }, [draftPath]);

    if (initialContent === null) return null;

    return (
        <div className="w-full h-full overflow-y-auto bg-base">
            <div className="max-w-4xl mx-auto py-16 px-8 min-h-full">
                <BlockEditor 
                    initialContent={initialContent} 
                    onChange={(markdown) => {
                        // TODO: switch to json instead of markdown for rich state and custom blocks
                        if (window.electron) {
                            window.electron.filesystem.writeFile(draftPath, markdown).catch(console.error);
                        } else {
                            localStorage.setItem("notes-draft", markdown);
                        }
                    }}
                />
            </div>
        </div>
    )
}

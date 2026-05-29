import { useEffect, useState, type ReactNode } from 'react'
import { filesystem } from '@/shared/bridge'
import { BlockEditor } from '@/components/shared/BlockEditor'

const DRAFT_PATH = "D:\\LAST\\blueprints\\draft.md";
const FALLBACK = "# Blueprint\n\nStart typing here...";

export default function NotesPage(): ReactNode {
    const [content, setContent] = useState<string | null>(null);

    useEffect(() => {
        void filesystem?.exists(DRAFT_PATH).then(async (exists: boolean) => {
            const text = exists ? await filesystem?.readFile(DRAFT_PATH) : FALLBACK;
            setContent(text ?? FALLBACK);
        }).catch(() => { setContent(FALLBACK); });
    }, []);

    if (content === null) return null;

    return (
        <div className="w-full h-full overflow-y-auto bg-base">
            <div className="max-w-4xl mx-auto py-16 px-8 min-h-full">
                <BlockEditor
                    initialContent={content}
                    onChange={(markdown) => {
                        void filesystem?.writeFile(DRAFT_PATH, markdown).catch(console.error);
                    }}
                />
            </div>
        </div>
    )
}

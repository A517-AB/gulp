import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
    children: string;
}

export const Markdown = memo(function Markdown({ children }: MarkdownProps) {
    return (
        <div className="prose dark:prose-invert max-w-none break-words prose-p:text-sm prose-headings:text-base prose-code:text-sm prose-pre:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
});

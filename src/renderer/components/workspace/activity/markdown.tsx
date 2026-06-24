import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
    children: string;
}

export const Markdown = memo(function Markdown({ children }: MarkdownProps) {
    return (
        <div
            className="prose dark:prose-invert max-w-none w-full break-words prose-p:text-sm prose-p:w-full prose-headings:text-base prose-headings:w-full prose-code:text-sm prose-pre:text-sm prose-pre:w-full prose-ul:text-sm prose-ul:w-full prose-ol:text-sm prose-ol:w-full prose-li:my-0 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
});

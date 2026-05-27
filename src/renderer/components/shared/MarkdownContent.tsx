import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  children: string;
  onCheckboxToggle?: (lineIndex: number, checked: boolean) => void;
  className?: string;
}

export function MarkdownContent({ children, onCheckboxToggle, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none markdown-content ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          input: ({ checked, ...props }) => {
            if (props.type !== "checkbox") return <input {...props} />;
            return (
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (!onCheckboxToggle) return;
                  const inputs = document.querySelectorAll(".markdown-content input[type=checkbox]");
                  const idx = Array.from(inputs).indexOf(e.currentTarget);
                  onCheckboxToggle(idx, e.currentTarget.checked);
                }}
                readOnly={!onCheckboxToggle}
                className="mr-1.5 mt-0.5 accent-primary cursor-pointer align-middle"
              />
            );
          },
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

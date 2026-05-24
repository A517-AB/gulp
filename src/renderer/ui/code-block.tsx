import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/utils";

interface CodeTab {
  label: string;
  code: string;
  language?: string;
}

interface CodeBlockProps {
  tabs?: CodeTab[];
  code?: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ tabs, code, language = "bash", className }: CodeBlockProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const codeContent = useMemo(() => {
    if (tabs && tabs.length > 0) return tabs;
    if (code) return [{ label: language, code, language }];
    return [];
  }, [tabs, code, language]);

  const currentCode = codeContent[activeTab]?.code ?? "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: recheck overflow when tab content changes
  useLayoutEffect(() => {
    const check = () => {
      if (preRef.current) {
        setHasOverflow(preRef.current.scrollWidth > preRef.current.clientWidth);
      }
    };
    check();
    const obs = new ResizeObserver(check);
    if (preRef.current) obs.observe(preRef.current);
    return () => { obs.disconnect() };
  }, [activeTab]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => { setCopied(false) }, 2000);
  };

  if (codeContent.length === 0) return null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-0.5",
        "border-hair bg-surface text-fg-primary",
        className,
      )}
    >
      {/* Tab bar */}
      {codeContent.length > 1 && (
        <div className="flex items-center relative pr-2.5">
          <div
            role="tablist"
            className="flex-1 min-w-0 text-xs leading-6 rounded-tl-xl gap-1 flex overflow-x-auto overflow-y-hidden"
          >
            <div className="relative flex gap-1">
              {codeContent.map((tab, index) => (
                <button
                  key={`${tab.label}-${index.toString()}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === index}
                  onClick={() => { setActiveTab(index) }}
                  className={cn(
                    "flex items-center relative gap-1.5 my-1 mb-1.5 outline-none",
                    "whitespace-nowrap font-medium transition-colors duration-150",
                    "px-1.5 rounded-lg first:ml-2.5",
                    "hover:bg-hover",
                    activeTab === index ? "text-fg-primary" : "text-fg-dim",
                  )}
                >
                  {tab.label}
                  {activeTab === index && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Code content */}
      <div className="relative overflow-hidden">
        {/* Copy button */}
        <button
          onClick={() => { void handleCopy() }}
          className={cn(
            "absolute top-2 right-2 z-10",
            "flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg",
            "text-fg-dim bg-overlay/80 backdrop-blur-sm",
            "border border-hair",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-hover hover:text-fg-primary",
            "transition-all duration-150 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          aria-label="Copy code"
        >
          <span className="relative size-3.5">
            <Copy className={cn(
              "absolute inset-0 size-full transition-all duration-150",
              copied ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0",
            )} />
            <Check className={cn(
              "absolute inset-0 size-full transition-all duration-150",
              copied ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 -rotate-90",
            )} />
          </span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <pre
          ref={preRef}
          className={cn(
            "p-4 text-sm leading-relaxed m-0 bg-raised",
            codeContent.length > 1 ? "rounded-b-2xl" : "rounded-2xl",
            hasOverflow ? "overflow-x-auto" : "overflow-x-hidden",
          )}
        >
          {/* key change triggers @starting-style fade-in via starting: variant */}
          <code
            key={activeTab}
            className="font-mono text-fg-primary block whitespace-pre starting:opacity-0 opacity-100 transition-opacity duration-150"
          >
            {currentCode}
          </code>
        </pre>
      </div>
    </div>
  );
}

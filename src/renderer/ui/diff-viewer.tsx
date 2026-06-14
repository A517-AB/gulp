import { useState, useMemo, useId } from "react";
import { Check, Copy, ChevronDown, ChevronRight, ExternalLink, Download } from "lucide-react";
import { cn } from "@/utils";

interface DiffViewerProps {
    diff: string | undefined | null;
  className?: string;
  repoUrl?: string;
  branch?: string;
  onDownloadFile?: ((filename: string) => Promise<void> | void) | undefined;
}

interface ParsedDiffFile {
  filename: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
}

function parseDiff(diff: string | undefined | null): ParsedDiffFile[] {
    if (!diff) return [];
  const files: ParsedDiffFile[] = [];
  const lines = diff.split("\n");
  let currentFile: ParsedDiffFile | null = null;
  let originalLine = 0;
  let modifiedLine = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile) files.push(currentFile);
      const match = /b\/(.+)$/.exec(line);
      currentFile = { filename: match?.[1] ?? "unknown", lines: [] };
      originalLine = 0;
      modifiedLine = 0;
    } else if (currentFile) {
      if (line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
        // skip metadata
      } else if (line.startsWith("@@")) {
        const match = /^@@ -(\d+),?\d* \+(\d+),?\d* @@/.exec(line);
        if (match) {
          originalLine = parseInt(match[1] ?? '0', 10) - 1;
          modifiedLine = parseInt(match[2] ?? '0', 10) - 1;
        }
        currentFile.lines.push({ type: "header", content: line });
      } else if (line.startsWith("+")) {
        modifiedLine++;
        currentFile.lines.push({ type: "add", content: line, modifiedLineNumber: modifiedLine });
      } else if (line.startsWith("-")) {
        originalLine++;
        currentFile.lines.push({ type: "remove", content: line, originalLineNumber: originalLine });
      } else if (line.startsWith(" ")) {
        originalLine++;
        modifiedLine++;
        currentFile.lines.push({ type: "context", content: line, originalLineNumber: originalLine, modifiedLineNumber: modifiedLine });
      }
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

function FileDiff({
  file,
  repoUrl,
  branch = "main",
  onDownloadFile,
}: {
  file: ParsedDiffFile;
  repoUrl?: string;
  branch?: string;
  onDownloadFile?: ((filename: string) => Promise<void> | void) | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const contentId = useId();

  const handleCopy = async () => {
    const text = file.lines.map(l => l.content).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => { setCopyState("idle") }, 2000);
  };

  const handleDownload = async () => {
    if (!onDownloadFile) return;
    try {
      setDownloadState("saving");
      await onDownloadFile(file.filename);
      setDownloadState("done");
    } catch (err) {
      console.error("[DiffViewer] failed to download file:", err);
      setDownloadState("error");
    }
    setTimeout(() => { setDownloadState("idle") }, 2000);
  };

  const addedCount = file.lines.filter(l => l.type === "add").length;
  const removedCount = file.lines.filter(l => l.type === "remove").length;

  return (
    <div className="border border-hair bg-surface rounded-lg overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-hair bg-raised">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => { setIsExpanded(!isExpanded) }}
            aria-expanded={isExpanded}
            aria-controls={contentId}
            className="flex items-center gap-2 text-left hover:bg-hover rounded px-2 py-1 -ml-2 transition-colors truncate"
          >
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-fg-dim shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-fg-dim shrink-0" />
            }
            <span className="text-xxs font-mono text-fg-primary font-bold">{file.filename}</span>
          </button>
          {repoUrl && (
            <a
              href={`${repoUrl}/blob/${branch}/${file.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-ghost hover:text-fg-primary transition-colors shrink-0"
              title="View on GitHub"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-3xs font-mono">
            <span className="text-diff-add-text">+{addedCount}</span>
            <span className="text-fg-ghost">/</span>
            <span className="text-diff-remove-text">-{removedCount}</span>
          </div>
          <button
            onClick={() => { void handleCopy() }}
            className="flex items-center gap-1 px-2 py-1 text-3xs font-mono uppercase tracking-wider rounded bg-hover hover:bg-active border border-hair text-fg-dim hover:text-fg-secondary transition-colors active:scale-95"
          >
            {copyState === "copied" ? <Check className="h-3 w-3" /> : copyState === "error" ? <span className="text-destructive font-bold">!</span> : <Copy className="h-3 w-3" />}
            <span>{copyState === "copied" ? "Copied" : copyState === "error" ? "Error" : "Copy"}</span>
          </button>
          {onDownloadFile && (
            <button
              onClick={() => { void handleDownload() }}
              disabled={downloadState === "saving"}
              className="flex items-center gap-1 px-2 py-1 text-3xs font-mono uppercase tracking-wider rounded bg-hover hover:bg-active border border-hair text-fg-dim hover:text-fg-secondary transition-colors active:scale-95 disabled:opacity-50"
            >
              {downloadState === "done" ? <Check className="h-3 w-3 text-green-500" /> : downloadState === "error" ? <span className="text-destructive font-bold">!</span> : <Download className="h-3 w-3" />}
              <span>{downloadState === "saving" ? "Saving..." : downloadState === "done" ? "Saved" : downloadState === "error" ? "Error" : "Save"}</span>
            </button>
          )}
        </div>
      </div>

      {/* collapsible content — CSS grid trick, no JS animation library */}
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="overflow-x-auto pb-1">
            <pre className="text-xs font-mono leading-relaxed m-0 w-full">
              {file.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    line.type === "add"    && "bg-diff-add-bg",
                    line.type === "remove" && "bg-diff-remove-bg",
                    line.type === "header" && "bg-diff-chunk-bg",
                  )}
                >
                  <div className="flex w-24 shrink-0 select-none border-r border-hair bg-raised text-right text-fg-ghost">
                    <span className="w-10 pr-2">{line.originalLineNumber ?? ""}</span>
                    <span className="w-10 pr-2">{line.modifiedLineNumber ?? ""}</span>
                  </div>
                  <div
                    className={cn(
                      "px-4 flex-1 min-w-0 whitespace-pre-wrap break-all",
                      line.type === "add"     && "text-diff-add-text",
                      line.type === "remove"  && "text-diff-remove-text",
                      line.type === "context" && "text-fg-muted",
                      line.type === "header"  && "text-diff-chunk-text font-bold",
                    )}
                  >
                    {line.content}
                  </div>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiffViewer({ diff, className, repoUrl, branch, onDownloadFile }: DiffViewerProps) {
  const files = useMemo(() => parseDiff(diff), [diff]);

  if (files.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="label-mono text-fg-ghost">No diff data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="label-mono text-fg-ghost mb-2">
        {files.length} {files.length === 1 ? "file" : "files"} changed
      </div>
      {files.map((file, idx) => (
        <FileDiff 
          key={idx} 
          file={file} 
          {...(onDownloadFile && { onDownloadFile })} 
          {...(repoUrl && { repoUrl })} 
          {...(branch && { branch })} 
        />
      ))}
    </div>
  );
}

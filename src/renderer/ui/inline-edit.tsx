"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/renderer/utils/utils";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}

export function InlineEdit({ value, onSave, multiline, className, placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const setInputRef = (element: HTMLInputElement | null) => {
    ref.current = element;
  };

  const setTextareaRef = (element: HTMLTextAreaElement | null) => {
    ref.current = element;
  };

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const sharedProps = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value);
    },
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      if (!multiline && e.key === "Enter") { e.preventDefault(); commit(); }
    },
    className: cn(
      "bg-white/5 border border-white/20 rounded px-1 -mx-1 outline-none focus:border-white/40 w-full",
      multiline ? "resize-none" : "",
      className
    ),
  };

  if (!editing) {
    return (
      <span
        onClick={startEditing}
        title="Click to edit"
        className={cn("cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors whitespace-pre-wrap", className)}
      >
        {value || <span className="text-white/20 italic">{placeholder}</span>}
      </span>
    );
  }

  return multiline
    ? <textarea ref={setTextareaRef} {...sharedProps} rows={4} />
    : <input ref={setInputRef} {...sharedProps} />;
}

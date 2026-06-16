import * as React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils";

// ── context ───────────────────────────────────────────────────────────────────

interface AccordionCtx {
  open: Set<string>;
  toggle: (id: string) => void;
  overlay: boolean;
}

const Ctx     = createContext<AccordionCtx | null>(null);
const ItemCtx = createContext<{ id: string; leadSlot: "dot" | "icon" | "none" } | null>(null);

function useItem() {
  const item = useContext(ItemCtx);
  const acc  = useContext(Ctx);
  if (!item || !acc) throw new Error("Must be inside Accordion > AccordionItem");
  return {
    isOpen:   acc.open.has(item.id),
    toggle:   () => { acc.toggle(item.id) },
    overlay:  acc.overlay,
    leadSlot: item.leadSlot,
  };
}

// ── Accordion ─────────────────────────────────────────────────────────────────

interface AccordionProps {
  type?: "single" | "multiple";
  defaultOpen?: string[] | undefined;
  /** content floats over page instead of pushing layout */
  overlay?: boolean;
  children: React.ReactNode;
  className?: string | undefined;
}

function Accordion({ type = "single", defaultOpen = [], overlay = false, children, className }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen));

  const toggle = useCallback((id: string) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (type === "single") next.clear();
        next.add(id);
      }
      return next;
    });
  }, [type]);

  return (
    <Ctx.Provider value={{ open, toggle, overlay }}>
      <div data-slot="accordion" className={cn("w-full", className)}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

// ── AccordionItem ─────────────────────────────────────────────────────────────

interface AccordionItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** tells content how far to indent — set automatically by trigger */
  leadSlot?: "dot" | "icon" | "none";
}

function AccordionItem({ id, children, className, leadSlot = "dot" }: AccordionItemProps) {
  return (
    <ItemCtx.Provider value={{ id, leadSlot }}>
      <div data-slot="accordion-item" className={cn("w-full relative", className)}>
        {children}
      </div>
    </ItemCtx.Provider>
  );
}

// ── AccordionTrigger ──────────────────────────────────────────────────────────

interface DotProps {
  color?: string;
  ping?:  boolean;
}

interface AccordionTriggerProps {
  children:   React.ReactNode;
  className?: string;
  dot?:       DotProps | false | undefined;
  icon?:      React.ReactNode;
  meta?:      React.ReactNode;
  action?:    React.ReactNode;
  chevron?:   React.ReactNode;
}

function AccordionTrigger({ children, className, dot, icon, meta, action, chevron }: AccordionTriggerProps) {
  const { isOpen, toggle } = useItem();
  const dotColor = dot && dot.color ? dot.color : "bg-fg-ghost/20";
  const dotPing  = dot && dot.ping;

  return (
    <button
      type="button"
      data-slot="accordion-trigger"
      data-state={isOpen ? "open" : "closed"}
      onClick={toggle}
      className={cn(
        "group/trigger flex w-full items-center gap-3 py-3 px-3 rounded-md",
        "cursor-pointer select-none transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isOpen ? "bg-hover" : "hover:bg-hover/50",
        className,
      )}
    >
      {/* dot slot */}
      {dot !== false && icon === undefined && (
        <div className="w-2 shrink-0 flex items-center justify-center">
          {dotPing ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", dotColor)} />
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotColor)} />
            </span>
          ) : (
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
          )}
        </div>
      )}

      {/* icon slot */}
      {icon !== undefined && (
        <span className="shrink-0 text-fg-ghost">{icon}</span>
      )}

      {/* main content */}
      <span className="flex-1 min-w-0 text-left">{children}</span>

      {/* meta */}
      {meta !== undefined && (
        <span className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-fg-dim">
          {meta}
        </span>
      )}

      {/* hover action */}
      {action !== undefined && (
        <span className="opacity-0 group-hover/trigger:opacity-100 transition-opacity shrink-0">
          {action}
        </span>
      )}

      {/* chevron */}
      <motion.span
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.16 }}
        className="shrink-0 text-fg-ghost"
      >
        {chevron ?? <ChevronDown className="h-3.5 w-3.5" />}
      </motion.span>
    </button>
  );
}

// ── AccordionContent ──────────────────────────────────────────────────────────

// px-3 (12) + dot w-2 (8) + gap-3 (12) = 32 → pl-8
// px-3 (12) + icon ~16   + gap-3 (12) = 40 → pl-10
// px-3 (12) + no slot                 = 12 → pl-3
const INDENT: Record<"dot" | "icon" | "none", string> = {
  dot:  "pl-8",
  icon: "pl-10",
  none: "pl-3",
};

interface AccordionContentProps {
  children:    React.ReactNode;
  className?:  string | undefined;
  /** align content with trigger text — pass false to start from left edge */
  indent?:     boolean;
}

function AccordionContent({ children, className, indent = true }: AccordionContentProps) {
  const { isOpen, overlay, leadSlot } = useItem();

  const content = (
    <div
      data-slot="accordion-content"
      className={cn(
        "text-sm text-fg-secondary pr-3 py-2",
        indent ? INDENT[leadSlot] : "pl-3",
        overlay && "bg-overlay border border-hair rounded-md shadow-lg mt-1",
        className,
      )}
    >
      {children}
    </div>
  );

  if (overlay) {
    return (
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

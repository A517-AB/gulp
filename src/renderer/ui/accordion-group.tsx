// TODO: incomplete — missing edge control (keyboard nav, focus trap, scroll-into-view)
import type { ReactNode } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./accordion";

export interface AccordionGroupItem {
  id:       string;
  label:    ReactNode;
  /** sub-label shown below the main label */
  sublabel?: ReactNode;
  content:  ReactNode;
  dot?:     { color?: string; ping?: boolean } | false;
  icon?:    ReactNode;
  meta?:    ReactNode;
  action?:  ReactNode;
}

interface AccordionGroupProps {
  items:       AccordionGroupItem[];
  type?:       "single" | "multiple";
  overlay?:    boolean;
  defaultOpen?: string[];
  className?:  string;
  contentClassName?: string;
}

export function AccordionGroup({
  items,
  type = "single",
  overlay = false,
  defaultOpen,
  className,
  contentClassName,
}: AccordionGroupProps) {
  return (
    <Accordion type={type} overlay={overlay} defaultOpen={defaultOpen} className={className}>
      {items.map(item => (
        <AccordionItem
          key={item.id}
          id={item.id}
          leadSlot={item.icon !== undefined ? "icon" : item.dot === false ? "none" : "dot"}
        >
          <AccordionTrigger
            dot={item.dot}
            icon={item.icon}
            meta={item.meta}
            action={item.action}
          >
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-fg-primary truncate">{item.label}</span>
              {item.sublabel && (
                <span className="text-2xs font-mono text-fg-ghost mt-0.5 truncate">{item.sublabel}</span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

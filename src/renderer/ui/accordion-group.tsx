import { useRef, type ReactNode } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const target = e.target as HTMLElement;
    if (target.getAttribute("data-slot") !== "accordion-trigger") return;

    const triggers = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')
    );

    if (triggers.length === 0) return;

    const currentIndex = triggers.indexOf(target);
    if (currentIndex === -1) return;

    let nextIndex: number;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (currentIndex + 1) % triggers.length;
        break;
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = triggers.length - 1;
        break;
      default:
        return;
    }

    const nextTrigger = triggers[nextIndex];
    if (nextTrigger) {
      nextTrigger.focus();
      nextTrigger.scrollIntoView({ block: "nearest" });
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
      <Accordion type={type} overlay={overlay} defaultOpen={defaultOpen}>
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
    </div>
  );
}
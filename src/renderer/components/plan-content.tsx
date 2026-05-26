import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@renderer/ui/button";
import type { PlanContentProps } from "@/types/activity-feed";

interface PlanStep { title?: string; description?: string; [key: string]: unknown }

function getPlanText(data: unknown): string {
  if (Array.isArray(data)) {
    return data.map((item: PlanStep, i) => {
      const t = item.title ? `${i + 1}. ${item.title}` : `${i + 1}. ${JSON.stringify(item)}`;
      return t + (item.description ? `\n   ${item.description}` : "");
    }).join("\n\n");
  }
  if (typeof data === "object" && data !== null && "steps" in data) {
    const p = data as { description?: string; steps: PlanStep[] };
    const steps = p.steps.map((s, i) => {
      const t = s.title ? `Step ${i + 1}: ${s.title}` : `Step ${i + 1}: ${JSON.stringify(s)}`;
      return t + (s.description ? `\n   ${s.description}` : "");
    }).join("\n\n");
    return p.description ? `${p.description}\n\n${steps}` : steps;
  }
  return JSON.stringify(data, null, 2);
}

export function PlanContent({ content }: PlanContentProps) {
  const [copied, setCopied] = useState(false);
  const parsed = typeof content === "string" ? JSON.parse(content) : content;

  const handleCopy = async () => {
    const text = getPlanText(parsed);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps: PlanStep[] = Array.isArray(parsed) ? parsed : parsed.steps ?? [];
  const description = !Array.isArray(parsed) ? parsed.description : undefined;

  return (
    <div className="relative group">
      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6 bg-zinc-900/80 hover:bg-zinc-800 text-white/60 hover:text-white" aria-label={copied ? "Copied!" : "Copy plan"}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="space-y-2 pr-6">
        {description && <div className="mb-2 text-xs">{description}</div>}
        {steps.map((step, i) => (
          <div key={i} className="pl-3 border-l-2 border-primary/30">
            {step.title && <div className="font-medium text-xs">{Array.isArray(parsed) ? `${i + 1}. ` : `Step ${i + 1}: `}{step.title}</div>}
            {step.description && <div className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{step.description}</div>}
            {!step.title && !step.description && <div className="text-xs">{typeof step === "string" ? step : JSON.stringify(step)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

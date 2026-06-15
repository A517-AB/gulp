import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/ui/button.tsx";
interface PlanContentProps {
    content: unknown;
}

interface PlanStepObject {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

type PlanStep = string | PlanStepObject;

interface NormalizedPlanContent {
  description?: string | undefined;
  steps: PlanStep[];
  usesNumberedLabels: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePlanContent(content: unknown): unknown {
  if (typeof content !== "string") {
    return content;
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    return content;
  }
}

function normalizePlanStep(step: unknown): PlanStep {
  if (typeof step === "string") {
    return step;
  }

  if (isRecord(step)) {
    return step;
  }

  return JSON.stringify(step);
}

function normalizePlanContent(data: unknown): NormalizedPlanContent | null {
  if (Array.isArray(data)) {
    return {
      steps: data.map(normalizePlanStep),
      usesNumberedLabels: true,
    };
  }

  if (isRecord(data) && Array.isArray(data["steps"])) {
    return {
      description: typeof data["description"] === "string" ? data["description"] : undefined,
      steps: data["steps"].map(normalizePlanStep),
      usesNumberedLabels: false,
    };
  }

  return null;
}

function getStepTitle(step: PlanStep): string | undefined {
  if (typeof step === "string") {
    return undefined;
  }

  return typeof step.title === "string" ? step.title : undefined;
}

function getStepDescription(step: PlanStep): string | undefined {
  if (typeof step === "string") {
    return undefined;
  }

  return typeof step.description === "string" ? step.description : undefined;
}

function stringifyPlanStep(step: PlanStep): string {
  return typeof step === "string" ? step : JSON.stringify(step);
}

function formatStepHeading(step: PlanStep, index: number, usesNumberedLabels: boolean): string {
  const title = getStepTitle(step);
  if (title) {
    return usesNumberedLabels
      ? String(index + 1) + ". " + title
      : "Step " + String(index + 1) + ": " + title;
  }

  return usesNumberedLabels
    ? String(index + 1) + ". " + stringifyPlanStep(step)
    : "Step " + String(index + 1) + ": " + stringifyPlanStep(step);
}

function getPlanText(data: unknown): string {
  const normalized = normalizePlanContent(data);
  if (!normalized) {
    return JSON.stringify(data, null, 2);
  }

  const steps = normalized.steps
    .map((step, index) => {
      const heading = formatStepHeading(step, index, normalized.usesNumberedLabels);
      const description = getStepDescription(step);
      return description ? heading + "\n   " + description : heading;
    })
    .join("\n\n");

  return normalized.description ? normalized.description + "\n\n" + steps : steps;
}

export function PlanContent({ content }: PlanContentProps) {
  const [copied, setCopied] = useState(false);
  const parsed = parsePlanContent(content);
  const normalized = normalizePlanContent(parsed);

  const handleCopy = async () => {
    const text = getPlanText(parsed);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }

    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleCopyClick = () => {
    void handleCopy();
  };

  if (!normalized) {
    return <pre className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded">{JSON.stringify(parsed, null, 2)}</pre>;
  }

  const { description, steps, usesNumberedLabels } = normalized;

  return (
    <div className="relative group">
      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" onClick={handleCopyClick} className="h-6 w-6 bg-zinc-900/80 hover:bg-zinc-800 text-white/60 hover:text-white" aria-label={copied ? "Copied!" : "Copy plan"}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="space-y-2 pr-6">
        {description && <div className="mb-2 text-xs">{description}</div>}
        {steps.map((step, i) => (
          <div key={i} className="pl-3 border-l-2 border-primary/30">
            {getStepTitle(step) && <div className="font-medium text-xs">{formatStepHeading(step, i, usesNumberedLabels)}</div>}
            {getStepDescription(step) && <div className="text-fg-muted text-[11px] mt-0.5 leading-relaxed">{getStepDescription(step)}</div>}
            {!getStepTitle(step) && !getStepDescription(step) && <div className="text-xs">{stringifyPlanStep(step)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

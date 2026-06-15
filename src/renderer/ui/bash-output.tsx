
import { CodeBlock } from "./code-block";

interface BashOutputProps {
  output: string;
  className?: string;
}

export function BashOutput({ output, className }: BashOutputProps) {
  return (
    <div className={className}>
      <CodeBlock code={output} language="bash" />
    </div>
  );
}


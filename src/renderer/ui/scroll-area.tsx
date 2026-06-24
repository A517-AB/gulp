import * as React from "react";
import { cn } from "@/utils";

function ScrollArea({className, children, ref, ...props}: React.ComponentProps<'div'>) {
  return (
      <div
          ref={ref}
      data-slot="scroll-area"
          className={cn("overflow-y-auto", className)}
      {...props}
    >
          {children}
      </div>
  );
}

export {ScrollArea};

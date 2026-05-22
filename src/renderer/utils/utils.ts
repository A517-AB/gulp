import { clsx, type ClassValue } from "clsx";
import { twJoin, twMerge } from "tailwind-merge";

/** For merging with an outside className prop */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** For internal-only classes — faster, no conflict resolution */
export function cx(...inputs: ClassValue[]) {
  return twJoin(clsx(inputs));
}
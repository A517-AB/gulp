import type {Action} from "kbar";

export type ActionSection =
    | "Navigation"
    | "Sessions"
    | "Fleet"
    | "Tools"
    | "System";

export interface AppAction extends Omit<Action, "section"> {
    section?: ActionSection;
}

// All global actions live here. Page-level or dynamic actions use registerPageActions().
// Navigation actions are registered in CommandPalette directly (they need useNavigate).
// Everything else goes in the arrays below.

export const systemActions: AppAction[] = [];

export const fleetActions: AppAction[] = [];

export const sessionActions: AppAction[] = [];

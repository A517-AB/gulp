import type {Dispatch, FC, ReactNode, SetStateAction, SVGProps, SyntheticEvent} from "react";
import type {Activity, Session, Source} from "./jules";

export type { Activity, Session, Source };

export type ActivityType = Activity["type"];
export type ActivityRole = Activity["originator"];
export type SessionStatus = Session["state"];

// Consecutive agent progress activities collapse into an array for grouped rendering
export type ActivityGroup = Activity | Activity[];

export interface SessionStatusInfo {
  color: string;
  bgColor: string;
  label: string;
  icon: string;
}

// Shared shape used by NewSessionDialog and the layout when pre-filling a workspace
export interface SessionInitialValues {
  sourceId?: string;
  title?: string;
  prompt?: string;
  startingBranch?: string;
}

// ---- Smart Action / Automation Types ---- doesn't work ignroe it

export type ActionDestination = "current_session" | "new_session";

export interface QuickActionTemplate {
  id: string;
  label: string;
  description?: string;
  icon?: FC<SVGProps<SVGSVGElement>>;
  defaultPrompt: string;
  allowedDestinations: ActionDestination[];
  /** If true, this action is only available when the workspace is completely finished */
  requiresCompletedSession?: boolean;
  /** Pass this flag to the new workspace to natively trigger a PR */
  autoCreatePr?: boolean;
}

// ---- Component props ----

export interface ActivityFeedProps {
  session: Session;
  onArchive?: () => void;
  onNewSession?: () => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
}

export interface SessionListProps {
  onSelectSession: (session: Session) => void;
  selectedSessionId?: string;
}

export interface CodeDiffSidebarProps {
  activities: Activity[];
  repoUrl?: string;
}

export interface NewSessionDialogProps {
  onSessionCreated?: () => void;
  initialValues?: SessionInitialValues;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface PlanContentProps {
  content: unknown;
}

// ---- Session list hook ----

export interface UseSessionListReturn {
  sessions: Session[];
  allSessions: Session[];
  error: string | null;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  loadSessions: () => Promise<void>;
}

// ---- New workspace form hook ----

export interface SessionFormData {
  sourceId: string;
  title: string;
  prompt: string;
  startingBranch: string;
  autoCreatePr: boolean;
}

export interface UseNewSessionFormProps {
  open: boolean;
  initialValues?: SessionInitialValues;
  onSessionCreated?: () => void;
  onClose: () => void;
}

export interface UseNewSessionFormReturn {
  sources: Source[];
  branches: string[];
  formData: SessionFormData;
  setFormData: Dispatch<SetStateAction<SessionFormData>>;
  error: string | null;
  handleSubmit: (e: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}


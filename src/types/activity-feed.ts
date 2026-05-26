import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import type { Activity, Session, Source } from "./jules";

export type { Activity, Session, Source };

export type ActivityType = Activity["type"];
export type ActivityRole = Activity["role"];
export type SessionStatus = Session["status"];

// Consecutive agent progress activities collapse into an array for grouped rendering
export type ActivityGroup = Activity | Activity[];

export interface SessionStatusInfo {
  color: string;
  bgColor: string;
  label: string;
  icon: string;
}

// Shared shape used by NewSessionDialog and the layout when pre-filling a session
export interface SessionInitialValues {
  sourceId?: string;
  title?: string;
  prompt?: string;
  startingBranch?: string;
}

// ---- Component props ----

export interface ActivityFeedProps {
  session: Session;
  onArchive?: () => void;
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
  content: string | object;
}

// ---- Session list hook ----

export interface UseSessionListReturn {
  sessions: Session[];
  allSessions: Session[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  loadSessions: () => Promise<void>;
}

// ---- New session form hook ----

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
  formData: SessionFormData;
  setFormData: Dispatch<SetStateAction<SessionFormData>>;
  loading: boolean;
  error: string | null;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

// ---- Activity feed hook contract ----

export interface UseActivityFeedApiProps {
  session: Session;
  onActivitiesChange?: (activities: Activity[]) => void;
}

export interface UseActivityFeedApiReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  approvingPlan: boolean;
  newActivityIds: Set<string>;
  loadActivities: (isInitialLoad?: boolean) => Promise<void>;
  handleApprovePlan: () => Promise<void>;
  handleSendMessage: (message: string) => Promise<void>;
  handleQuickReview: () => Promise<void>;
}

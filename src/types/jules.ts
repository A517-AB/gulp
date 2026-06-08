export interface Source {
  id: string;
  name: string;
  type: "github";
  metadata?: Record<string, unknown>;
}

export type SessionStatus =
  | "queued"
  | "planning"
  | "awaitingApproval"
  | "awaitingFeedback"
  | "active"
  | "paused"
  | "completed"
  | "failed"

export interface Session {
  id: string;
  sourceId: string;
  title: string;
  status: SessionStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  branch?: string;
}

export type ActivityType = "message" | "plan" | "progress" | "result" | "error"

export interface Activity {
  id: string;
  sessionId: string;
  type: "message" | "plan" | "progress" | "result" | "error";
  role: "user" | "agent";
  content: string;
  diff?: string;
  bashOutput?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSessionRequest {
  sourceId: string;
  prompt: string;
  title?: string;
  startingBranch?: string;
  autoCreatePr?: boolean;
  requireApproval?: boolean;
}

export interface CreateActivityRequest {
  sessionId: string;
  content: string;
  type?: "message";
}

export interface FleetTask {
  folder: string;
  topic: string;
  task: string;
  followUps?: { topic: string; task: string }[];
}

export interface FleetTaskGroup {
  group: string;
  repo: string;
  baseBranch?: string;
  tasks: FleetTask[];
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  title?: string;
  isFavorite?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

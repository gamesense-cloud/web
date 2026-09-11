import type { Role } from "./permissions";

export type BuildStatus = "undetected" | "updating" | "detected";
export type Plan = "trial" | "week" | "month" | "lifetime";
export type SubStatus = "active" | "expired" | "paused";
export type ResetStatus = "pending" | "approved" | "denied";
export type TicketStatus = "open" | "answered" | "closed";
export type Priority = "low" | "normal" | "high";
export type NoticeLevel = "info" | "warn" | "bad";

/** What the browser is allowed to know about an account. Never the hash. */
export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  displayName: string | null;
  region: string;
  lastSeenAt: string | null;
  bannedAt: string | null;
  createdAt: string;
}

export interface AccountUser extends PublicUser {
  email: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  mode: string;
}

export interface Build {
  id: string;
  version: string;
  status: BuildStatus;
  notes: string;
  byteSize: number;
  isCurrent: boolean;
  releasedAt: string;
  releasedBy: string | null;
  productName: string;
  productMode: string;
  downloadable?: boolean;
  downloadCount?: number;
}

export interface Subscription {
  id: string;
  plan: Plan;
  status: SubStatus;
  startedAt: string;
  expiresAt: string | null;
  daysLeft: number | null;
  productName: string;
  productMode: string;
}

export interface Hwid {
  id: string;
  hwid: string;
  label: string | null;
  boundAt: string;
  releasedAt: string | null;
}

export interface HwidReset {
  id: string;
  reason: string;
  status: ResetStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  note: string | null;
  username?: string;
  userId?: string;
  hwid?: string | null;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  message: string;
  scope: "user" | "service";
  at: string;
  subject?: string | null;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  userId: string;
  username: string;
  messageCount: number;
  lastBody: string | null;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  body: string;
  createdAt: string;
  author: string;
  authorRole: Role;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: NoticeLevel;
  at: string;
  author: string | null;
}

export interface LoaderSession {
  id: string;
  ip: string | null;
  userAgent: string | null;
  at: string;
}

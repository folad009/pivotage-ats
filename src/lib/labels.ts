import type {
  ApplicationStatus,
  ClientStatus,
  EmploymentType,
  InterviewStatus,
  InterviewType,
  JobStatus,
  Recommendation,
  StageType,
} from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const CLIENT_STATUS_VARIANTS: Record<ClientStatus, BadgeVariant> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  ARCHIVED: "outline",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  ON_HOLD: "On hold",
  CLOSED: "Closed",
  FILLED: "Filled",
};

export const JOB_STATUS_VARIANTS: Record<JobStatus, BadgeVariant> = {
  DRAFT: "secondary",
  OPEN: "default",
  ON_HOLD: "outline",
  CLOSED: "destructive",
  FILLED: "secondary",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
  INTERNSHIP: "Internship",
};

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  SOURCED: "Sourced",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: "Active",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PHONE: "Phone",
  TECHNICAL: "Technical",
  ONSITE: "Onsite",
  FINAL: "Final",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  STRONG_YES: "Strong yes",
  YES: "Yes",
  NO: "No",
  STRONG_NO: "Strong no",
};

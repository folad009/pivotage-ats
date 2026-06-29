import { ApplicationStatus, type Prisma, type StageType } from "@prisma/client";

/** Where clause excluding archived applications from active views. */
export const EXCLUDE_ARCHIVED_FILTER: Prisma.ApplicationWhereInput = {
  status: { not: ApplicationStatus.ARCHIVED },
};

/** Restores application status from the current pipeline stage after un-archive. */
export function deriveStatusOnRestore(stageType: StageType): ApplicationStatus {
  if (stageType === "HIRED") return ApplicationStatus.HIRED;
  if (stageType === "REJECTED") return ApplicationStatus.REJECTED;
  return ApplicationStatus.ACTIVE;
}

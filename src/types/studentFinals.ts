import type { StudentUpcomingFinal } from "../api";

export type FinalWithSortDate = StudentUpcomingFinal & {
  sortDate: Date | null;
};

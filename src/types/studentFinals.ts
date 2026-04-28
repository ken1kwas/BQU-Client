import type { StudentUpcomingFinal } from "../api/index";

export type FinalWithSortDate = StudentUpcomingFinal & {
  sortDate: Date | null;
};

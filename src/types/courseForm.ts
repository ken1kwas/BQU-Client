export type CourseFormClassTime = {
  start: string;
  end: string;
  day: number;
  room: string;
  frequency: number;
  classType?: number | null;
};

export type GeneratedClassPreview = {
  key: string;
  sourceIndex: number;
  sequence: number;
  dateLabel: string;
  day: number;
  room: string;
  start: string;
  end: string;
  classType: number;
};

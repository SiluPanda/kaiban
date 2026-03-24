export const DEFAULT_STATUS_FLOW = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
] as const;

export type TaskStatus = (typeof DEFAULT_STATUS_FLOW)[number];

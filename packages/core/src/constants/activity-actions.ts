export const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'commented',
  'assigned',
  'status_changed',
  'priority_changed',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

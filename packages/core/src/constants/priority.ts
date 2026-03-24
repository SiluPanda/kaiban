export const PRIORITY_VALUES = ['P0', 'P1', 'P2', 'P3'] as const;

export type Priority = (typeof PRIORITY_VALUES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

export const DEFAULT_PRIORITY: Priority = 'P2';

export const USER_ROLES = ['admin', 'member', 'agent'] as const;

export type UserRole = (typeof USER_ROLES)[number];

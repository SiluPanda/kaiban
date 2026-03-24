export const ACTOR_TYPES = ['human', 'agent'] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];

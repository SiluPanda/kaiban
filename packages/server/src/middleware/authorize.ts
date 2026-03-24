import { type FastifyRequest, type FastifyReply } from 'fastify';
import { error } from '../lib/response';
import { type AuthUser } from './authenticate';

type Role = AuthUser['role'];

export function authorize(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401);
      return reply.send(error('UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403);
      return reply.send(error('FORBIDDEN', 'You are not authorized for this action'));
    }
  };
}

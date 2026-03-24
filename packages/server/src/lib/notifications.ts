import { db } from '@pith/db';
import { notificationChannels } from '@pith/db/schema';
import { eq, and } from 'drizzle-orm';

export type NotificationEvent =
  | 'task.created' | 'task.updated' | 'task.assigned' | 'task.status_changed'
  | 'comment.created'
  | 'session.started' | 'session.ended';

interface TaskEventData {
  task: { id: string; title: string; status: string; priority: string };
  project: { slug: string; name: string };
  actor?: { name: string };
  changes?: Record<string, { from: string; to: string }>;
  comment?: string;
}

export function formatSlackMessage(event: NotificationEvent, data: TaskEventData): object {
  const taskUrl = `${process.env.PITH_WEB_URL || 'http://localhost:5173'}/tasks/${data.task.id}`;
  const actor = data.actor?.name || 'Someone';

  const messages: Record<string, string> = {
    'task.created': `*${actor}* created task in ${data.project.name}\n<${taskUrl}|${data.task.title}> [${data.task.priority}]`,
    'task.updated': `*${actor}* updated <${taskUrl}|${data.task.title}>`,
    'task.assigned': `*${actor}* assigned <${taskUrl}|${data.task.title}>`,
    'task.status_changed': `*${actor}* moved <${taskUrl}|${data.task.title}> to *${data.task.status}*`,
    'comment.created': `*${actor}* commented on <${taskUrl}|${data.task.title}>:\n> ${data.comment || ''}`,
    'session.started': `*${actor}* started an agent session`,
    'session.ended': `*${actor}* ended an agent session`,
  };

  return {
    text: messages[event] || `${event}: ${data.task.title}`,
    blocks: [{
      type: 'section',
      text: { type: 'mrkdwn', text: messages[event] || `${event}: ${data.task.title}` },
    }],
  };
}

export function formatDiscordMessage(event: NotificationEvent, data: TaskEventData): object {
  const taskUrl = `${process.env.PITH_WEB_URL || 'http://localhost:5173'}/tasks/${data.task.id}`;
  const actor = data.actor?.name || 'Someone';

  const descriptions: Record<string, string> = {
    'task.created': `**${actor}** created a task in ${data.project.name}`,
    'task.updated': `**${actor}** updated the task`,
    'task.assigned': `**${actor}** assigned the task`,
    'task.status_changed': `**${actor}** moved to **${data.task.status}**`,
    'comment.created': `**${actor}** commented:\n> ${data.comment || ''}`,
    'session.started': `**${actor}** started an agent session`,
    'session.ended': `**${actor}** ended an agent session`,
  };

  return {
    embeds: [{
      title: data.task.title,
      url: taskUrl,
      description: descriptions[event] || `${event}`,
      color: data.task.priority === 'P0' ? 0xf85149 : data.task.priority === 'P1' ? 0xd29922 : 0x58a6ff,
      fields: [
        { name: 'Priority', value: data.task.priority, inline: true },
        { name: 'Status', value: data.task.status, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function sendNotification(
  projectId: string,
  event: NotificationEvent,
  data: TaskEventData,
): Promise<void> {
  const channels = await db.select().from(notificationChannels).where(
    and(eq(notificationChannels.projectId, projectId), eq(notificationChannels.active, true))
  );

  for (const channel of channels) {
    if (!channel.events.includes(event) && !channel.events.includes('*')) continue;

    const payload = channel.provider === 'slack'
      ? formatSlackMessage(event, data)
      : formatDiscordMessage(event, data);

    // Fire-and-forget
    fetch(channel.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    }).catch(() => {});
  }
}

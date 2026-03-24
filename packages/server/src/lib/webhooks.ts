import crypto from 'node:crypto';
import { db } from '@pith/db';
import { webhooks, webhookDeliveries } from '@pith/db/schema';
import { eq, and } from 'drizzle-orm';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

export type WebhookEvent =
  | 'task.created' | 'task.updated' | 'task.deleted'
  | 'comment.created'
  | 'session.started' | 'session.ended'
  | 'project.created';

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  event: WebhookEvent,
  data: unknown,
  attempt = 1,
): Promise<void> {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  const signature = signPayload(payload, webhook.secret);

  let statusCode: string | undefined;
  let responseBody: string | undefined;
  let success = false;

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pith-Event': event,
        'X-Pith-Signature': `sha256=${signature}`,
        'X-Pith-Delivery': crypto.randomUUID(),
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    statusCode = String(res.status);
    responseBody = await res.text().catch(() => '');
    success = res.ok;
  } catch (err) {
    statusCode = 'error';
    responseBody = err instanceof Error ? err.message : 'Unknown error';
  }

  // Log delivery
  await db.insert(webhookDeliveries).values({
    webhookId: webhook.id,
    event,
    payload: { event, data },
    statusCode,
    responseBody: responseBody?.slice(0, 2000),
    success,
    attempts: attempt,
  });

  // Retry on failure
  if (!success && attempt < MAX_RETRIES) {
    const delay = RETRY_DELAYS[attempt - 1] ?? 30000;
    setTimeout(() => {
      deliverWebhook(webhook, event, data, attempt + 1).catch(() => {});
    }, delay);
  }
}

export async function fireWebhook(projectId: string, event: WebhookEvent, data: unknown): Promise<void> {
  const projectWebhooks = await db.select().from(webhooks).where(
    and(eq(webhooks.projectId, projectId), eq(webhooks.active, true))
  );

  for (const wh of projectWebhooks) {
    if (wh.events.includes(event) || wh.events.includes('*')) {
      // Fire-and-forget — don't block the API response
      deliverWebhook(wh, event, data).catch(() => {});
    }
  }
}

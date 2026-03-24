import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from './provider.js';

// ─── Result wrapper ──────────────────────────────────────────────────────────

export type AiResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  reason: string;
}

async function withAi<T>(fn: (model: any) => Promise<T>): Promise<AiResult<T>> {
  const model = await getModel();
  if (!model) return { ok: false, reason: 'AI not configured' };

  try {
    const data = await fn(model);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'AI call failed' };
  }
}

// ─── Task Decomposition ─────────────────────────────────────────────────────

const subtaskSchema = z.object({
  title: z.string().describe('Short, actionable subtask title'),
  description: z.string().describe('Detailed description of what to do'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).describe('Priority level'),
  estimate: z.string().describe('Time estimate (e.g., "2h", "1d")'),
});

const decompositionSchema = z.object({
  subtasks: z.array(subtaskSchema).min(1).max(20),
  reasoning: z.string().describe('Brief explanation of the decomposition strategy'),
});

export type DecompositionResult = z.infer<typeof decompositionSchema>;

export async function decomposeTask(input: {
  title: string;
  description: string;
  projectContext?: string;
}): Promise<AiResult<DecompositionResult>> {
  return withAi(async (model) => {
    const { object } = await generateObject({
      model,
      schema: decompositionSchema,
      system: `You are a senior engineering lead. Break down tasks into clear, actionable subtasks.
Each subtask should be independently completable. Order subtasks by dependency.
${input.projectContext ? `Project context: ${input.projectContext}` : ''}`,
      prompt: `Break down this task into subtasks:

Title: ${input.title}
Description: ${input.description}`,
    });
    return object;
  });
}

// ─── Smart Triage ────────────────────────────────────────────────────────────

const triageSchema = z.object({
  suggestedPriority: z.enum(['P0', 'P1', 'P2', 'P3']).describe('Suggested priority'),
  suggestedLabels: z.array(z.string()).describe('Suggested labels'),
  reasoning: z.string().describe('Brief explanation of triage decisions'),
});

export type TriageResult = z.infer<typeof triageSchema>;

export async function triageTask(input: {
  title: string;
  description: string;
  availableLabels: string[];
  projectContext?: string;
}): Promise<AiResult<TriageResult>> {
  return withAi(async (model) => {
    const { object } = await generateObject({
      model,
      schema: triageSchema,
      system: `You are a project manager triaging new tasks.
Available labels: ${input.availableLabels.join(', ')}
${input.projectContext ? `Project context: ${input.projectContext}` : ''}

Priority guide: P0=Critical/blocking, P1=High/important, P2=Medium/normal, P3=Low/nice-to-have`,
      prompt: `Triage this task:

Title: ${input.title}
Description: ${input.description}`,
    });
    return object;
  });
}

// ─── Context Assembly ────────────────────────────────────────────────────────

const contextSchema = z.object({
  summary: z.string().describe('2-3 sentence summary of what needs to be done'),
  keyPoints: z.array(z.string()).describe('Key things to know before starting'),
  suggestedApproach: z.string().describe('Recommended approach to completing the task'),
  risks: z.array(z.string()).describe('Potential risks or blockers'),
});

export type ContextResult = z.infer<typeof contextSchema>;

export async function assembleContext(input: {
  task: { title: string; description: string; status: string; priority: string };
  parentTask?: { title: string; description: string } | null;
  subtasks: Array<{ title: string; status: string }>;
  comments: Array<{ body: string; authorType: string }>;
  recentActivity: Array<{ action: string; fieldChanged?: string | null }>;
}): Promise<AiResult<ContextResult>> {
  return withAi(async (model) => {
    const { object } = await generateObject({
      model,
      schema: contextSchema,
      system: 'You are a senior engineer briefing a team member on a task. Be concise and actionable.',
      prompt: `Assemble context for this task:

Task: ${input.task.title} (${input.task.status}, ${input.task.priority})
Description: ${input.task.description}
${input.parentTask ? `Parent: ${input.parentTask.title} - ${input.parentTask.description}` : ''}
${input.subtasks.length > 0 ? `Subtasks: ${input.subtasks.map(s => `${s.title} (${s.status})`).join(', ')}` : ''}
${input.comments.length > 0 ? `Recent comments: ${input.comments.slice(-3).map(c => c.body).join('\n')}` : ''}
${input.recentActivity.length > 0 ? `Activity: ${input.recentActivity.slice(-5).map(a => `${a.action}${a.fieldChanged ? ` (${a.fieldChanged})` : ''}`).join(', ')}` : ''}`,
    });
    return object;
  });
}

// ─── Effort Estimation ───────────────────────────────────────────────────────

const estimationSchema = z.object({
  estimate: z.string().describe('Time estimate (e.g., "4h", "2d", "1w")'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence level'),
  reasoning: z.string().describe('Brief explanation of the estimate'),
});

export type EstimationResult = z.infer<typeof estimationSchema>;

export async function estimateEffort(input: {
  title: string;
  description: string;
  historicalTasks?: Array<{ title: string; estimate: string | null }>;
}): Promise<AiResult<EstimationResult>> {
  return withAi(async (model) => {
    const examples = (input.historicalTasks ?? [])
      .filter(t => t.estimate)
      .slice(0, 5)
      .map(t => `- "${t.title}" → ${t.estimate}`)
      .join('\n');

    const { object } = await generateObject({
      model,
      schema: estimationSchema,
      system: `You are an engineering lead estimating task effort.
Use standard time units: hours (h), days (d), weeks (w).
${examples ? `\nHistorical estimates for reference:\n${examples}` : ''}`,
      prompt: `Estimate effort for:

Title: ${input.title}
Description: ${input.description}`,
    });
    return object;
  });
}

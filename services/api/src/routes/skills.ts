/**
 * Skills API Routes
 *
 * CRUD and execution tracking for the skill system.
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as skillService from '../services/skill.service';

const skillRoutes = new Hono();

skillRoutes.use('*', requireAuth);

// GET /skills - List available skills
skillRoutes.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const category = c.req.query('category') as skillService.SkillCategory | undefined;

    const skills = await skillService.listSkills({
        userId,
        category,
        includeSystem: true,
    });

    return c.json({ skills });
});

// GET /skills/:id - Get skill details with analytics
skillRoutes.get('/:id', async (c) => {
    const skillId = c.req.param('id');
    const [skill, analytics] = await Promise.all([
        skillService.getSkill(skillId),
        skillService.getSkillAnalytics(skillId),
    ]);

    if (!skill) return c.json({ error: 'Skill not found' }, 404);

    return c.json({ skill, analytics });
});

// POST /skills - Create a custom skill
skillRoutes.post('/', async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();

    const skill = await skillService.createSkill({
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        toolConfig: body.toolConfig || {},
        guardPolicy: body.guardPolicy || {},
        category: body.category || 'personal',
        createdBy: userId,
    });

    return c.json({ skill }, 201);
});

// PATCH /skills/:id - Update a skill
skillRoutes.patch('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const skillId = c.req.param('id');
    const body = await c.req.json();

    const existing = await skillService.getSkill(skillId);
    if (!existing) return c.json({ error: 'Skill not found' }, 404);
    if (existing.isSystem || (existing.createdBy && existing.createdBy !== userId)) {
        return c.json({ error: 'Cannot modify this skill' }, 403);
    }

    const skill = await skillService.updateSkill(skillId, body);
    return c.json({ skill });
});

// DELETE /skills/:id - Delete a custom skill
skillRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const skillId = c.req.param('id');

    const existing = await skillService.getSkill(skillId);
    if (!existing) return c.json({ error: 'Skill not found' }, 404);
    if (existing.isSystem || (existing.createdBy && existing.createdBy !== userId)) {
        return c.json({ error: 'Cannot delete this skill' }, 403);
    }

    await skillService.deleteSkill(skillId);
    return c.json({ success: true });
});

// POST /skills/:id/execute - Record a skill execution
skillRoutes.post('/:id/execute', async (c) => {
    const userId = c.get('userId') as string;
    const skillId = c.req.param('id');
    const body = await c.req.json();

    const execution = await skillService.recordExecution({
        skillId,
        userId,
        chatId: body.chatId,
        input: body.input,
        output: body.output,
        success: body.success ?? true,
        durationMs: body.durationMs ?? 0,
    });

    return c.json({ execution }, 201);
});

// POST /skills/:id/feedback - Rate a skill execution
skillRoutes.post('/executions/:executionId/feedback', async (c) => {
    const body = await c.req.json();
    const executionId = c.req.param('executionId');

    const execution = await skillService.recordFeedback(executionId, body.rating);
    return c.json({ execution });
});

// GET /skills/:id/executions - Get execution history
skillRoutes.get('/:id/executions', async (c) => {
    const userId = c.get('userId') as string;
    const skillId = c.req.param('id');

    const executions = await skillService.getSkillExecutions(skillId, { userId });
    return c.json({ executions });
});

export default skillRoutes;

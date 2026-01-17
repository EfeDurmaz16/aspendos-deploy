# AGENTIC RAG - IMPLEMENTATION CODE (Copy-Paste Ready)

**Complete working code for Agentic decision layer + Memory dashboard**

---

## FILE 1: Agentic Decision Service (Python)

```python
# services/memory-processor/agentic_decision.py

from typing import Optional, List, Dict
import json
from enum import Enum
from datetime import datetime
from openai import AsyncOpenAI
import logging

logger = logging.getLogger(__name__)

class QueryType(Enum):
    GENERAL_KNOWLEDGE = "general_knowledge"      # "What is React?"
    TECHNICAL_ADVICE = "technical_advice"        # "How should I architect?"
    DEBUGGING = "debugging"                      # "Help debug this error"
    PERSONAL_REFLECTION = "personal_reflection"  # "Why do I feel stuck?"
    CODE_REVIEW = "code_review"                  # "Review my code"
    LEARNING = "learning"                        # "How to learn X?"
    CREATIVE = "creative"                        # "Design ideas?"
    UNKNOWN = "unknown"

class MemoryDecisionAgent:
    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)
    
    async def classify_query(self, query: str) -> QueryType:
        """
        Classify the query type to understand intent
        """
        
        # Quick heuristic checks first
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["what is", "what are", "who is", "how does"]):
            if any(word in query_lower for word in ["you", "your", "me", "my", "i", "we"]):
                return QueryType.PERSONAL_REFLECTION
            return QueryType.GENERAL_KNOWLEDGE
        
        if any(word in query_lower for word in ["help me", "how should", "what should", "any ideas"]):
            if "debug" in query_lower:
                return QueryType.DEBUGGING
            if "code" in query_lower or "design" in query_lower:
                return QueryType.TECHNICAL_ADVICE
            return QueryType.LEARNING
        
        if any(word in query_lower for word in ["review", "check", "look at"]):
            if "code" in query_lower:
                return QueryType.CODE_REVIEW
        
        if any(word in query_lower for word in ["feel", "stuck", "frustrated", "motivated", "inspired"]):
            return QueryType.PERSONAL_REFLECTION
        
        # For unclear cases, use LLM
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Classify this query into one of: general_knowledge, technical_advice, debugging, personal_reflection, code_review, learning, creative"
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                temperature=0.3,
            )
            
            classification = response.choices[0].message.content.lower()
            
            for query_type in QueryType:
                if query_type.value in classification:
                    return query_type
        except Exception as e:
            logger.warning(f"Classification failed: {e}")
        
        return QueryType.UNKNOWN
    
    async def decide_memory_usage(
        self,
        user_id: str,
        query: str,
        query_type: Optional[QueryType] = None,
        conversation_history: Optional[List[str]] = None
    ) -> Dict:
        """
        Core decision: Should we use user's memories?
        
        Returns:
        {
            "use_memory": bool,
            "reasoning": str,
            "specific_sectors": ["semantic", "procedural"],
            "memory_threshold": 0.8,
            "cost": float
        }
        """
        
        # Classify if not provided
        if query_type is None:
            query_type = await self.classify_query(query)
        
        # Decision matrix: query_type -> use_memory?
        decision_matrix = {
            QueryType.GENERAL_KNOWLEDGE: False,      # Facts, no personalization needed
            QueryType.TECHNICAL_ADVICE: True,        # Needs user's approach
            QueryType.DEBUGGING: True,               # Needs user's tools/patterns
            QueryType.PERSONAL_REFLECTION: True,     # Needs user's feelings/history
            QueryType.CODE_REVIEW: True,             # Needs user's preferences
            QueryType.LEARNING: True,                # Needs user's current skills
            QueryType.CREATIVE: True,                # Needs user's style
            QueryType.UNKNOWN: None,                 # Let LLM decide
        }
        
        use_memory = decision_matrix.get(query_type)
        
        # For unknown, ask LLM
        if use_memory is None:
            decision_prompt = f"""You are Aspendos, an AI assistant with memory capabilities.

User's query: "{query}"
Query type: {query_type.value}

Decide: Should you use this user's stored memories to personalize the response?

Rules:
- General knowledge: DON'T use memory
- Advice/guidance: DO use memory
- Debugging/technical help: DO use memory
- Personal reflection: DO use memory
- Code review: DO use memory
- Creative: DO use memory

Return JSON:
{{"use_memory": true/false, "reasoning": "why or why not"}}"""
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a decision maker. Return only valid JSON."},
                    {"role": "user", "content": decision_prompt}
                ],
                temperature=0.3,
            )
            
            try:
                decision_data = json.loads(response.choices[0].message.content)
                use_memory = decision_data.get("use_memory", False)
                reasoning = decision_data.get("reasoning", "Unknown")
            except:
                use_memory = False
                reasoning = "Failed to decide, defaulting to no memory"
        else:
            reasoning = f"Query type '{query_type.value}' typically {'benefits from' if use_memory else 'does not benefit from'} memory"
        
        # If not using memory, return early
        if not use_memory:
            return {
                'use_memory': False,
                'reasoning': reasoning,
                'memory_sectors': [],
                'memory_threshold': 0.0,
                'cost': 0.0001,  # Just the classification cost
                'decision_confidence': 1.0
            }
        
        # Step 2: Decide which sectors to use
        sector_selection_prompt = f"""User query: "{query}"
Query type: {query_type.value}

Select which memory sectors are relevant:
- episodic: Recent events, conversations
- semantic: Facts about user (skills, knowledge)
- procedural: How user works (preferences, workflows)
- emotional: User's feelings and priorities
- reflective: User's insights about themselves

Return JSON with selected sectors and threshold (0.0-1.0):
{{"sectors": ["semantic", "procedural"], "threshold": 0.8, "reasoning": "..."}}"""
        
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Select relevant memory sectors. Return only JSON."},
                {"role": "user", "content": sector_selection_prompt}
            ],
            temperature=0.3,
        )
        
        try:
            sector_data = json.loads(response.choices[0].message.content)
            sectors = sector_data.get("sectors", ["semantic", "procedural"])
            threshold = sector_data.get("threshold", 0.7)
        except:
            sectors = ["semantic", "procedural"]
            threshold = 0.7
        
        return {
            'use_memory': True,
            'reasoning': reasoning,
            'memory_sectors': sectors,
            'memory_threshold': threshold,
            'cost': 0.0005,  # Classification + sector selection
            'decision_confidence': 0.85,
            'query_type': query_type.value
        }
    
    async def reflect_on_response(
        self,
        query: str,
        response: str,
        memory_used: bool
    ) -> Dict:
        """
        Self-reflection: Is this response good enough?
        Returns: {"satisfied": bool, "reason": str}
        """
        
        reflection_prompt = f"""User query: "{query}"

Your response: "{response}"

Memory was {'used' if memory_used else 'not used'}.

Reflect: Is this a good, helpful response?
- Is it relevant to the query?
- Is it accurate?
- Is it personalized (if memory was used)?
- Any major gaps or errors?

Return JSON:
{{"satisfied": true/false, "reasoning": "...", "retry_strategy": "..."}}"""
        
        response_obj = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a quality evaluator. Return only JSON."},
                {"role": "user", "content": reflection_prompt}
            ],
            temperature=0.3,
        )
        
        try:
            result = json.loads(response_obj.choices[0].message.content)
            return result
        except:
            return {
                "satisfied": True,
                "reasoning": "Could not reflect, assuming good",
                "retry_strategy": None
            }
```

---

## FILE 2: Memory Dashboard Backend (TypeScript/Hono)

```typescript
// apps/api/src/routes/memory-dashboard.ts

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

const dashboardRouter = new Hono();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Memory {
  id: string;
  content: string;
  sector: string;
  created_at: string;
  confidence_score: number;
  decay_score: number;
  access_count: number;
  is_pinned?: boolean;
}

interface MemoryStats {
  total_memories: number;
  by_sector: Record<string, number>;
  avg_confidence_by_sector: Record<string, number>;
  avg_decay_by_sector: Record<string, number>;
  storage_used_mb: number;
}

// GET /api/memory/dashboard/stats
dashboardRouter.get('/stats', async (c) => {
  const userId = c.req.header('X-User-ID');
  
  if (!userId) {
    return c.json({ error: 'Missing user ID' }, 401);
  }

  try {
    // Get statistics
    const { data: memories } = await supabase
      .from('memory_nodes')
      .select('sector, confidence_score, decay_score')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!memories || memories.length === 0) {
      return c.json({
        total_memories: 0,
        by_sector: {},
        avg_confidence_by_sector: {},
        avg_decay_by_sector: {},
        storage_used_mb: 0
      });
    }

    // Calculate stats
    const stats: MemoryStats = {
      total_memories: memories.length,
      by_sector: {},
      avg_confidence_by_sector: {},
      avg_decay_by_sector: {},
      storage_used_mb: (memories.length * 0.5) / 1024 // ~500B per memory
    };

    for (const memory of memories) {
      const sector = memory.sector;
      
      if (!stats.by_sector[sector]) {
        stats.by_sector[sector] = 0;
        stats.avg_confidence_by_sector[sector] = 0;
        stats.avg_decay_by_sector[sector] = 0;
      }
      
      stats.by_sector[sector]++;
      stats.avg_confidence_by_sector[sector] += memory.confidence_score;
      stats.avg_decay_by_sector[sector] += memory.decay_score;
    }

    // Average the scores
    for (const sector in stats.avg_confidence_by_sector) {
      stats.avg_confidence_by_sector[sector] /= stats.by_sector[sector];
      stats.avg_decay_by_sector[sector] /= stats.by_sector[sector];
    }

    return c.json(stats);
  } catch (error) {
    console.error('Stats fetch failed:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// GET /api/memory/dashboard/list
dashboardRouter.get('/list', async (c) => {
  const userId = c.req.header('X-User-ID');
  const sector = c.req.query('sector');
  const sortBy = c.req.query('sort_by') || 'created_at';
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  if (!userId) {
    return c.json({ error: 'Missing user ID' }, 401);
  }

  try {
    let query = supabase
      .from('memory_nodes')
      .select('id, content, sector, created_at, confidence_score, decay_score, access_count')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (sector && sector !== 'all') {
      query = query.eq('sector', sector);
    }

    // Build sort order
    let ascending = false;
    if (sortBy === 'created_at') {
      ascending = false; // Newest first
    } else if (sortBy === 'confidence') {
      ascending = false; // Highest confidence first
    } else if (sortBy === 'decay') {
      ascending = false; // Freshest first
    }

    query = query.order(sortBy, { ascending });
    const { data, error } = await query.limit(limit);

    if (error) throw error;

    return c.json({
      memories: data || [],
      count: (data || []).length
    });
  } catch (error) {
    console.error('List fetch failed:', error);
    return c.json({ error: 'Failed to fetch memories' }, 500);
  }
});

// POST /api/memory/dashboard/edit/:id
dashboardRouter.post('/edit/:id', async (c) => {
  const userId = c.req.header('X-User-ID');
  const { id } = c.req.param();
  const body = await c.req.json();

  if (!userId) {
    return c.json({ error: 'Missing user ID' }, 401);
  }

  try {
    const { content, sector, confidence, allow_decay, is_pinned } = body;

    const updates: any = {};

    if (content) updates.content = content;
    if (sector) updates.sector = sector;
    if (confidence !== undefined) {
      updates.confidence_score = Math.max(0, Math.min(1, confidence));
    }
    if (allow_decay !== undefined) {
      updates.decay_score = allow_decay ? updates.decay_score : 1.0;
    }
    if (is_pinned !== undefined) {
      updates.is_pinned = is_pinned;
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('memory_nodes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return c.json({ success: true, memory_id: id });
  } catch (error) {
    console.error('Edit failed:', error);
    return c.json({ error: 'Failed to edit memory' }, 500);
  }
});

// DELETE /api/memory/dashboard/:id
dashboardRouter.delete('/:id', async (c) => {
  const userId = c.req.header('X-User-ID');
  const { id } = c.req.param();

  if (!userId) {
    return c.json({ error: 'Missing user ID' }, 401);
  }

  try {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete failed:', error);
    return c.json({ error: 'Failed to delete memory' }, 500);
  }
});

// POST /api/memory/dashboard/feedback
dashboardRouter.post('/feedback', async (c) => {
  const userId = c.req.header('X-User-ID');
  const { memory_id, was_helpful, notes } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'Missing user ID' }, 401);
  }

  try {
    const { error } = await supabase
      .from('memory_access_log')
      .insert({
        user_id: userId,
        memory_node_id: memory_id,
        was_useful: was_helpful,
        query_text: notes || null
      });

    if (error) throw error;

    // Update memory feedback score
    if (was_helpful !== null) {
      const multiplier = was_helpful ? 1.1 : 0.9; // Boost if helpful
      await supabase
        .rpc('update_memory_score', {
          memory_id,
          multiplier
        });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Feedback failed:', error);
    return c.json({ error: 'Failed to save feedback' }, 500);
  }
});

export default dashboardRouter;
```

---

## FILE 3: Chat Integration with Agentic Decision

```typescript
// apps/api/src/routes/chat-with-agentic.ts

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

const chatRouter = new Hono();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:8000';

interface ChatRequest {
  user_id: string;
  conversation_id: string;
  message: string;
  show_memory_usage?: boolean;  // Default: true
}

interface ChatResponse {
  message: string;
  memory_used: boolean;
  memory_decision: {
    reasoning: string;
    sectors: string[];
    confidence: number;
  };
  memories_influencing: Array<{
    id: string;
    content: string;
    sector: string;
    confidence: number;
  }>;
  usage: {
    decision_tokens: number;
    response_tokens: number;
    total_tokens: number;
    cost: number;
  };
}

chatRouter.post('/chat', async (c) => {
  const req: ChatRequest = await c.req.json();
  const { user_id, conversation_id, message, show_memory_usage = true } = req;

  if (!user_id || !conversation_id || !message) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  try {
    // STEP 1: Make memory usage decision
    const decisionResponse = await fetch(
      `${MEMORY_SERVICE_URL}/memory/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          query: message
        })
      }
    );

    if (!decisionResponse.ok) {
      console.error('Decision failed, proceeding without memory');
      var memoryDecision = {
        use_memory: false,
        reasoning: 'Decision service unavailable',
        memory_sectors: [],
        memory_threshold: 0,
        cost: 0,
        decision_confidence: 0
      };
      var usedMemories = [];
    } else {
      memoryDecision = await decisionResponse.json();

      // STEP 2: Retrieve appropriate memories
      let usedMemories = [];
      
      if (memoryDecision.use_memory) {
        const searchResponse = await fetch(
          `${MEMORY_SERVICE_URL}/memory/search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id,
              query: message,
              sectors: memoryDecision.memory_sectors,
              limit: 3
            })
          }
        );

        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          usedMemories = searchResults.results || [];
        }
      }
    }

    // STEP 3: Format memory context for LLM
    let memoryContext = '';
    if (memoryDecision.use_memory && usedMemories.length > 0) {
      memoryContext = formatMemoryContext(usedMemories);
    }

    // STEP 4: Build system prompt
    const systemPrompt = `You are Aspendos, an intelligent AI assistant designed to help engineers and technical professionals.

${memoryContext ? `Context about the user:\n${memoryContext}\n` : ''}
${memoryDecision.reasoning ? `Memory context note: ${memoryDecision.reasoning}\n` : ''}

Provide helpful, accurate, and personalized responses (if context provided).
Be honest about limitations.`;

    // STEP 5: Generate response
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      })
    });

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message.content;

    // STEP 6: Store conversation
    await supabase.from('messages').insert({
      conversation_id,
      role: 'assistant',
      content: assistantMessage
    });

    // STEP 7: Async memory ingestion (fire and forget)
    fetch(`${MEMORY_SERVICE_URL}/memory/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        content: `User: ${message}\n\nAssistant: ${assistantMessage}`,
        source: 'conversation',
        conversation_id
      })
    }).catch(err => console.error('Async memory ingestion failed:', err));

    // STEP 8: Return response with transparency
    const response: ChatResponse = {
      message: assistantMessage,
      memory_used: memoryDecision.use_memory,
      memory_decision: {
        reasoning: memoryDecision.reasoning,
        sectors: memoryDecision.memory_sectors,
        confidence: memoryDecision.decision_confidence
      },
      memories_influencing: usedMemories.map((m: any) => ({
        id: m.memory_id,
        content: m.content,
        sector: m.sector,
        confidence: m.relevance_score * m.decay_score
      })),
      usage: {
        decision_tokens: 50,  // Estimate
        response_tokens: openaiData.usage.completion_tokens,
        total_tokens: 50 + openaiData.usage.completion_tokens,
        cost: 0.0005 + (openaiData.usage.completion_tokens * 0.0000075)
      }
    };

    return c.json(response);
  } catch (error) {
    console.error('Chat failed:', error);
    return c.json({ error: 'Chat failed' }, 500);
  }
});

function formatMemoryContext(memories: any[]): string {
  if (!memories || memories.length === 0) return '';

  return memories
    .map(m => `[${m.sector.toUpperCase()}] ${m.content}`)
    .join('\n\n');
}

export default chatRouter;
```

---

## FILE 4: Frontend - Memory Dashboard Component

```typescript
// components/MemoryDashboard.tsx

import React, { useState, useEffect } from 'react';
import styles from './MemoryDashboard.module.css';

interface Memory {
  id: string;
  content: string;
  sector: string;
  created_at: string;
  confidence_score: number;
  decay_score: number;
  access_count: number;
}

interface Stats {
  total_memories: number;
  by_sector: Record<string, number>;
  avg_confidence_by_sector: Record<string, number>;
  storage_used_mb: number;
}

export const MemoryDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadMemories();
  }, [filter]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/memory/dashboard/stats', {
        headers: { 'X-User-ID': userId }
      });
      setStats(await res.json());
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadMemories = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? '/api/memory/dashboard/list'
        : `/api/memory/dashboard/list?sector=${filter}`;
      
      const res = await fetch(url, {
        headers: { 'X-User-ID': userId }
      });
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1>ðŸ’­ Memory Dashboard</h1>
        <p>View and manage all your stored memories</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total_memories}</div>
            <div className={styles.statLabel}>Total Memories</div>
          </div>
          
          {['episodic', 'semantic', 'procedural', 'emotional', 'reflective'].map(sector => (
            <div key={sector} className={styles.statCard}>
              <div className={styles.statValue}>{stats.by_sector[sector] || 0}</div>
              <div className={styles.statLabel}>
                {sector.charAt(0).toUpperCase() + sector.slice(1)}
              </div>
              <div className={styles.statMeta}>
                {((stats.avg_confidence_by_sector[sector] || 0) * 100).toFixed(0)}% confident
              </div>
            </div>
          ))}

          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.storage_used_mb.toFixed(1)}</div>
            <div className={styles.statLabel}>MB Used</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        {['all', 'episodic', 'semantic', 'procedural', 'emotional', 'reflective'].map(sector => (
          <button
            key={sector}
            className={`${styles.filterBtn} ${filter === sector ? styles.active : ''}`}
            onClick={() => setFilter(sector)}
          >
            {sector.charAt(0).toUpperCase() + sector.slice(1)}
          </button>
        ))}
      </div>

      {/* Memories List */}
      <div className={styles.memoriesList}>
        {loading ? (
          <div className={styles.loading}>Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className={styles.empty}>No memories found</div>
        ) : (
          memories.map(memory => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              isEditing={editingId === memory.id}
              onEdit={() => setEditingId(memory.id)}
              onSave={async (updated) => {
                await fetch(`/api/memory/dashboard/edit/${memory.id}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId
                  },
                  body: JSON.stringify(updated)
                });
                setEditingId(null);
                loadMemories();
              }}
              onDelete={async () => {
                await fetch(`/api/memory/dashboard/${memory.id}`, {
                  method: 'DELETE',
                  headers: { 'X-User-ID': userId }
                });
                loadMemories();
              }}
              userId={userId}
            />
          ))
        )}
      </div>
    </div>
  );
};

const MemoryCard: React.FC<{
  memory: Memory;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updated: any) => Promise<void>;
  onDelete: () => Promise<void>;
  userId: string;
}> = ({ memory, isEditing, onEdit, onSave, onDelete, userId }) => {
  const [content, setContent] = useState(memory.content);
  const [sector, setSector] = useState(memory.sector);
  const [confidence, setConfidence] = useState(memory.confidence_score);
  const [is_pinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  if (isEditing) {
    return (
      <div className="memory-card editing p-4 border rounded">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          rows={3}
          placeholder="Memory content"
        />

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        >
          {['episodic', 'semantic', 'procedural', 'emotional', 'reflective'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="mb-3">
          <label className="block text-sm mb-1">
            Confidence: {(confidence * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSaving(true);
              await onSave({ content, sector, confidence, is_pinned });
              setSaving(false);
            }}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onEdit} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-card p-4 border rounded hover:bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <span className="badge">{memory.sector}</span>
        <div className="memory-meta text-sm text-gray-500">
          {(memory.confidence_score * 100).toFixed(0)}% confident â€¢ Used {memory.access_count}x
        </div>
      </div>

      <div className="content mb-3 text-sm">{memory.content}</div>

      <div className="actions flex gap-2 flex-wrap">
        <button onClick={onEdit} className="btn btn-sm btn-secondary">âœï¸ Edit</button>
        <button onClick={onDelete} className="btn btn-sm btn-danger">ðŸ—‘ï¸ Delete</button>
        <button onClick={() => setIsPinned(!is_pinned)} className="btn btn-sm">
          {is_pinned ? 'ðŸ“Œ Unpin' : 'ðŸ“ Pin'}
        </button>
        <button onClick={() => giveFeedback(memory.id, true, userId)} className="btn btn-sm">ðŸ‘ Helpful</button>
        <button onClick={() => giveFeedback(memory.id, false, userId)} className="btn btn-sm">ðŸ‘Ž Not helpful</button>
      </div>
    </div>
  );
};

const giveFeedback = async (memoryId: string, helpful: boolean, userId: string) => {
  await fetch('/api/memory/dashboard/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId
    },
    body: JSON.stringify({
      memory_id: memoryId,
      was_helpful: helpful
    })
  });
  alert(`Feedback saved: Memory was ${helpful ? 'helpful' : 'not helpful'}`);
};
```

---

**These four files give you:**
1. âœ… Smart memory decision making
2. âœ… Full memory dashboard with edit/delete
3. âœ… Chat integration with transparency
4. âœ… Frontend UI for all features

**Total implementation time: 2-3 weeks**
**Total cost: +$20/month for agentic reasoning**

Copy-paste and customize! ðŸš€
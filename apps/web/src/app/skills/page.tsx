'use client';

/**
 * Skills Management Page
 *
 * Displays available skills (system + custom) with:
 * - Category filters
 * - Skill cards with usage stats
 * - Execution history
 * - Create custom skill flow
 */

import { useCallback, useEffect, useState } from 'react';

interface Skill {
    id: string;
    name: string;
    description: string;
    category: string;
    isSystem: boolean;
    usageCount: number;
    successRate: number;
    version: number;
}

const CATEGORIES = ['all', 'productivity', 'research', 'creative', 'coding', 'personal'] as const;

export default function SkillsPage() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const fetchSkills = useCallback(async () => {
        try {
            const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
            const res = await fetch(`/api/v1/skills${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSkills(data.skills || []);
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
                    role="status"
                    aria-label="Loading"
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Skills</h1>
                <span className="text-sm text-neutral-500">{skills.length} available</span>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        aria-pressed={selectedCategory === cat}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white/30 ${
                            selectedCategory === cat
                                ? 'bg-white text-black'
                                : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                        }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Skills Grid */}
            {skills.length === 0 ? (
                <p className="text-neutral-500">No skills found in this category.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {skills.map((skill) => (
                        <div
                            key={skill.id}
                            className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium">{skill.name}</h3>
                                {skill.isSystem && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                        System
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                                {skill.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-neutral-500">
                                <span>{skill.usageCount} uses</span>
                                <span>{Math.round(skill.successRate * 100)}% success</span>
                                <span>v{skill.version}</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/5">
                                    {skill.category}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

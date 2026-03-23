'use client';

/**
 * Skills Management Page
 */

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const fetchSkills = useCallback(async () => {
        setError(null);
        try {
            const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
            const res = await fetch(`/api/v1/skills${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSkills(data.skills || []);
            }
        } catch (err) {
            console.error('Failed to fetch skills:', err);
            setError('Failed to load skills. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        fetchSkills();
    }, [fetchSkills]);

    if (loading) {
        return (
            <main
                className="container mx-auto max-w-4xl px-4 py-8 space-y-4"
                aria-busy="true"
                aria-label="Loading skills"
            >
                <Skeleton className="h-8 w-32" />
                <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                            key={`skel-cat-${CATEGORIES[i] || i}`}
                            className="h-8 w-20 rounded-full"
                        />
                    ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={`skel-card-${i}`} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Skills</h1>
                <span className="text-sm text-muted-foreground">{skills.length} available</span>
            </div>

            {error && (
                <Card className="mb-6 border-red-500/30 bg-red-500/5">
                    <CardContent className="p-4" role="alert">
                        <p className="text-sm text-red-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Category Filter */}
            <h2 className="sr-only">Filter by category</h2>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                    <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategory === cat ? 'primary' : 'secondary'}
                        onClick={() => setSelectedCategory(cat)}
                        aria-pressed={selectedCategory === cat}
                        className="rounded-full whitespace-nowrap"
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                ))}
            </div>

            {/* Skills Grid */}
            <h2 className="sr-only">Available skills</h2>
            <div aria-live="polite">
                {skills.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No skills found in this category.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {skills.map((skill) => (
                            <Card key={skill.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-medium">{skill.name}</h3>
                                        {skill.isSystem && <Badge variant="primary">System</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {skill.description}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>
                                            <strong>{skill.usageCount}</strong> uses
                                        </span>
                                        <span>
                                            <strong>{Math.round(skill.successRate * 100)}%</strong>{' '}
                                            success
                                        </span>
                                        <span>v{skill.version}</span>
                                        <Badge variant="tertiary">{skill.category}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

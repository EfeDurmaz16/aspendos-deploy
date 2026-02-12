/**
 * Gamification Service Tests
 *
 * Tests for the XP, level, achievement, and streak systems.
 */
import { describe, expect, it } from 'vitest';
import {
    ACHIEVEMENTS,
    getLevelForXp,
    getNextLevel,
    getXpProgress,
    LEVELS,
    XP_ACTIONS,
} from '../services/gamification.service';

// ==========================================
// LEVEL SYSTEM TESTS
// ==========================================

describe('Level System', () => {
    describe('getLevelForXp', () => {
        it('should return Newcomer (level 1) for 0 XP', () => {
            const level = getLevelForXp(0);
            expect(level.level).toBe(1);
            expect(level.name).toBe('Newcomer');
        });

        it('should return Newcomer for XP below 100', () => {
            expect(getLevelForXp(50).level).toBe(1);
            expect(getLevelForXp(99).level).toBe(1);
        });

        it('should return Explorer (level 2) for 100 XP', () => {
            const level = getLevelForXp(100);
            expect(level.level).toBe(2);
            expect(level.name).toBe('Explorer');
        });

        it('should return Conversationalist (level 3) for 300 XP', () => {
            const level = getLevelForXp(300);
            expect(level.level).toBe(3);
            expect(level.name).toBe('Conversationalist');
        });

        it('should return Power User (level 4) for 700 XP', () => {
            const level = getLevelForXp(700);
            expect(level.level).toBe(4);
            expect(level.name).toBe('Power User');
        });

        it('should return YULA Master (level 5) for 1500 XP', () => {
            const level = getLevelForXp(1500);
            expect(level.level).toBe(5);
            expect(level.name).toBe('YULA Master');
        });

        it('should return AI Whisperer (level 6) for 3000+ XP', () => {
            expect(getLevelForXp(3000).level).toBe(6);
            expect(getLevelForXp(5000).level).toBe(6);
            expect(getLevelForXp(10000).level).toBe(6);
            expect(getLevelForXp(3000).name).toBe('AI Whisperer');
        });

        it('should handle edge cases at level boundaries', () => {
            // Just below threshold
            expect(getLevelForXp(99).level).toBe(1);
            expect(getLevelForXp(299).level).toBe(2);
            expect(getLevelForXp(699).level).toBe(3);
            expect(getLevelForXp(1499).level).toBe(4);
            expect(getLevelForXp(2999).level).toBe(5);

            // Exactly at threshold
            expect(getLevelForXp(100).level).toBe(2);
            expect(getLevelForXp(300).level).toBe(3);
            expect(getLevelForXp(700).level).toBe(4);
            expect(getLevelForXp(1500).level).toBe(5);
            expect(getLevelForXp(3000).level).toBe(6);
        });
    });

    describe('getNextLevel', () => {
        it('should return next level for levels 1-5', () => {
            expect(getNextLevel(1)?.level).toBe(2);
            expect(getNextLevel(2)?.level).toBe(3);
            expect(getNextLevel(3)?.level).toBe(4);
            expect(getNextLevel(4)?.level).toBe(5);
            expect(getNextLevel(5)?.level).toBe(6);
        });

        it('should return null for max level (6)', () => {
            expect(getNextLevel(6)).toBeNull();
        });

        it('should return null for levels beyond max', () => {
            expect(getNextLevel(7)).toBeNull();
            expect(getNextLevel(10)).toBeNull();
        });

        it('should return level 1 for level 0 (edge case)', () => {
            // Level 0 doesn't exist, but getNextLevel(0) finds level 1
            expect(getNextLevel(0)?.level).toBe(1);
        });
    });

    describe('getXpProgress', () => {
        it('should calculate progress within level 1 (0-100)', () => {
            const progress = getXpProgress(50);
            expect(progress.current).toBe(50);
            expect(progress.required).toBe(100);
            expect(progress.percentage).toBe(50);
        });

        it('should calculate progress within level 2 (100-300)', () => {
            const progress = getXpProgress(200);
            expect(progress.current).toBe(100); // 200 - 100 (level 2 minXp)
            expect(progress.required).toBe(200); // 300 - 100
            expect(progress.percentage).toBe(50);
        });

        it('should calculate progress at level boundary', () => {
            const progress = getXpProgress(100);
            expect(progress.current).toBe(0); // Just started level 2
            expect(progress.required).toBe(200);
            expect(progress.percentage).toBe(0);
        });

        it('should return 100% for max level', () => {
            const progress = getXpProgress(5000);
            expect(progress.percentage).toBe(100);
        });

        it('should handle 0 XP', () => {
            const progress = getXpProgress(0);
            expect(progress.current).toBe(0);
            expect(progress.percentage).toBe(0);
        });
    });
});

// ==========================================
// LEVEL CONFIG TESTS
// ==========================================

describe('LEVELS Configuration', () => {
    it('should have 6 levels', () => {
        expect(LEVELS).toHaveLength(6);
    });

    it('should have sequential level numbers', () => {
        LEVELS.forEach((level, index) => {
            expect(level.level).toBe(index + 1);
        });
    });

    it('should have increasing minXp thresholds', () => {
        for (let i = 1; i < LEVELS.length; i++) {
            expect(LEVELS[i].minXp).toBeGreaterThan(LEVELS[i - 1].minXp);
        }
    });

    it('should start with 0 minXp for level 1', () => {
        expect(LEVELS[0].minXp).toBe(0);
    });

    it('should have names and icons for all levels', () => {
        LEVELS.forEach((level) => {
            expect(level.name).toBeTruthy();
            expect(level.icon).toBeTruthy();
        });
    });
});

// ==========================================
// XP ACTIONS TESTS
// ==========================================

describe('XP_ACTIONS Configuration', () => {
    it('should have positive XP values for all actions', () => {
        Object.values(XP_ACTIONS).forEach((action) => {
            expect(action.xp).toBeGreaterThan(0);
        });
    });

    it('should have descriptions for all actions', () => {
        Object.values(XP_ACTIONS).forEach((action) => {
            expect(action.description).toBeTruthy();
        });
    });

    it('should have correct XP values for key actions', () => {
        expect(XP_ACTIONS.send_message.xp).toBe(1);
        expect(XP_ACTIONS.complete_conversation.xp).toBe(5);
        expect(XP_ACTIONS.use_council.xp).toBe(10);
        expect(XP_ACTIONS.import_history.xp).toBe(50);
        expect(XP_ACTIONS.invite_friend.xp).toBe(100);
    });

    it('should have increasing XP for streak milestones', () => {
        expect(XP_ACTIONS.complete_streak_7.xp).toBeLessThan(XP_ACTIONS.complete_streak_30.xp);
        expect(XP_ACTIONS.complete_streak_30.xp).toBeLessThan(XP_ACTIONS.complete_streak_100.xp);
    });
});

// ==========================================
// ACHIEVEMENTS TESTS
// ==========================================

describe('ACHIEVEMENTS Configuration', () => {
    const achievementCodes = Object.keys(ACHIEVEMENTS);
    const achievementValues = Object.values(ACHIEVEMENTS);

    it('should have required fields for all achievements', () => {
        achievementValues.forEach((achievement) => {
            expect(achievement.name).toBeTruthy();
            expect(achievement.description).toBeTruthy();
            expect(achievement.icon).toBeTruthy();
            expect(achievement.category).toBeTruthy();
            expect(typeof achievement.xpReward).toBe('number');
        });
    });

    it('should have valid categories', () => {
        const validCategories = [
            'onboarding',
            'engagement',
            'streaks',
            'mastery',
            'social',
            'secret',
        ];
        achievementValues.forEach((achievement) => {
            expect(validCategories).toContain(achievement.category);
        });
    });

    it('should have positive XP rewards', () => {
        achievementValues.forEach((achievement) => {
            expect(achievement.xpReward).toBeGreaterThanOrEqual(0);
        });
    });

    it('should include onboarding achievements', () => {
        expect(ACHIEVEMENTS.first_steps).toBeDefined();
        expect(ACHIEVEMENTS.first_steps.category).toBe('onboarding');
    });

    it('should include engagement achievements', () => {
        expect(ACHIEVEMENTS.first_chat).toBeDefined();
        expect(ACHIEVEMENTS.chatty).toBeDefined();
        expect(ACHIEVEMENTS.prolific).toBeDefined();
    });

    it('should include streak achievements', () => {
        expect(ACHIEVEMENTS.streak_3).toBeDefined();
        expect(ACHIEVEMENTS.streak_7).toBeDefined();
        expect(ACHIEVEMENTS.streak_30).toBeDefined();
        expect(ACHIEVEMENTS.streak_100).toBeDefined();
        expect(ACHIEVEMENTS.streak_365).toBeDefined();
    });

    it('should include feature mastery achievements', () => {
        expect(ACHIEVEMENTS.council_initiate).toBeDefined();
        expect(ACHIEVEMENTS.council_master).toBeDefined();
        expect(ACHIEVEMENTS.import_pioneer).toBeDefined();
        expect(ACHIEVEMENTS.pac_scheduler).toBeDefined();
    });

    it('should include social achievements', () => {
        expect(ACHIEVEMENTS.first_referral).toBeDefined();
        expect(ACHIEVEMENTS.referral_pro).toBeDefined();
    });

    it('should include secret achievements', () => {
        expect(ACHIEVEMENTS.night_owl).toBeDefined();
        expect(ACHIEVEMENTS.early_bird).toBeDefined();
    });

    it('should have at least 20 achievements', () => {
        expect(achievementCodes.length).toBeGreaterThanOrEqual(20);
    });
});

// ==========================================
// EDGE CASE TESTS
// ==========================================

describe('Edge Cases', () => {
    it('should handle negative XP gracefully', () => {
        const level = getLevelForXp(-100);
        expect(level.level).toBe(1);
    });

    it('should handle very large XP values', () => {
        const level = getLevelForXp(1000000);
        expect(level.level).toBe(6);
        expect(level.name).toBe('AI Whisperer');
    });
});

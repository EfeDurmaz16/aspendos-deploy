/**
 * Privacy Compliance System Tests
 *
 * Comprehensive test coverage for GDPR/CCPA compliance features
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
    type ConsentPurpose,
    clearPrivacy_forTesting,
    generatePrivacyReport,
    getBreachNotificationDeadline,
    getComplianceScore,
    getConsentAuditTrail,
    getConsentStatus,
    getDataBreaches,
    getDataProcessingLog,
    getDataRetentionStatus,
    getDPIAs,
    isConsentValid,
    type LegalBasis,
    recordConsent,
    recordDataBreach,
    recordDataProcessing,
    recordDPIA,
    revokeConsent,
} from '../privacy-compliance';

describe('Privacy Compliance System', () => {
    beforeEach(() => {
        clearPrivacy_forTesting();
    });

    describe('Consent Management', () => {
        it('should record consent with default version', () => {
            const consent = recordConsent('user1', 'analytics', true);

            expect(consent.userId).toBe('user1');
            expect(consent.purpose).toBe('analytics');
            expect(consent.granted).toBe(true);
            expect(consent.version).toBe('1.0.0');
            expect(consent.timestamp).toBeInstanceOf(Date);
        });

        it('should record consent with custom version', () => {
            const consent = recordConsent('user1', 'marketing', true, '2.1.0');

            expect(consent.version).toBe('2.1.0');
        });

        it('should set expiration for non-essential consents', () => {
            const consent = recordConsent('user1', 'analytics', true);

            expect(consent.expiresAt).toBeInstanceOf(Date);
            expect(consent.expiresAt!.getTime()).toBeGreaterThan(Date.now());
        });

        it('should not set expiration for essential consents', () => {
            const consent = recordConsent('user1', 'essential', true);

            expect(consent.expiresAt).toBeUndefined();
        });

        it('should get all consent records for a user', () => {
            recordConsent('user1', 'analytics', true);
            recordConsent('user1', 'marketing', false);
            recordConsent('user2', 'analytics', true);

            const user1Consents = getConsentStatus('user1');

            expect(user1Consents).toHaveLength(2);
            expect(user1Consents[0].purpose).toBe('analytics');
            expect(user1Consents[1].purpose).toBe('marketing');
        });

        it('should return empty array for user with no consents', () => {
            const consents = getConsentStatus('nonexistent');

            expect(consents).toEqual([]);
        });

        it('should revoke consent', () => {
            recordConsent('user1', 'analytics', true);
            const revoked = revokeConsent('user1', 'analytics');

            expect(revoked.granted).toBe(false);
            expect(revoked.purpose).toBe('analytics');
        });

        it('should check if consent is valid', () => {
            recordConsent('user1', 'analytics', true);

            expect(isConsentValid('user1', 'analytics')).toBe(true);
        });

        it('should return false for non-granted consent', () => {
            recordConsent('user1', 'analytics', false);

            expect(isConsentValid('user1', 'analytics')).toBe(false);
        });

        it('should return false for non-existent consent', () => {
            expect(isConsentValid('user1', 'analytics')).toBe(false);
        });

        it('should return false for expired consent', () => {
            const consent = recordConsent('user1', 'analytics', true);
            // Manually expire the consent
            consent.expiresAt = new Date(Date.now() - 1000);

            expect(isConsentValid('user1', 'analytics')).toBe(false);
        });

        it('should use most recent consent when checking validity', () => {
            recordConsent('user1', 'analytics', true);
            recordConsent('user1', 'analytics', false);

            expect(isConsentValid('user1', 'analytics')).toBe(false);
        });

        it('should get complete audit trail in chronological order', () => {
            recordConsent('user1', 'analytics', true, '1.0.0');
            recordConsent('user1', 'analytics', false, '1.0.0');
            recordConsent('user1', 'marketing', true, '1.0.0');
            recordConsent('user1', 'analytics', true, '2.0.0');

            const trail = getConsentAuditTrail('user1');

            expect(trail).toHaveLength(4);
            expect(trail[0].purpose).toBe('analytics');
            expect(trail[0].granted).toBe(true);
            expect(trail[1].purpose).toBe('analytics');
            expect(trail[1].granted).toBe(false);
            expect(trail[2].purpose).toBe('marketing');
            expect(trail[3].purpose).toBe('analytics');
            expect(trail[3].version).toBe('2.0.0');
        });

        it('should handle multiple consent versions correctly', () => {
            recordConsent('user1', 'analytics', true, '1.0.0');
            recordConsent('user1', 'analytics', true, '2.0.0');

            const trail = getConsentAuditTrail('user1');

            expect(trail).toHaveLength(2);
            expect(trail[0].version).toBe('1.0.0');
            expect(trail[1].version).toBe('2.0.0');
        });

        it('should handle revoked then re-granted consent', () => {
            recordConsent('user1', 'marketing', true);
            revokeConsent('user1', 'marketing');
            recordConsent('user1', 'marketing', true);

            expect(isConsentValid('user1', 'marketing')).toBe(true);

            const trail = getConsentAuditTrail('user1');
            expect(trail).toHaveLength(3);
            expect(trail[0].granted).toBe(true);
            expect(trail[1].granted).toBe(false);
            expect(trail[2].granted).toBe(true);
        });

        it('should handle all consent purposes', () => {
            const purposes: ConsentPurpose[] = [
                'essential',
                'analytics',
                'marketing',
                'ai_training',
                'third_party_sharing',
            ];

            purposes.forEach((purpose) => {
                recordConsent('user1', purpose, true);
            });

            const consents = getConsentStatus('user1');
            expect(consents).toHaveLength(5);
        });
    });

    describe('Data Processing Activity Logging (ROPA)', () => {
        it('should record data processing activity', () => {
            const activity = recordDataProcessing(
                'user1',
                'AI chat processing',
                ['messages', 'metadata'],
                'consent'
            );

            expect(activity.id).toMatch(/^proc_/);
            expect(activity.userId).toBe('user1');
            expect(activity.purpose).toBe('AI chat processing');
            expect(activity.dataCategories).toEqual(['messages', 'metadata']);
            expect(activity.legalBasis).toBe('consent');
            expect(activity.timestamp).toBeInstanceOf(Date);
        });

        it('should record processing with details', () => {
            const activity = recordDataProcessing(
                'user1',
                'Memory storage',
                ['embeddings'],
                'legitimate_interest',
                'Storing conversation context for improved responses'
            );

            expect(activity.processingDetails).toBe(
                'Storing conversation context for improved responses'
            );
        });

        it('should get processing log for specific user', () => {
            recordDataProcessing('user1', 'Chat', ['messages'], 'consent');
            recordDataProcessing('user2', 'Chat', ['messages'], 'consent');
            recordDataProcessing('user1', 'Memory', ['embeddings'], 'legitimate_interest');

            const user1Log = getDataProcessingLog('user1');

            expect(user1Log).toHaveLength(2);
            expect(user1Log[0].purpose).toBe('Chat');
            expect(user1Log[1].purpose).toBe('Memory');
        });

        it('should get all processing activities without userId filter', () => {
            recordDataProcessing('user1', 'Chat', ['messages'], 'consent');
            recordDataProcessing('user2', 'Chat', ['messages'], 'consent');
            recordDataProcessing('user3', 'Memory', ['embeddings'], 'contract');

            const allLogs = getDataProcessingLog();

            expect(allLogs).toHaveLength(3);
        });

        it('should support all legal bases', () => {
            const legalBases: LegalBasis[] = [
                'consent',
                'contract',
                'legitimate_interest',
                'legal_obligation',
            ];

            legalBases.forEach((basis) => {
                recordDataProcessing('user1', 'Test', ['data'], basis);
            });

            const logs = getDataProcessingLog('user1');
            expect(logs).toHaveLength(4);
        });

        it('should generate unique IDs for each activity', () => {
            const activity1 = recordDataProcessing('user1', 'Test', ['data'], 'consent');
            const activity2 = recordDataProcessing('user1', 'Test', ['data'], 'consent');

            expect(activity1.id).not.toBe(activity2.id);
        });
    });

    describe('Data Breach Management', () => {
        it('should record data breach with 72-hour deadline', () => {
            const breach = recordDataBreach(
                'high',
                ['user1', 'user2'],
                ['email', 'phone'],
                'Unauthorized access to user database'
            );

            expect(breach.id).toMatch(/^breach_/);
            expect(breach.severity).toBe('high');
            expect(breach.affectedUsers).toEqual(['user1', 'user2']);
            expect(breach.dataTypes).toEqual(['email', 'phone']);
            expect(breach.description).toBe('Unauthorized access to user database');
            expect(breach.discoveredAt).toBeInstanceOf(Date);
            expect(breach.notificationDeadline).toBeInstanceOf(Date);
            expect(breach.notified).toBe(false);

            // Check 72-hour deadline
            const hoursDiff =
                (breach.notificationDeadline.getTime() - breach.discoveredAt.getTime()) /
                (1000 * 60 * 60);
            expect(hoursDiff).toBe(72);
        });

        it('should get all data breaches', () => {
            recordDataBreach('low', ['user1'], ['name'], 'Minor incident');
            recordDataBreach('critical', ['user2', 'user3'], ['password'], 'Major breach');

            const breaches = getDataBreaches();

            expect(breaches).toHaveLength(2);
            expect(breaches[0].severity).toBe('low');
            expect(breaches[1].severity).toBe('critical');
        });

        it('should get breach notification deadline', () => {
            const breach = recordDataBreach('medium', ['user1'], ['email'], 'Test breach');
            const deadline = getBreachNotificationDeadline(breach.id);

            expect(deadline).toBeInstanceOf(Date);
            expect(deadline?.getTime()).toBe(breach.notificationDeadline.getTime());
        });

        it('should return null for non-existent breach ID', () => {
            const deadline = getBreachNotificationDeadline('nonexistent');

            expect(deadline).toBeNull();
        });

        it('should support all breach severities', () => {
            recordDataBreach('low', ['user1'], ['data'], 'Low');
            recordDataBreach('medium', ['user2'], ['data'], 'Medium');
            recordDataBreach('high', ['user3'], ['data'], 'High');
            recordDataBreach('critical', ['user4'], ['data'], 'Critical');

            const breaches = getDataBreaches();
            expect(breaches).toHaveLength(4);
        });

        it('should generate unique IDs for each breach', () => {
            const breach1 = recordDataBreach('low', ['user1'], ['data'], 'Test');
            const breach2 = recordDataBreach('low', ['user1'], ['data'], 'Test');

            expect(breach1.id).not.toBe(breach2.id);
        });
    });

    describe('Privacy Report Generation', () => {
        it('should generate comprehensive privacy report', () => {
            recordConsent('user1', 'analytics', true);
            recordConsent('user1', 'marketing', false);
            recordDataProcessing('user1', 'Chat', ['messages'], 'consent');
            recordDataBreach('low', ['user1', 'user2'], ['email'], 'Test breach');

            const report = generatePrivacyReport('user1');

            expect(report.userId).toBe('user1');
            expect(report.consents).toHaveLength(2);
            expect(report.processingActivities).toHaveLength(1);
            expect(report.dataRetention).toHaveLength(3);
            expect(report.breaches).toHaveLength(1);
            expect(report.generatedAt).toBeInstanceOf(Date);
        });

        it('should include only user-specific data in report', () => {
            recordConsent('user1', 'analytics', true);
            recordConsent('user2', 'analytics', true);
            recordDataProcessing('user1', 'Chat', ['messages'], 'consent');
            recordDataProcessing('user2', 'Chat', ['messages'], 'consent');

            const report = generatePrivacyReport('user1');

            expect(report.consents).toHaveLength(1);
            expect(report.consents[0].userId).toBe('user1');
            expect(report.processingActivities).toHaveLength(1);
            expect(report.processingActivities[0].userId).toBe('user1');
        });

        it('should include data retention information', () => {
            const report = generatePrivacyReport('user1');

            expect(report.dataRetention).toBeDefined();
            expect(report.dataRetention.length).toBeGreaterThan(0);
            expect(report.dataRetention[0]).toHaveProperty('category');
            expect(report.dataRetention[0]).toHaveProperty('retentionPeriod');
            expect(report.dataRetention[0]).toHaveProperty('lastAccessed');
        });

        it('should filter breaches affecting the user', () => {
            recordDataBreach('low', ['user1'], ['email'], 'Breach 1');
            recordDataBreach('medium', ['user2'], ['phone'], 'Breach 2');
            recordDataBreach('high', ['user1', 'user2'], ['data'], 'Breach 3');

            const report = generatePrivacyReport('user1');

            expect(report.breaches).toHaveLength(2);
            expect(report.breaches[0].affectedUsers).toContain('user1');
            expect(report.breaches[1].affectedUsers).toContain('user1');
        });
    });

    describe('Data Retention Status', () => {
        it('should get data retention status', () => {
            const status = getDataRetentionStatus('user1');

            expect(status.userId).toBe('user1');
            expect(status.dataCategories).toBeDefined();
            expect(status.dataCategories.length).toBeGreaterThan(0);
        });

        it('should include all required data category fields', () => {
            const status = getDataRetentionStatus('user1');
            const category = status.dataCategories[0];

            expect(category).toHaveProperty('category');
            expect(category).toHaveProperty('retentionPeriod');
            expect(category).toHaveProperty('collectedAt');
            expect(category).toHaveProperty('expiresAt');
            expect(category).toHaveProperty('canDelete');
        });

        it('should mark account information as non-deletable', () => {
            const status = getDataRetentionStatus('user1');
            const accountInfo = status.dataCategories.find(
                (c) => c.category === 'Account Information'
            );

            expect(accountInfo).toBeDefined();
            expect(accountInfo?.canDelete).toBe(false);
        });

        it('should mark chat history as deletable', () => {
            const status = getDataRetentionStatus('user1');
            const chatHistory = status.dataCategories.find((c) => c.category === 'Chat History');

            expect(chatHistory).toBeDefined();
            expect(chatHistory?.canDelete).toBe(true);
        });
    });

    describe('Data Protection Impact Assessment (DPIA)', () => {
        it('should record DPIA', () => {
            const dpia = recordDPIA('AI Memory System', 'high', [
                'Encryption at rest',
                'User consent required',
                'Regular security audits',
            ]);

            expect(dpia.id).toMatch(/^dpia_/);
            expect(dpia.featureName).toBe('AI Memory System');
            expect(dpia.riskLevel).toBe('high');
            expect(dpia.mitigations).toHaveLength(3);
            expect(dpia.assessedAt).toBeInstanceOf(Date);
            expect(dpia.reviewDate).toBeInstanceOf(Date);
        });

        it('should set review date to 1 year from assessment', () => {
            const dpia = recordDPIA('Test Feature', 'medium', ['Mitigation 1']);
            const yearInMs = 365 * 24 * 60 * 60 * 1000;
            const timeDiff = dpia.reviewDate.getTime() - dpia.assessedAt.getTime();

            expect(Math.abs(timeDiff - yearInMs)).toBeLessThan(1000); // Allow 1 second tolerance
        });

        it('should get all DPIAs', () => {
            recordDPIA('Feature 1', 'low', ['Mit 1']);
            recordDPIA('Feature 2', 'critical', ['Mit 2', 'Mit 3']);

            const dpias = getDPIAs();

            expect(dpias).toHaveLength(2);
            expect(dpias[0].featureName).toBe('Feature 1');
            expect(dpias[1].featureName).toBe('Feature 2');
        });

        it('should support all risk levels', () => {
            recordDPIA('Feature 1', 'low', ['Mit']);
            recordDPIA('Feature 2', 'medium', ['Mit']);
            recordDPIA('Feature 3', 'high', ['Mit']);
            recordDPIA('Feature 4', 'critical', ['Mit']);

            const dpias = getDPIAs();
            expect(dpias).toHaveLength(4);
        });

        it('should generate unique IDs for each DPIA', () => {
            const dpia1 = recordDPIA('Feature', 'low', ['Mit']);
            const dpia2 = recordDPIA('Feature', 'low', ['Mit']);

            expect(dpia1.id).not.toBe(dpia2.id);
        });
    });

    describe('Compliance Score Calculation', () => {
        it('should return perfect score with full compliance', () => {
            recordConsent('user1', 'essential', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDPIA('Feature', 'low', ['Mitigation']);

            const score = getComplianceScore();

            expect(score.score).toBe(100);
            expect(score.details.consentManagement).toBe(20);
            expect(score.details.dataProcessing).toBe(20);
            expect(score.details.breachHandling).toBe(20);
            expect(score.details.dataRetention).toBe(20);
            expect(score.details.dpia).toBe(20);
            expect(score.recommendations).toHaveLength(0);
        });

        it('should penalize missing data processing logs', () => {
            recordConsent('user1', 'essential', true);
            recordDPIA('Feature', 'low', ['Mitigation']);

            const score = getComplianceScore();

            expect(score.details.dataProcessing).toBe(10);
            expect(score.recommendations).toContain(
                'Implement comprehensive data processing activity logging'
            );
        });

        it('should penalize missing DPIAs', () => {
            recordConsent('user1', 'essential', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');

            const score = getComplianceScore();

            expect(score.details.dpia).toBe(10);
            expect(score.recommendations).toContain(
                'Conduct Data Protection Impact Assessments for high-risk features'
            );
        });

        it('should penalize overdue breach notifications', () => {
            recordConsent('user1', 'essential', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDPIA('Feature', 'low', ['Mitigation']);

            const breach = recordDataBreach('high', ['user1'], ['email'], 'Test breach');
            // Make it overdue
            breach.notificationDeadline = new Date(Date.now() - 1000);

            const score = getComplianceScore();

            expect(score.details.breachHandling).toBeLessThan(20);
            expect(score.recommendations.some((r) => r.includes('breach'))).toBe(true);
        });

        it('should not penalize low severity unnotified breaches', () => {
            recordConsent('user1', 'essential', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDPIA('Feature', 'low', ['Mitigation']);

            const breach = recordDataBreach('low', ['user1'], ['email'], 'Test breach');
            breach.notificationDeadline = new Date(Date.now() - 1000);

            const score = getComplianceScore();

            expect(score.details.breachHandling).toBe(20);
        });

        it('should handle multiple overdue breaches', () => {
            recordConsent('user1', 'essential', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDPIA('Feature', 'low', ['Mitigation']);

            const breach1 = recordDataBreach('medium', ['user1'], ['email'], 'Breach 1');
            const breach2 = recordDataBreach('high', ['user2'], ['phone'], 'Breach 2');
            breach1.notificationDeadline = new Date(Date.now() - 1000);
            breach2.notificationDeadline = new Date(Date.now() - 1000);

            const score = getComplianceScore();

            expect(score.details.breachHandling).toBeLessThan(15);
            expect(score.recommendations.some((r) => r.includes('2 breach'))).toBe(true);
        });

        it('should handle users without essential consent', () => {
            recordConsent('user1', 'essential', true);
            recordConsent('user2', 'analytics', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDPIA('Feature', 'low', ['Mitigation']);

            const score = getComplianceScore();

            expect(score.details.consentManagement).toBe(10);
            expect(score.recommendations).toContain(
                'Ensure all users have granted essential consent'
            );
        });
    });

    describe('Test Cleanup', () => {
        it('should clear all privacy data', () => {
            recordConsent('user1', 'analytics', true);
            recordDataProcessing('user1', 'Test', ['data'], 'consent');
            recordDataBreach('low', ['user1'], ['email'], 'Test');
            recordDPIA('Feature', 'low', ['Mit']);

            clearPrivacy_forTesting();

            expect(getConsentStatus('user1')).toHaveLength(0);
            expect(getDataProcessingLog()).toHaveLength(0);
            expect(getDataBreaches()).toHaveLength(0);
            expect(getDPIAs()).toHaveLength(0);
        });

        it('should allow new records after cleanup', () => {
            recordConsent('user1', 'analytics', true);
            clearPrivacy_forTesting();
            recordConsent('user2', 'marketing', true);

            const consents = getConsentStatus('user2');
            expect(consents).toHaveLength(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty user ID gracefully', () => {
            recordConsent('', 'analytics', true);
            const consents = getConsentStatus('');

            expect(consents).toHaveLength(1);
        });

        it('should handle very long descriptions', () => {
            const longDescription = 'A'.repeat(10000);
            const breach = recordDataBreach('low', ['user1'], ['data'], longDescription);

            expect(breach.description).toBe(longDescription);
        });

        it('should handle empty affected users in breach', () => {
            const breach = recordDataBreach('low', [], ['data'], 'Test');

            expect(breach.affectedUsers).toEqual([]);
        });

        it('should handle empty data types in breach', () => {
            const breach = recordDataBreach('low', ['user1'], [], 'Test');

            expect(breach.dataTypes).toEqual([]);
        });

        it('should handle empty mitigations in DPIA', () => {
            const dpia = recordDPIA('Feature', 'low', []);

            expect(dpia.mitigations).toEqual([]);
        });

        it('should handle concurrent consent updates', () => {
            recordConsent('user1', 'analytics', true);
            recordConsent('user1', 'analytics', true);
            recordConsent('user1', 'analytics', false);

            const trail = getConsentAuditTrail('user1');
            expect(trail).toHaveLength(3);
        });

        it('should handle large number of processing activities', () => {
            for (let i = 0; i < 100; i++) {
                recordDataProcessing(`user${i}`, `Purpose ${i}`, ['data'], 'consent');
            }

            const logs = getDataProcessingLog();
            expect(logs).toHaveLength(100);
        });
    });
});

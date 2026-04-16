/**
 * Privacy Compliance System
 *
 * Comprehensive GDPR/CCPA compliance tracking including:
 * - Consent management with versioning
 * - Data processing activity logging (ROPA)
 * - Data breach tracking with GDPR Art. 33 72-hour deadline
 * - Data Protection Impact Assessments (DPIA)
 * - Privacy reporting and compliance scoring
 */

export type ConsentPurpose =
    | 'essential'
    | 'analytics'
    | 'marketing'
    | 'ai_training'
    | 'third_party_sharing';
export type LegalBasis = 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ConsentRecord {
    userId: string;
    purpose: ConsentPurpose;
    granted: boolean;
    version: string;
    timestamp: Date;
    expiresAt?: Date;
}

export interface DataProcessingActivity {
    id: string;
    userId: string;
    purpose: string;
    dataCategories: string[];
    legalBasis: LegalBasis;
    timestamp: Date;
    processingDetails?: string;
}

export interface DataBreach {
    id: string;
    severity: BreachSeverity;
    affectedUsers: string[];
    dataTypes: string[];
    description: string;
    discoveredAt: Date;
    notificationDeadline: Date;
    notified: boolean;
}

export interface DPIA {
    id: string;
    featureName: string;
    riskLevel: RiskLevel;
    mitigations: string[];
    assessedAt: Date;
    reviewDate: Date;
}

export interface PrivacyReport {
    userId: string;
    consents: ConsentRecord[];
    processingActivities: DataProcessingActivity[];
    dataRetention: {
        category: string;
        retentionPeriod: string;
        lastAccessed: Date;
    }[];
    breaches: DataBreach[];
    generatedAt: Date;
}

export interface DataRetentionStatus {
    userId: string;
    dataCategories: {
        category: string;
        retentionPeriod: string;
        collectedAt: Date;
        expiresAt: Date;
        canDelete: boolean;
    }[];
}

export interface ComplianceScore {
    score: number;
    details: {
        consentManagement: number;
        dataProcessing: number;
        breachHandling: number;
        dataRetention: number;
        dpia: number;
    };
    recommendations: string[];
}

// In-memory storage
const consentRecords: ConsentRecord[] = [];
const processingActivities: DataProcessingActivity[] = [];
const dataBreaches: DataBreach[] = [];
const dpias: DPIA[] = [];

// Default consent version
const DEFAULT_CONSENT_VERSION = '1.0.0';

// GDPR Art. 33 - 72 hours notification deadline
const BREACH_NOTIFICATION_HOURS = 72;

// Consent expiration (12 months for non-essential)
const CONSENT_EXPIRATION_MONTHS = 12;

/**
 * Record user consent for a specific purpose
 */
export function recordConsent(
    userId: string,
    purpose: ConsentPurpose,
    granted: boolean,
    version?: string
): ConsentRecord {
    const timestamp = new Date();
    const consentVersion = version || DEFAULT_CONSENT_VERSION;

    // Non-essential consents expire after 12 months
    const expiresAt =
        purpose !== 'essential'
            ? new Date(timestamp.getTime() + CONSENT_EXPIRATION_MONTHS * 30 * 24 * 60 * 60 * 1000)
            : undefined;

    const record: ConsentRecord = {
        userId,
        purpose,
        granted,
        version: consentVersion,
        timestamp,
        expiresAt,
    };

    consentRecords.push(record);

    return record;
}

/**
 * Get all consent records for a user
 */
export function getConsentStatus(userId: string): ConsentRecord[] {
    return consentRecords.filter((record) => record.userId === userId);
}

/**
 * Revoke specific consent for a user
 */
export function revokeConsent(userId: string, purpose: ConsentPurpose): ConsentRecord {
    return recordConsent(userId, purpose, false);
}

/**
 * Check if active consent exists for a purpose
 */
export function isConsentValid(userId: string, purpose: ConsentPurpose): boolean {
    const userConsents = consentRecords.filter(
        (record) => record.userId === userId && record.purpose === purpose
    );

    if (userConsents.length === 0) {
        return false;
    }

    // Get most recent consent
    const latestConsent = userConsents[userConsents.length - 1];

    // Check if granted
    if (!latestConsent.granted) {
        return false;
    }

    // Check if expired
    if (latestConsent.expiresAt && latestConsent.expiresAt < new Date()) {
        return false;
    }

    return true;
}

/**
 * Get full audit trail of consent changes for a user
 */
export function getConsentAuditTrail(userId: string): ConsentRecord[] {
    return consentRecords
        .filter((record) => record.userId === userId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Record data processing activity (ROPA)
 */
export function recordDataProcessing(
    userId: string,
    purpose: string,
    dataCategories: string[],
    legalBasis: LegalBasis,
    processingDetails?: string
): DataProcessingActivity {
    const activity: DataProcessingActivity = {
        id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        purpose,
        dataCategories,
        legalBasis,
        timestamp: new Date(),
        processingDetails,
    };

    processingActivities.push(activity);

    return activity;
}

/**
 * Get data processing log (ROPA - Record of Processing Activities)
 */
export function getDataProcessingLog(userId?: string): DataProcessingActivity[] {
    if (userId) {
        return processingActivities.filter((activity) => activity.userId === userId);
    }
    return [...processingActivities];
}

/**
 * Record a data breach
 */
export function recordDataBreach(
    severity: BreachSeverity,
    affectedUsers: string[],
    dataTypes: string[],
    description: string
): DataBreach {
    const discoveredAt = new Date();
    const notificationDeadline = new Date(
        discoveredAt.getTime() + BREACH_NOTIFICATION_HOURS * 60 * 60 * 1000
    );

    const breach: DataBreach = {
        id: `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        severity,
        affectedUsers,
        dataTypes,
        description,
        discoveredAt,
        notificationDeadline,
        notified: false,
    };

    dataBreaches.push(breach);

    return breach;
}

/**
 * Get all data breaches
 */
export function getDataBreaches(): DataBreach[] {
    return [...dataBreaches];
}

/**
 * Get breach notification deadline (GDPR Art. 33 - 72 hours)
 */
export function getBreachNotificationDeadline(breachId: string): Date | null {
    const breach = dataBreaches.find((b) => b.id === breachId);
    return breach ? breach.notificationDeadline : null;
}

/**
 * Generate comprehensive privacy report for a user
 */
export function generatePrivacyReport(userId: string): PrivacyReport {
    const userConsents = getConsentStatus(userId);
    const userProcessingActivities = getDataProcessingLog(userId);
    const userBreaches = dataBreaches.filter((breach) => breach.affectedUsers.includes(userId));

    // Generate sample data retention info
    const dataRetention = [
        {
            category: 'Profile Data',
            retentionPeriod: '5 years after account closure',
            lastAccessed: new Date(),
        },
        {
            category: 'Chat History',
            retentionPeriod: '2 years or until deletion request',
            lastAccessed: new Date(),
        },
        {
            category: 'Analytics Data',
            retentionPeriod: '13 months',
            lastAccessed: new Date(),
        },
    ];

    return {
        userId,
        consents: userConsents,
        processingActivities: userProcessingActivities,
        dataRetention,
        breaches: userBreaches,
        generatedAt: new Date(),
    };
}

/**
 * Get data retention status for a user
 */
export function getDataRetentionStatus(userId: string): DataRetentionStatus {
    const now = new Date();

    // Sample data categories with retention periods
    const dataCategories = [
        {
            category: 'Account Information',
            retentionPeriod: '5 years after account closure',
            collectedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(now.getTime() + 4 * 365 * 24 * 60 * 60 * 1000),
            canDelete: false, // Required for legal obligations
        },
        {
            category: 'Chat History',
            retentionPeriod: '2 years or until deletion request',
            collectedAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(now.getTime() + (2 * 365 - 180) * 24 * 60 * 60 * 1000),
            canDelete: true,
        },
        {
            category: 'Analytics Data',
            retentionPeriod: '13 months',
            collectedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(now.getTime() + (13 * 30 - 90) * 24 * 60 * 60 * 1000),
            canDelete: true,
        },
        {
            category: 'Marketing Preferences',
            retentionPeriod: 'Until consent withdrawn',
            collectedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
            canDelete: true,
        },
    ];

    return {
        userId,
        dataCategories,
    };
}

/**
 * Record Data Protection Impact Assessment (DPIA)
 */
export function recordDPIA(featureName: string, riskLevel: RiskLevel, mitigations: string[]): DPIA {
    const assessedAt = new Date();
    const reviewDate = new Date(assessedAt.getTime() + 365 * 24 * 60 * 60 * 1000); // Annual review

    const dpia: DPIA = {
        id: `dpia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        featureName,
        riskLevel,
        mitigations,
        assessedAt,
        reviewDate,
    };

    dpias.push(dpia);

    return dpia;
}

/**
 * Get all DPIAs
 */
export function getDPIAs(): DPIA[] {
    return [...dpias];
}

/**
 * Calculate overall compliance score (0-100)
 */
export function getComplianceScore(): ComplianceScore {
    const recommendations: string[] = [];

    // 1. Consent Management (20 points)
    const totalUsers = new Set(consentRecords.map((r) => r.userId)).size;
    const usersWithEssentialConsent = new Set(
        consentRecords.filter((r) => r.purpose === 'essential' && r.granted).map((r) => r.userId)
    ).size;
    const consentScore = totalUsers > 0 ? (usersWithEssentialConsent / totalUsers) * 20 : 20;

    if (consentScore < 20) {
        recommendations.push('Ensure all users have granted essential consent');
    }

    // 2. Data Processing (20 points)
    const processingScore = processingActivities.length > 0 ? 20 : 10;
    if (processingScore < 20) {
        recommendations.push('Implement comprehensive data processing activity logging');
    }

    // 3. Breach Handling (20 points)
    const unnotifiedBreaches = dataBreaches.filter((b) => !b.notified && b.severity !== 'low');
    const overdueBreaches = unnotifiedBreaches.filter((b) => new Date() > b.notificationDeadline);
    const breachScore =
        overdueBreaches.length === 0 ? 20 : Math.max(0, 20 - overdueBreaches.length * 5);

    if (overdueBreaches.length > 0) {
        recommendations.push(
            `${overdueBreaches.length} breach(es) past notification deadline - immediate action required`
        );
    }

    // 4. Data Retention (20 points)
    const retentionScore = 20; // Full score for having documented retention policies

    // 5. DPIA (20 points)
    const dpiaScore = dpias.length > 0 ? 20 : 10;
    if (dpiaScore < 20) {
        recommendations.push('Conduct Data Protection Impact Assessments for high-risk features');
    }

    const score = consentScore + processingScore + breachScore + retentionScore + dpiaScore;

    return {
        score: Math.round(score),
        details: {
            consentManagement: Math.round(consentScore),
            dataProcessing: Math.round(processingScore),
            breachHandling: Math.round(breachScore),
            dataRetention: Math.round(retentionScore),
            dpia: Math.round(dpiaScore),
        },
        recommendations,
    };
}

/**
 * Clear all privacy data (for testing only)
 */
export function clearPrivacy_forTesting(): void {
    consentRecords.length = 0;
    processingActivities.length = 0;
    dataBreaches.length = 0;
    dpias.length = 0;
}

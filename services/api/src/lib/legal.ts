/**
 * Legal Documents
 * Structured ToS and Privacy Policy for API consumption.
 */

export function getTermsOfService() {
    return {
        version: '1.0.0',
        effectiveDate: '2026-02-01',
        lastUpdated: '2026-02-12',
        sections: [
            {
                title: 'Acceptance of Terms',
                content:
                    'By accessing or using Yula ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.',
            },
            {
                title: 'Description of Service',
                content:
                    'Yula is an AI-powered conversational assistant platform that provides multi-model AI chat, persistent memory, proactive notifications, and related features. The Service is provided "as is" and may be updated at any time.',
            },
            {
                title: 'User Accounts',
                content:
                    'You must create an account to use most features. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 13 years of age to use the Service.',
            },
            {
                title: 'Acceptable Use',
                content:
                    'You agree not to: (a) use the Service for illegal purposes; (b) attempt to bypass rate limits or abuse detection; (c) share API keys with unauthorized parties; (d) use the Service to generate harmful, misleading, or illegal content; (e) reverse engineer the Service.',
            },
            {
                title: 'AI-Generated Content',
                content:
                    'AI responses may contain inaccuracies. Yula does not guarantee the accuracy, completeness, or reliability of AI-generated content. You are responsible for verifying any information before acting on it.',
            },
            {
                title: 'Data and Privacy',
                content:
                    'Your use of the Service is subject to our Privacy Policy. We process your data in accordance with GDPR and applicable data protection laws. You retain ownership of your content.',
            },
            {
                title: 'Subscription and Billing',
                content:
                    'Paid features require an active subscription. Subscriptions auto-renew unless cancelled. Refunds are handled according to our refund policy. Free tier usage is subject to rate limits.',
            },
            {
                title: 'Intellectual Property',
                content:
                    'Yula and its features are proprietary. Your content remains yours. By using the Service, you grant Yula a limited license to process your content to provide the Service.',
            },
            {
                title: 'Limitation of Liability',
                content:
                    'Yula shall not be liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid for the Service in the 12 months prior to the claim.',
            },
            {
                title: 'Termination',
                content:
                    'Either party may terminate at any time. Upon termination, you may export your data via the GDPR data export feature within 30 days. After 30 days, data may be deleted.',
            },
        ],
    };
}

export function getPrivacyPolicy() {
    return {
        version: '1.0.0',
        effectiveDate: '2026-02-01',
        lastUpdated: '2026-02-12',
        dataController: { name: 'Yula', email: 'privacy@yula.dev' },
        sections: [
            {
                title: 'Data We Collect',
                content:
                    'We collect: (a) Account data (email, name); (b) Chat conversations; (c) Memory extractions from your conversations; (d) Usage analytics (models used, token counts); (e) Billing information (processed by Polar).',
            },
            {
                title: 'How We Use Your Data',
                content:
                    'We use your data to: (a) Provide AI chat services; (b) Maintain conversation memory; (c) Improve response quality; (d) Process billing; (e) Send proactive AI notifications (if enabled); (f) Detect abuse and enforce rate limits.',
            },
            {
                title: 'Data Storage and Security',
                content:
                    'Data is stored in PostgreSQL (Railway) and Qdrant (vector store). All data is encrypted in transit via TLS. We implement rate limiting, input sanitization, and content moderation to protect the platform.',
            },
            {
                title: 'Third-Party Processors',
                content:
                    'We share data with: (a) AI providers (OpenAI, Anthropic, Google, Groq) to generate responses; (b) Polar for billing; (c) Railway for hosting; (d) Sentry for error monitoring. Each processor has their own privacy policy.',
            },
            {
                title: 'Your Rights (GDPR)',
                content:
                    'You have the right to: (a) Access your data (GET /api/account/export); (b) Delete your data (DELETE /api/account); (c) Export your data (GDPR Article 20 portability); (d) Restrict processing; (e) Object to processing. Contact privacy@yula.dev for requests.',
            },
            {
                title: 'Data Retention',
                content:
                    'We retain data according to our retention policies: Active chats (indefinite), Archived chats (1 year), Notification logs (90 days), Credit logs (2 years for audit), Expired sessions (30 days). You can delete your account at any time.',
            },
            {
                title: 'Cookies',
                content:
                    'We use essential cookies for authentication and session management. No tracking cookies are used. Analytics are server-side only.',
            },
            {
                title: 'Changes to Policy',
                content:
                    'We may update this policy. Significant changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.',
            },
        ],
    };
}

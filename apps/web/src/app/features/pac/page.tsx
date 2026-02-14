import { BellRinging } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import { type FeatureData, FeaturePage } from '@/components/seo/FeaturePage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'PAC - Proactive AI Callbacks | Yula Features',
    'PAC (Proactive Agentic Callback) is AI that messages YOU first. Schedule reminders, follow-ups, and let Yula reach out when it matters.',
    '/features/pac',
    {
        keywords: [
            'proactive AI',
            'AI reminders',
            'AI notifications',
            'AI callbacks',
            'PAC',
            'AI that messages you',
        ],
    }
);

const pacData: FeatureData = {
    name: 'PAC - Proactive Agentic Callback',
    slug: 'pac',
    tagline:
        'The first AI that messages YOU first. Schedule reminders, get follow-ups, and let Yula reach out when it matters most.',
    description: `PAC (Proactive Agentic Callback) is Yula's revolutionary feature that flips the AI interaction model. Instead of always waiting for you to ask, Yula can proactively reach out. Tell Yula to remind you about something in a week, follow up on a goal, or check in about a decision - and it will. No other AI platform offers this capability.`,
    heroIcon: <BellRinging className="w-16 h-16 text-primary" weight="duotone" />,
    benefits: [
        {
            title: 'AI That Initiates',
            description:
                'Yula can message you first - a capability no other AI assistant offers. Set reminders naturally in conversation.',
        },
        {
            title: 'Contextual Follow-ups',
            description:
                'Unlike simple reminders, PAC includes full context from your original conversation when it reaches out.',
        },
        {
            title: 'Multiple Notification Channels',
            description:
                'Receive PAC notifications via push notification, email, or in-app - your choice.',
        },
        {
            title: 'Natural Scheduling',
            description:
                '"Remind me about this next week" or "Follow up with me on this goal monthly" - just talk naturally.',
        },
    ],
    howItWorks: [
        {
            step: 1,
            title: 'Request a callback naturally',
            description:
                'During any conversation, ask Yula to remind you, follow up, or check in at a future time.',
        },
        {
            step: 2,
            title: 'Yula schedules the callback',
            description:
                'Yula extracts the timing and context, scheduling a proactive callback for the right moment.',
        },
        {
            step: 3,
            title: 'Context is preserved',
            description:
                'When the time comes, Yula has full context of the original conversation and why you wanted the reminder.',
        },
        {
            step: 4,
            title: 'Yula reaches out',
            description:
                "You receive a notification with Yula's contextual message, ready to continue the conversation.",
        },
    ],
    useCases: [
        {
            title: 'Goal Tracking',
            description:
                '"Check in with me about my fitness goals every Sunday" - Yula becomes your accountability partner.',
        },
        {
            title: 'Decision Follow-ups',
            description:
                '"Remind me in 3 days to reconsider this decision" - let important choices marinate with a follow-up.',
        },
        {
            title: 'Learning Reminders',
            description: '"Quiz me on this topic next week" - spaced repetition powered by AI.',
        },
        {
            title: 'Project Check-ins',
            description:
                '"Follow up on this project\'s progress in 2 weeks" - never let important tasks slip.',
        },
    ],
    faqs: [
        {
            question: 'Is PAC really unique to Yula?',
            answer: 'Yes! ChatGPT, Claude, Gemini, and other AI assistants cannot proactively message you. They only respond when you initiate. Yula is the first to offer AI-initiated callbacks.',
        },
        {
            question: 'How do I receive PAC notifications?',
            answer: 'You can receive notifications via push notification (web/mobile), email, or check them in-app. Configure your preferences in settings.',
        },
        {
            question: 'Can I cancel or modify scheduled callbacks?',
            answer: 'Yes! View all scheduled PAC callbacks in your dashboard and cancel, reschedule, or modify any of them.',
        },
        {
            question: 'How does Yula know when to reach out?',
            answer: 'PAC uses natural language understanding to extract timing from your requests. "Next week", "in 3 days", "every Monday" - Yula understands it all.',
        },
    ],
    ctaText: 'Try Proactive AI',
    relatedFeatures: [
        {
            name: 'Semantic Memory',
            slug: 'memory',
            description: 'Persistent memory for contextual callbacks',
        },
        {
            name: 'Council Mode',
            slug: 'council',
            description: 'Compare responses from multiple AI models',
        },
        {
            name: 'Import',
            slug: 'import',
            description: 'Import ChatGPT and Claude history',
        },
    ],
};

export default function PACFeaturePage() {
    return <FeaturePage feature={pacData} />;
}

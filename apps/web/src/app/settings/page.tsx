'use client';

import {
    Bell,
    Brain,
    CircleNotch,
    Database,
    Globe,
    Moon,
    Palette,
    Shield,
    SignOut,
    Sun,
    Trash,
    User,
    WarningCircle,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth, useUser } from '@/hooks/use-auth';
import { hardNavigate } from '@/lib/hard-navigation';

interface UserSettings {
    notifications: {
        email: boolean;
        push: boolean;
        pacReminders: boolean;
        weeklyDigest: boolean;
    };
    appearance: {
        theme: 'light' | 'dark' | 'system';
        compactMode: boolean;
        showLineNumbers: boolean;
    };
    ai: {
        defaultModel: string;
        streamResponses: boolean;
        saveHistory: boolean;
        contextMemory: boolean;
    };
    privacy: {
        shareAnalytics: boolean;
        publicProfile: boolean;
    };
}

const defaultSettings: UserSettings = {
    notifications: {
        email: true,
        push: true,
        pacReminders: true,
        weeklyDigest: false,
    },
    appearance: {
        theme: 'system',
        compactMode: false,
        showLineNumbers: true,
    },
    ai: {
        defaultModel: 'gpt-5',
        streamResponses: true,
        saveHistory: true,
        contextMemory: true,
    },
    privacy: {
        shareAnalytics: true,
        publicProfile: false,
    },
};

const models = [
    { id: 'gpt-5', name: 'GPT-5.4', provider: 'OpenAI' },
    { id: 'gpt-5-mini', name: 'GPT-5.4 Mini', provider: 'OpenAI' },
    { id: 'gpt-5.4-codex', name: 'GPT-5.4 Codex', provider: 'OpenAI' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', provider: 'Anthropic' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'Google' },
    { id: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Groq' },
];

export default function SettingsPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn, signOut } = useAuth();
    const { user } = useUser();

    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('account');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            hardNavigate('/login', 'replace');
            return;
        }

        // Load settings from API/localStorage
        const loadSettings = async () => {
            try {
                const stored = localStorage.getItem('yula_settings');
                if (stored) {
                    setSettings({ ...defaultSettings, ...JSON.parse(stored) });
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            } finally {
                setIsLoading(false);
            }
        };

        if (isLoaded && isSignedIn) {
            loadSettings();
        }
    }, [isLoaded, isSignedIn, router]);

    const updateSettings = <K extends keyof UserSettings>(
        category: K,
        key: keyof UserSettings[K],
        value: UserSettings[K][keyof UserSettings[K]]
    ) => {
        setSettings((prev) => {
            const updated = {
                ...prev,
                [category]: {
                    ...prev[category],
                    [key]: value,
                },
            };
            localStorage.setItem('yula_settings', JSON.stringify(updated));
            return updated;
        });
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/');
        } catch (e) {
            console.error('Sign out failed:', e);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            // Call account deletion API
            const response = await fetch('/api/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            // Sign out and redirect
            setShowDeleteConfirm(false);
            // Redirect to home page after deletion
            window.location.href = '/';
        } catch (error) {
            console.error('Account deletion failed:', error);
            alert('Failed to delete account. Please contact support.');
        }
    };

    const handleDataExport = async () => {
        try {
            const response = await fetch('/api/memory/export', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const data = await response.json();

            // Create a blob and trigger download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `yula-data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Data export failed:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <CircleNotch className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const sections = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'ai', label: 'AI Settings', icon: Brain },
        { id: 'privacy', label: 'Privacy', icon: Shield },
        { id: 'data', label: 'Data', icon: Database },
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
                    <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <nav className="lg:w-64 flex-shrink-0">
                        <div className="bg-card rounded-xl border border-border p-2">
                            {sections.map((section) => (
                                <button
                                    type="button"
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                        activeSection === section.id
                                            ? 'bg-muted dark:bg-muted/20 text-foreground dark:text-foreground/80'
                                            : 'text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <section.icon className="w-5 h-5" weight="duotone" />
                                    <span className="font-medium">{section.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                        {/* Account Section */}
                        {activeSection === 'account' && (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Profile</CardTitle>
                                        <CardDescription>Your account information</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-muted dark:bg-muted/30 flex items-center justify-center">
                                                <User
                                                    className="w-8 h-8 text-foreground dark:text-foreground/80"
                                                    weight="duotone"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    {user?.fullName || user?.firstName || 'User'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {user?.primaryEmailAddress?.emailAddress ||
                                                        'No email'}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Session</CardTitle>
                                        <CardDescription>
                                            Manage your current session
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <button
                                            type="button"
                                            onClick={handleSignOut}
                                            className="flex items-center gap-2 px-4 py-2 text-foreground dark:text-foreground/70 hover:bg-muted dark:hover:bg-muted/20 rounded-lg transition-colors"
                                        >
                                            <SignOut className="w-5 h-5" weight="duotone" />
                                            Sign Out
                                        </button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Notifications Section */}
                        {activeSection === 'notifications' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>
                                        Choose how you want to be notified
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <SettingRow
                                        label="Email Notifications"
                                        description="Receive important updates via email"
                                        checked={settings.notifications.email}
                                        onChange={(v) =>
                                            updateSettings('notifications', 'email', v)
                                        }
                                    />
                                    <SettingRow
                                        label="Push Notifications"
                                        description="Get instant notifications in your browser"
                                        checked={settings.notifications.push}
                                        onChange={(v) => updateSettings('notifications', 'push', v)}
                                    />
                                    <SettingRow
                                        label="PAC Reminders"
                                        description="Receive proactive AI callbacks and reminders"
                                        checked={settings.notifications.pacReminders}
                                        onChange={(v) =>
                                            updateSettings('notifications', 'pacReminders', v)
                                        }
                                    />
                                    <SettingRow
                                        label="Weekly Digest"
                                        description="Get a summary of your AI activity each week"
                                        checked={settings.notifications.weeklyDigest}
                                        onChange={(v) =>
                                            updateSettings('notifications', 'weeklyDigest', v)
                                        }
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Appearance Section */}
                        {activeSection === 'appearance' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Appearance</CardTitle>
                                    <CardDescription>Customize how Yula looks</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-3 block">
                                            Theme
                                        </label>
                                        <div className="flex gap-3">
                                            {(
                                                [
                                                    { id: 'light', label: 'Light', icon: Sun },
                                                    { id: 'dark', label: 'Dark', icon: Moon },
                                                    { id: 'system', label: 'System', icon: Globe },
                                                ] as const
                                            ).map((theme) => (
                                                <button
                                                    type="button"
                                                    key={theme.id}
                                                    onClick={() =>
                                                        updateSettings(
                                                            'appearance',
                                                            'theme',
                                                            theme.id
                                                        )
                                                    }
                                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                                                        settings.appearance.theme === theme.id
                                                            ? 'border-foreground bg-muted dark:bg-muted/20 text-foreground dark:text-foreground/80'
                                                            : 'border-border hover:bg-muted'
                                                    }`}
                                                >
                                                    <theme.icon
                                                        className="w-5 h-5"
                                                        weight="duotone"
                                                    />
                                                    {theme.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <SettingRow
                                        label="Compact Mode"
                                        description="Use smaller spacing and fonts"
                                        checked={settings.appearance.compactMode}
                                        onChange={(v) =>
                                            updateSettings('appearance', 'compactMode', v)
                                        }
                                    />
                                    <SettingRow
                                        label="Show Line Numbers"
                                        description="Display line numbers in code blocks"
                                        checked={settings.appearance.showLineNumbers}
                                        onChange={(v) =>
                                            updateSettings('appearance', 'showLineNumbers', v)
                                        }
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* AI Settings Section */}
                        {activeSection === 'ai' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>AI Configuration</CardTitle>
                                    <CardDescription>Customize your AI experience</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-3 block">
                                            Default Model
                                        </label>
                                        <select
                                            value={settings.ai.defaultModel}
                                            onChange={(e) =>
                                                updateSettings('ai', 'defaultModel', e.target.value)
                                            }
                                            className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground"
                                        >
                                            {models.map((model) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name} ({model.provider})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <SettingRow
                                        label="Stream Responses"
                                        description="Show AI responses as they're being generated"
                                        checked={settings.ai.streamResponses}
                                        onChange={(v) => updateSettings('ai', 'streamResponses', v)}
                                    />
                                    <SettingRow
                                        label="Save Chat History"
                                        description="Keep a record of your conversations"
                                        checked={settings.ai.saveHistory}
                                        onChange={(v) => updateSettings('ai', 'saveHistory', v)}
                                    />
                                    <SettingRow
                                        label="Context Memory"
                                        description="Allow AI to remember context from previous chats"
                                        checked={settings.ai.contextMemory}
                                        onChange={(v) => updateSettings('ai', 'contextMemory', v)}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Privacy Section */}
                        {activeSection === 'privacy' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Privacy Settings</CardTitle>
                                    <CardDescription>Control your data and privacy</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <SettingRow
                                        label="Share Analytics"
                                        description="Help improve Yula by sharing anonymous usage data"
                                        checked={settings.privacy.shareAnalytics}
                                        onChange={(v) =>
                                            updateSettings('privacy', 'shareAnalytics', v)
                                        }
                                    />
                                    <SettingRow
                                        label="Public Profile"
                                        description="Allow others to see your profile"
                                        checked={settings.privacy.publicProfile}
                                        onChange={(v) =>
                                            updateSettings('privacy', 'publicProfile', v)
                                        }
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Data Section */}
                        {activeSection === 'data' && (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Export Data</CardTitle>
                                        <CardDescription>
                                            Download a copy of your data
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <button
                                            type="button"
                                            onClick={handleDataExport}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            Request Data Export
                                        </button>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Download a JSON file containing all your data.
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-border dark:border-border">
                                    <CardHeader>
                                        <CardTitle className="text-foreground dark:text-foreground/70">
                                            Danger Zone
                                        </CardTitle>
                                        <CardDescription>Irreversible actions</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 bg-muted dark:bg-muted/20 rounded-lg border border-border dark:border-border">
                                            <div className="flex items-start gap-3">
                                                <WarningCircle
                                                    className="w-5 h-5 text-foreground dark:text-foreground/70 mt-0.5"
                                                    weight="fill"
                                                />
                                                <div>
                                                    <p className="font-medium text-foreground dark:text-foreground">
                                                        Delete Account
                                                    </p>
                                                    <p className="text-sm text-foreground/80 dark:text-foreground/70 mb-3">
                                                        Once you delete your account, there is no
                                                        going back. All your data will be
                                                        permanently removed.
                                                    </p>
                                                    {!showDeleteConfirm ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowDeleteConfirm(true)
                                                            }
                                                            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
                                                        >
                                                            <Trash
                                                                className="w-4 h-4"
                                                                weight="duotone"
                                                            />
                                                            Delete Account
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteAccount}
                                                                className="px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
                                                            >
                                                                Yes, Delete My Account
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setShowDeleteConfirm(false)
                                                                }
                                                                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

'use client';

import { motion } from 'framer-motion';
import {
    Bell,
    BellOff,
    Check,
    Clock,
    Loader2,
    Mail,
    MessageSquare,
    Moon,
    Smartphone,
    Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * YULA OS PAC Settings Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Amber (#D97706)
 * Settings for Proactive AI Callbacks
 */

export interface PACSettings {
    enabled: boolean;
    explicitEnabled: boolean;
    implicitEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    escalationEnabled: boolean;
    digestEnabled: boolean;
    digestTime: string;
}

interface PACSettingsProps {
    settings: PACSettings;
    onSettingsChange: (settings: Partial<PACSettings>) => void;
    onSave: () => Promise<void>;
    isSaving?: boolean;
    className?: string;
}

export function PACSettingsPanel({
    settings,
    onSettingsChange,
    onSave,
    isSaving = false,
    className,
}: PACSettingsProps) {
    const [hasChanges, setHasChanges] = React.useState(false);
    const [saved, setSaved] = React.useState(false);

    const handleChange = React.useCallback(
        (key: keyof PACSettings, value: boolean | string) => {
            onSettingsChange({ [key]: value });
            setHasChanges(true);
            setSaved(false);
        },
        [onSettingsChange]
    );

    const handleSave = React.useCallback(async () => {
        await onSave();
        setHasChanges(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [onSave]);

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-feature-pac/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-feature-pac" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Proactive AI Callbacks
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Let Yula remind you about your commitments
                        </p>
                    </div>
                </div>

                <Button variant="pac" onClick={handleSave} disabled={!hasChanges || isSaving}>
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : saved ? (
                        <Check className="w-4 h-4 mr-2" />
                    ) : null}
                    {saved ? 'Saved' : 'Save Changes'}
                </Button>
            </div>

            {/* Master Switch */}
            <Card
                className={cn(
                    'border-2 transition-colors',
                    settings.enabled
                        ? 'border-feature-pac/30 bg-feature-pac/5'
                        : 'border-zinc-200 dark:border-zinc-800'
                )}
            >
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className={cn(
                                    'w-12 h-12 rounded-full flex items-center justify-center',
                                    settings.enabled
                                        ? 'bg-feature-pac text-white'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                )}
                            >
                                {settings.enabled ? (
                                    <Bell className="w-6 h-6" />
                                ) : (
                                    <BellOff className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    Enable PAC
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {settings.enabled
                                        ? 'Yula will proactively remind you about commitments'
                                        : 'PAC is currently disabled'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.enabled}
                            onCheckedChange={(checked) => handleChange('enabled', checked)}
                            className="data-[state=checked]:bg-feature-pac"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Detection Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-feature-pac" />
                        Detection Settings
                    </CardTitle>
                    <CardDescription>Configure how Yula detects your commitments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SettingRow
                        label="Explicit Commitments"
                        description='Detect when you explicitly say "remind me" or set deadlines'
                        checked={settings.explicitEnabled}
                        onChange={(checked) => handleChange('explicitEnabled', checked)}
                        disabled={!settings.enabled}
                    />
                    <div className="border-t border-zinc-200 dark:border-zinc-800" />
                    <SettingRow
                        label="Implicit Commitments"
                        description='Detect implied commitments like "I need to..." or "I should..."'
                        checked={settings.implicitEnabled}
                        onChange={(checked) => handleChange('implicitEnabled', checked)}
                        disabled={!settings.enabled}
                    />
                </CardContent>
            </Card>

            {/* Notification Channels */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-feature-pac" />
                        Notification Channels
                    </CardTitle>
                    <CardDescription>Choose how you want to receive reminders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SettingRow
                        icon={<Smartphone className="w-4 h-4" />}
                        label="Push Notifications"
                        description="Get instant notifications on your devices"
                        checked={settings.pushEnabled}
                        onChange={(checked) => handleChange('pushEnabled', checked)}
                        disabled={!settings.enabled}
                    />
                    <div className="border-t border-zinc-200 dark:border-zinc-800" />
                    <SettingRow
                        icon={<Mail className="w-4 h-4" />}
                        label="Email Notifications"
                        description="Receive reminders via email"
                        checked={settings.emailEnabled}
                        onChange={(checked) => handleChange('emailEnabled', checked)}
                        disabled={!settings.enabled}
                    />
                </CardContent>
            </Card>

            {/* Quiet Hours & Digest */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-feature-pac" />
                        Timing & Digest
                    </CardTitle>
                    <CardDescription>Control when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SettingRow
                        icon={<Moon className="w-4 h-4" />}
                        label="Quiet Hours"
                        description="Pause notifications during specific hours"
                        checked={settings.quietHoursEnabled}
                        onChange={(checked) => handleChange('quietHoursEnabled', checked)}
                        disabled={!settings.enabled}
                    />

                    {settings.quietHoursEnabled && settings.enabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="ml-6 flex items-center gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor="quietStart"
                                    className="text-sm text-zinc-500 dark:text-zinc-400"
                                >
                                    From
                                </Label>
                                <input
                                    id="quietStart"
                                    type="time"
                                    value={settings.quietHoursStart}
                                    onChange={(e) =>
                                        handleChange('quietHoursStart', e.target.value)
                                    }
                                    className="px-2 py-1 rounded-[6px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor="quietEnd"
                                    className="text-sm text-zinc-500 dark:text-zinc-400"
                                >
                                    To
                                </Label>
                                <input
                                    id="quietEnd"
                                    type="time"
                                    value={settings.quietHoursEnd}
                                    onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                                    className="px-2 py-1 rounded-[6px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                                />
                            </div>
                        </motion.div>
                    )}

                    <div className="border-t border-zinc-200 dark:border-zinc-800" />

                    <SettingRow
                        label="Daily Digest"
                        description="Receive a summary of all pending reminders"
                        checked={settings.digestEnabled}
                        onChange={(checked) => handleChange('digestEnabled', checked)}
                        disabled={!settings.enabled}
                    />

                    {settings.digestEnabled && settings.enabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="ml-6 flex items-center gap-2"
                        >
                            <Label
                                htmlFor="digestTime"
                                className="text-sm text-zinc-500 dark:text-zinc-400"
                            >
                                Send at
                            </Label>
                            <input
                                id="digestTime"
                                type="time"
                                value={settings.digestTime}
                                onChange={(e) => handleChange('digestTime', e.target.value)}
                                className="px-2 py-1 rounded-[6px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            />
                        </motion.div>
                    )}

                    <div className="border-t border-zinc-200 dark:border-zinc-800" />

                    <SettingRow
                        label="Escalation"
                        description="Increase notification frequency for missed reminders"
                        checked={settings.escalationEnabled}
                        onChange={(checked) => handleChange('escalationEnabled', checked)}
                        disabled={!settings.enabled}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

interface SettingRowProps {
    icon?: React.ReactNode;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

function SettingRow({
    icon,
    label,
    description,
    checked,
    onChange,
    disabled = false,
}: SettingRowProps) {
    return (
        <div className={cn('flex items-center justify-between', disabled && 'opacity-50')}>
            <div className="flex items-start gap-3">
                {icon && <div className="mt-0.5 text-zinc-400 dark:text-zinc-500">{icon}</div>}
                <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{label}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
                </div>
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
                className="data-[state=checked]:bg-feature-pac"
            />
        </div>
    );
}

export default PACSettingsPanel;

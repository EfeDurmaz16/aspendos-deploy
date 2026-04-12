'use client';

export default function SchedulesPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-neutral-100">Scheduled Actions</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    View and manage PAC (Proactive AI Callback) scheduled reminders and tasks.
                </p>
            </div>

            <div className="space-y-3">
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-center">
                    <p className="text-sm text-neutral-500">
                        No scheduled actions yet. Ask YULA to remind you about something to get started.
                    </p>
                </div>
            </div>
        </div>
    );
}

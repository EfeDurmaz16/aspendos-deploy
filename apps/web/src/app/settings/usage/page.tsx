'use client';

export default function UsagePage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-neutral-100">Usage & Costs</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Monitor your token usage, costs, and tier limits.
                </p>
            </div>

            <div className="space-y-6">
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                    <h2 className="text-lg font-medium text-neutral-200 mb-4">Current Period</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-neutral-500">Messages</p>
                            <p className="text-2xl font-semibold text-neutral-100">—</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Tool Calls</p>
                            <p className="text-2xl font-semibold text-neutral-100">—</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Tokens Used</p>
                            <p className="text-2xl font-semibold text-neutral-100">—</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500">Est. Cost</p>
                            <p className="text-2xl font-semibold text-neutral-100">—</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                    <h2 className="text-lg font-medium text-neutral-200 mb-4">BYOK Keys</h2>
                    <p className="text-sm text-neutral-400">
                        Bring your own API keys to use your own provider accounts.
                        Keys are encrypted with AES-GCM before storage.
                    </p>
                    <div className="mt-4 text-sm text-neutral-500">
                        Configure BYOK keys in your account settings after upgrading to Pro BYOK or Team BYOK.
                    </div>
                </div>
            </div>
        </div>
    );
}

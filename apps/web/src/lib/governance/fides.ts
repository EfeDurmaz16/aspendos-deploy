type KeyPair = {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
};

type FidesSdk = {
    generateKeyPair: () => Promise<KeyPair>;
    generateDID: (publicKey: Uint8Array) => string;
    sign: (payload: Uint8Array, privateKey: Uint8Array) => Uint8Array | Promise<Uint8Array>;
};

export type GovernanceSignaturePayload = {
    args: unknown;
    parent_hash?: string | null;
    result?: unknown;
    reversibility_class: string;
    status: string;
    tool_name: string;
};

let signerPromise: Promise<{ did: string; keyPair: KeyPair; sdk: FidesSdk }> | null = null;

function normalizeForSignature(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => normalizeForSignature(item));

    const record = value as Record<string, unknown>;
    return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            const item = record[key];
            if (item !== undefined) acc[key] = normalizeForSignature(item);
            return acc;
        }, {});
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(normalizeForSignature(value));
}

async function getSigner() {
    signerPromise ??= (async () => {
        const sdk = (await import('@fides/sdk')) as FidesSdk;
        const keyPair = await sdk.generateKeyPair();
        return {
            did: sdk.generateDID(keyPair.publicKey),
            keyPair,
            sdk,
        };
    })();
    return signerPromise;
}

export async function signGovernanceCommit(payload: GovernanceSignaturePayload) {
    const signer = await getSigner();
    const canonicalPayload = canonicalJson({
        args: payload.args,
        parent_hash: payload.parent_hash ?? null,
        result: payload.result,
        reversibility_class: payload.reversibility_class,
        status: payload.status,
        tool_name: payload.tool_name,
    });
    const signature = await signer.sdk.sign(
        new TextEncoder().encode(canonicalPayload),
        signer.keyPair.privateKey
    );

    return {
        fides_signature: Buffer.from(signature).toString('base64'),
        fides_signer_did: signer.did,
    };
}

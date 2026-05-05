declare module '@agit/sdk' {
    export const AgitClient: any;
    export const AgitFidesClient: any;
}

declare module '@fides/sdk' {
    export function generateKeyPair(): Promise<any>;
    export function generateDID(publicKey: unknown): string;
    export function sign(payload: Uint8Array, privateKey: unknown): Uint8Array;
    export function parseDID(did: string): Uint8Array | null;
    export function verify(payload: Uint8Array, signature: Uint8Array, publicKey: unknown): boolean;
}

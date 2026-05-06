export * from '@fides/shared';
export type { KeyPair } from '@fides/shared';

export declare function generateKeyPair(): Promise<import('@fides/shared').KeyPair>;
export declare function generateDID(publicKey: Uint8Array): string;
export declare function parseDID(did: string): Uint8Array;
export declare function isValidDID(did: string): boolean;
export declare function sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
export declare function verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
): Promise<boolean>;

/**
 * Reference Tool Implementations
 *
 * Five tools covering every reversibility class:
 *
 *   undoable            → file-write      (snapshot restore)
 *   cancelable_window   → email-send      (30s hold)
 *   compensatable       → calendar-create (delete to reverse)
 *   approval_only       → db-migrate      (human approval gate)
 *   irreversible_blocked → stripe-charge  (agent refuses >$50)
 */

export { fileWrite } from './file-write';
export { emailSend } from './email-send';
export { calendarCreate } from './calendar-create';
export { dbMigrate } from './db-migrate';
export { stripeCharge } from './stripe-charge';

import type { ReversibleToolDef } from '@/lib/reversibility/types';
import { fileWrite } from './file-write';
import { emailSend } from './email-send';
import { calendarCreate } from './calendar-create';
import { dbMigrate } from './db-migrate';
import { stripeCharge } from './stripe-charge';

/** All reference tools indexed by name */
export const referenceTools: Map<string, ReversibleToolDef> = new Map([
    [fileWrite.name, fileWrite],
    [emailSend.name, emailSend],
    [calendarCreate.name, calendarCreate],
    [dbMigrate.name, dbMigrate],
    [stripeCharge.name, stripeCharge],
]);

/**
 * @aspendos/nemoclaw — Governance layer for NemoClaw
 *
 * NemoClaw provides sandbox isolation (Landlock + seccomp + network namespaces).
 * Aspendos adds application-level governance on top:
 * - FIDES: cryptographic signing of every action
 * - AGIT: audit commit log for every action
 * - Reversibility: 5-class classification
 *
 * Together: NemoClaw secures the CONTAINER, Aspendos governs the AGENT.
 */

export { AgitService, getAgit } from './agit-bridge';
export { FidesService, getFides } from './fides-bridge';
export { governedToolCall } from './middleware';
export type { GovernedResult, NemoClawContext } from './types';

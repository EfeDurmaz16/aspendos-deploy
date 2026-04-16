export {
    type ReversibilityClass,
    type RollbackStrategy,
    type ReversibilitySpec,
    type AgitCommit,
    type ReversibleToolDef,
    type ToolExecutionResult,
    type RollbackResult,
    type UndoRequest,
    type UndoResponse,
    type RewindRequest,
    type RewindResponse,
    REVERSIBILITY_SPECS,
} from './types';

export { dispatchRollback, dispatchRewind } from './dispatch';

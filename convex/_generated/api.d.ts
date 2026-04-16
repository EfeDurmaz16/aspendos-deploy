/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actionLog from '../actionLog.js';
import type * as approvals from '../approvals.js';
import type * as byokCredentials from '../byokCredentials.js';
import type * as commits from '../commits.js';
import type * as conversations from '../conversations.js';
import type * as memories from '../memories.js';
import type * as messages from '../messages.js';
import type * as organizations from '../organizations.js';
import type * as snapshots from '../snapshots.js';
import type * as subscriptions from '../subscriptions.js';
import type * as toolAllowlist from '../toolAllowlist.js';
import type * as toolRegistry from '../toolRegistry.js';
import type * as users from '../users.js';
import type * as workflows from '../workflows.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
    actionLog: typeof actionLog;
    approvals: typeof approvals;
    byokCredentials: typeof byokCredentials;
    commits: typeof commits;
    conversations: typeof conversations;
    memories: typeof memories;
    messages: typeof messages;
    organizations: typeof organizations;
    snapshots: typeof snapshots;
    subscriptions: typeof subscriptions;
    toolAllowlist: typeof toolAllowlist;
    toolRegistry: typeof toolRegistry;
    users: typeof users;
    workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {
    workflow: import('@convex-dev/workflow/_generated/component.js').ComponentApi<'workflow'>;
};

# WorkOS AuthKit for Next.js — Worker-Facing Reference

> Sources: github.com/workos/authkit-nextjs (v3.0.0), workos.com/docs/authkit/nextjs

## Overview

WorkOS AuthKit provides enterprise-ready authentication (SSO, MFA, user management, organizations) with a thin Next.js integration layer. Latest version: `@workos-inc/authkit-nextjs@3.0.0` (March 2026).

---

## 1. Installation

```bash
pnpm i @workos-inc/authkit-nextjs
# or
npm i @workos-inc/authkit-nextjs
```

---

## 2. Environment Variables

### Required

```bash
WORKOS_CLIENT_ID="client_..."            # from WorkOS Dashboard
WORKOS_API_KEY="sk_test_..."             # from WorkOS Dashboard
WORKOS_COOKIE_PASSWORD="<32+ chars>"     # openssl rand -base64 24
NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/callback"
```

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKOS_COOKIE_MAX_AGE` | `34560000` (400 days) | Cookie max age in seconds |
| `WORKOS_COOKIE_DOMAIN` | None | Share sessions across subdomains |
| `WORKOS_COOKIE_NAME` | `'wos-session'` | Session cookie name |
| `WORKOS_API_HOSTNAME` | `'api.workos.com'` | API base URL |
| `WORKOS_API_HTTPS` | `true` | Use HTTPS |
| `WORKOS_COOKIE_SAMESITE` | `'lax'` | `'lax'`, `'strict'`, or `'none'` |

---

## 3. Callback Route

Create an API route that matches `NEXT_PUBLIC_WORKOS_REDIRECT_URI`:

```ts
// app/callback/route.ts  (or app/auth/callback/route.ts)
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();
```

### With Options

```ts
export const GET = handleAuth({
  returnPathname: '/dashboard',        // redirect after sign-in
  baseURL: 'http://localhost:3000',    // for Docker/container deploys
  onSuccess: async ({ user, oauthTokens, authenticationMethod, organizationId, state }) => {
    // Persist tokens, record auth method, etc.
    await saveTokens(oauthTokens);
  },
  onError: async (error, request) => {
    // Custom error handling
  },
});
```

### `onSuccess` Callback Data

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User` | Authenticated user object |
| `accessToken` | `string` | JWT access token |
| `refreshToken` | `string` | Refresh token |
| `impersonator` | `Impersonator \| undefined` | Present if impersonated |
| `oauthTokens` | `OauthTokens \| undefined` | OAuth tokens from upstream |
| `authenticationMethod` | `string \| undefined` | How user authenticated (initial login only) |
| `organizationId` | `string \| undefined` | Organization context |
| `state` | `string \| undefined` | Custom state passed through auth flow |

---

## 4. Middleware / Proxy

### Next.js 16+ (proxy.ts)

```ts
// proxy.ts (project root)
import { authkitProxy } from '@workos-inc/authkit-nextjs';

export default authkitProxy();

export const config = { matcher: ['/', '/dashboard', '/admin'] };
```

### Next.js ≤15 (middleware.ts)

```ts
// middleware.ts (project root)
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware();

export const config = { matcher: ['/', '/dashboard', '/admin'] };
```

### With Options

```ts
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,              // protect all matched routes
    unauthenticatedPaths: [     // public routes
      '/',
      '/pricing',
      '/api/webhooks(.*)',
    ],
  },
  debug: true,                  // enable debug logs
  signUpPaths: ['/signup'],     // show sign-up screen instead of sign-in
});
```

---

## 5. Getting User Info in Server Components

### `withAuth()` — optional auth

```tsx
// app/dashboard/page.tsx
import { withAuth } from '@workos-inc/authkit-nextjs';

export default async function DashboardPage() {
  const { user } = await withAuth();

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {user.firstName}!</div>;
}
```

### `withAuth({ ensureSignedIn: true })` — required auth

```tsx
export default async function ProtectedPage() {
  // Redirects to AuthKit sign-in if no session
  const { user } = await withAuth({ ensureSignedIn: true });

  return <div>Hello, {user.firstName}</div>;
}
```

### Return Value

```ts
const {
  user,              // User | null
  sessionId,         // string
  organizationId,    // string | undefined
  role,              // string | undefined
  permissions,       // string[] | undefined
  entitlements,      // string[] | undefined
  impersonator,      // Impersonator | undefined
  accessToken,       // string
} = await withAuth();
```

⚠️ **Never wrap `withAuth({ ensureSignedIn: true })` in try/catch** — it uses Next.js redirect internally.

---

## 6. Client Components — `useAuth()` Hook

Wrap your app:

```tsx
// app/layout.tsx
import { AuthKitProvider } from '@workos-inc/authkit-nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <AuthKitProvider>{children}</AuthKitProvider>
    </body></html>
  );
}
```

Use in client components:

```tsx
'use client';
import { useAuth } from '@workos-inc/authkit-nextjs';

export function UserButton() {
  const { user, loading } = useAuth();
  if (loading) return <span>Loading...</span>;
  if (!user) return <a href="/signin">Sign in</a>;
  return <span>{user.firstName}</span>;
}
```

---

## 7. Sign In / Sign Out

### Sign In Button

```tsx
import { signIn } from '@workos-inc/authkit-nextjs';

export function SignInButton() {
  return (
    <form action={async () => {
      'use server';
      await signIn();
    }}>
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Sign Out Button

```tsx
import { signOut } from '@workos-inc/authkit-nextjs';

export function SignOutButton() {
  return (
    <form action={async () => {
      'use server';
      await signOut();
    }}>
      <button type="submit">Sign Out</button>
    </form>
  );
}
```

### Sign In with Custom State

```tsx
await signIn({
  state: JSON.stringify({ teamId: 'team_123' }),
});
```

---

## 8. Organization Switching

```tsx
import { switchToOrganization, getOrganization } from '@workos-inc/authkit-nextjs';

// Switch
await switchToOrganization('org_123');

// Get current
const org = await getOrganization();
```

---

## 9. Security Features (v3.0.0)

- **PKCE always enabled** — no `WORKOS_ENABLE_PKCE` env var needed
- **CSRF protection** via encrypted OAuth state + `wos-auth-verifier` cookie
- **CDN-safe headers** — automatic `Cache-Control: private, no-cache, no-store` on authenticated requests
- **Impersonation** support for admin workflows

---

## Common Gotchas

1. **Redirect URI must match** — `NEXT_PUBLIC_WORKOS_REDIRECT_URI` must match the route handler path AND the WorkOS Dashboard config.
2. **Cookie password ≥32 chars** — shorter passwords will fail silently.
3. **`withAuth()` in try/catch** — `ensureSignedIn: true` uses `redirect()` which throws; don't wrap in try/catch.
4. **`authenticationMethod` only on initial login** — not available on subsequent session refreshes.
5. **Next.js 16 uses `proxy.ts`** not `middleware.ts` — the import is `authkitProxy` not `authkitMiddleware`.
6. **Set default Logout URI** in WorkOS Dashboard for `signOut()` to work.
7. **Docker/containers** — pass `baseURL` explicitly to `handleAuth()`.

---

## YULA Integration Patterns

- **Replace Better Auth** with WorkOS AuthKit for enterprise SSO + user management
- **Middleware-level auth** protects all routes with `unauthenticatedPaths` for public pages
- **`withAuth()` in server components** for user-aware data fetching
- **Organization switching** maps to YULA's tiered access (Free/Pro/Enterprise)
- **`onSuccess` callback** for syncing user data to Convex on first login
- **Impersonation** for admin support workflows

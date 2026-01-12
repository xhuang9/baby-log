# Clerk Implementation Summary

## Post-Auth Flow
- Clerk sign-in/sign-up fallback redirects now point to `/post-auth` instead of `/dashboard`.
- `/post-auth` is a protected route handled under `src/app/[locale]/(auth)/(center)/post-auth/`.
- The server page runs once per login to:
  - Fetch the Clerk user from `clerkClient`.
  - Upsert the local `user` record by `clerk_id`, writing `email` and `first_name`.
  - Pass a trimmed user payload to the client.
- The client component:
  - Saves the payload to `sessionStorage` under `baby-log:user`.
  - Writes the payload into Zustand `useUserStore`.
  - Redirects to `/dashboard`.

## Data Stored
Stored user payload fields:
- `id`
- `firstName`
- `email`
- `imageUrl`

## Files
- `src/app/[locale]/(auth)/layout.tsx` (redirects to `/post-auth`)
- `src/proxy.ts` (protects `/post-auth`)
- `src/app/[locale]/(auth)/(center)/post-auth/page.tsx` (server upsert + payload)
- `src/app/[locale]/(auth)/(center)/post-auth/PostAuthClient.tsx` (session + Zustand)
- `src/stores/useUserStore.ts` (Zustand store)
- `src/models/Schema.ts` (`user.email`, `user.first_name`)

Question:

I saw a YouTube video teaching you build a notion based dashboard using clerk.
https://www.youtube.com/watch?v=nl0YSP8Pdm4

However the dashboard is using a popup to show the account dashboard.
In my application there is a settings page, that I need to control the route.

Base on my design and route what's the best way to do this?

Also this bottom bar in desktop will become a sidebar.
Most of my settings will not touch or work with clerk account settings e.g. change username firstname and last name. My application do not care and will not collect those information.
I just need the login state and clerk ID, and maybe a firstname or username to help them identify which account they login.

[./clerk-planning-img/image-desktop.png]
[./clerk-planning-img/image-mobile-settings.png]
[./clerk-planning-img/image-mobile.png]

=====

Best fit for your routing/design:

1) Keep /settings as your settings (units, theme, babies, etc.)

Everything app-specific stays in your DB keyed by clerkUserId.

For “Account name” in your UI, just display email (or username if you enable it). You can also disable first/last name so Clerk won’t expect it.  ￼

2) Put Clerk account settings on its own route (not a popup)

Create a dedicated page that mounts <UserProfile />:

Next.js App Router (important: optional catch-all route for Clerk routing):  ￼
app/settings/account/[[...user-profile]]/page.tsx

import { UserProfile } from "@clerk/nextjs";

export default function Page() {
  return <UserProfile />;
}

Now your Settings page can have a row like “Account & security” → /settings/account.

3) If you still use Clerk’s avatar menu, make “Manage account” navigate to your route

Instead of modal/popup:

<UserButton userProfileMode="navigation" userProfileUrl="/settings/account" />

That’s exactly what userProfileMode + userProfileUrl are for.  ￼

4) Optional: add links inside Clerk’s left nav back to your app settings

If you want Clerk’s left menu to include “App settings” (so users can jump between Clerk pages and your settings):  ￼

<UserProfile>
  <UserProfile.Link label="App settings" url="/settings" />
</UserProfile>

5) About “embedded vs full screen”

<UserProfile /> fills the container you give it. If you want a full-page feel, render /settings/account without your tight dashboard wrapper (or give it full-width content area).

This gives you:
	•	Your /settings page = the one users live in (your UI/DB)
	•	/settings/account = Clerk’s profile/security UI, routed like a normal page (no popup)  ￼

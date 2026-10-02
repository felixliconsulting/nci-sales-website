# Invite-only auth setup

1. In Supabase Dashboard → Authentication → Providers → Email: enable.
2. Authentication → Settings:
   - Disable “Allow new users to sign up” (or use invite-only).
   - Enable MFA (TOTP).
3. Invite Felix’s email from Authentication → Users → Invite.
4. After first login, copy the user UUID into `DASHBOARD_USER_ID`.
5. Confirm RLS: open an anonymous request to any health table — must return empty / denied.

## Storage (optional Garmin files)

Create a private bucket `garmin-imports` with RLS: only `auth.uid()` can upload/list own prefix `user_id/...`.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Pre-auth lookup used only to decide which second step LoginPage shows
// (password vs. email-OTP) — called before any session exists, so there's
// no Authorization header to check. Never returns the actual role or
// mfa_exempt — only the minimal routing decision — and returns "password"
// (the safe, existing-behavior default) for any email that doesn't match
// an account, so this can't be used to enumerate registered emails.
//
// This is necessarily a small role-disclosure oracle: learning an email
// resolves to "otp" tells an observer that account is an unprivileged,
// non-demo 'user' account. Accepted tradeoff — no rate-limiting is added
// here, matching every other endpoint in this codebase, which has none.
// verifyLoginOtp (AuthContext.tsx) re-checks role/mfa_exempt server-side
// via Supabase before granting the password/MFA bypass, so this endpoint
// is UI routing only, never access control.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data } = await serviceClient
      .from('profiles')
      .select('role, mfa_exempt')
      .ilike('email', email.trim())
      .maybeSingle();

    const usesOtp = !!data && data.role === 'user' && data.mfa_exempt === false;
    res.status(200).json({ method: usesOtp ? 'otp' : 'password' });
  } catch {
    // Fail safe to the existing, always-correct behavior.
    res.status(200).json({ method: 'password' });
  }
}

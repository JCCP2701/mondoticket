import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'organization' | 'user' | 'taquilla' | 'validador' | 'broker' | 'promotor';

export interface OrgMembership {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organizations: OrgMembership[];
  mfaExempt: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  mfaVerified: boolean;
  pendingRole: UserRole | null;
}

interface AuthContextType extends AuthState {
  // Returns the loaded profile (so the caller can route based on
  // profile.mfaExempt without waiting for a state re-render) or null on
  // failure.
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => void;
  verifyMFA: (code: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<AuthUser | null>;
  requestGuestOtp: (email: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  verifyGuestOtp: (email: string, code: string) => Promise<AuthUser | null>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  checkLoginMethod: (email: string) => Promise<'password' | 'otp'>;
  requestLoginOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyLoginOtp: (email: string, code: string) => Promise<{ user: AuthUser; skippedMfa: boolean } | null>;
  isFirstMFASetup: boolean;
  mfaQrCode: string | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string) => void;
  // True only until the initial session-restore effect finishes (session
  // fetch + profile load). ProtectedRoute must wait for this before deciding
  // to redirect to /login — otherwise every page refresh briefly sees
  // user=null and bounces an already-logged-in user out.
  authLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// Regular buyer accounts ('user' role) don't require MFA at all, for now —
// product decision to keep purchase friction low while MFA stays mandatory
// for staff/admin roles (superadmin, organization, taquilla, validador,
// broker, promotor). Demo accounts (mfa_exempt) are exempt regardless of
// role, same as before. This is the single source of truth for "does this profile
// need to go through /mfa" — used both to decide whether to run the TOTP
// enroll/challenge step and to decide where callers should navigate.
export function mfaRequired(profile: Pick<AuthUser, 'role' | 'mfaExempt'>): boolean {
  return profile.role !== 'user' && !profile.mfaExempt;
}

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, mfa_exempt, organization_members(organization_id, organizations(id, name))')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const organizations: OrgMembership[] = ((data as any).organization_members ?? [])
    .map((m: any) => m.organizations)
    .filter(Boolean)
    .map((o: any) => ({ id: o.id, name: o.name }));

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    avatar: data.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    organizations,
    mfaExempt: data.mfa_exempt ?? false,
  };
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  mfaVerified: false,
  pendingRole: null,
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [isFirstMFASetup, setIsFirstMFASetup] = useState(false);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const applyActiveOrg = (profile: AuthUser) => {
    setActiveOrganizationId((prev) =>
      prev && profile.organizations.some((o) => o.id === prev) ? prev : (profile.organizations[0]?.id ?? null)
    );
  };

  // Restore session (e.g. after a page refresh) and re-sync MFA/aal status.
  useEffect(() => {
    const restore = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) return;

        const profile = await loadProfile(session.user.id);
        if (!profile) return;
        applyActiveOrg(profile);

        if (!mfaRequired(profile)) {
          setState({ user: profile, isAuthenticated: true, mfaVerified: true, pendingRole: profile.role });
          return;
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const mfaVerified = aal?.currentLevel === 'aal2';

        setState({
          user: profile,
          isAuthenticated: mfaVerified,
          mfaVerified,
          pendingRole: profile.role,
        });
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  const beginMfaStep = async (profile: AuthUser) => {
    if (!mfaRequired(profile)) {
      setState({ user: profile, isAuthenticated: true, mfaVerified: true, pendingRole: profile.role });
      return;
    }

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');

    if (verifiedTotp) {
      setMfaFactorId(verifiedTotp.id);
      setMfaQrCode(null);
      setIsFirstMFASetup(false);
    } else {
      const { data: enrollData, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaFactorId(enrollData.id);
      setMfaQrCode(enrollData.totp.qr_code);
      setIsFirstMFASetup(true);
    }

    setState({ user: profile, isAuthenticated: false, mfaVerified: false, pendingRole: profile.role });
  };

  const login = async (email: string, password: string): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;

    const profile = await loadProfile(data.user.id);
    if (!profile) return null;

    applyActiveOrg(profile);
    await beginMfaStep(profile);
    return profile;
  };

  const register = async (name: string, email: string, password: string): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      // A returning guest-checkout customer hits this every time (their
      // email is already registered from a prior purchase, always with
      // this same fixed password) — fall back to signing them in instead
      // of failing outright. If it's a real account with a different
      // password (e.g. org/admin/user, or someone who registered via
      // /register with their own password), the login attempt below just
      // fails too and the caller sees register() return null as before.
      if (error.message?.toLowerCase().includes('already registered') || (error as any).code === 'user_already_exists') {
        return login(email, password);
      }
      return null;
    }
    if (!data.user) return null;

    // profiles row is auto-created by the handle_new_user() DB trigger.
    const profile = await loadProfile(data.user.id);
    if (!profile) return null;

    applyActiveOrg(profile);
    await beginMfaStep(profile);
    return profile;
  };

  // Guest checkout, passwordless: a one-time email code replaces the old
  // shared hardcoded password (every guest used to get the same literal
  // string, so anyone who knew a buyer's email could sign in as them and
  // clone their ticket QR). No MFA/TOTP step here — buyers mid-checkout
  // can't be expected to enroll an authenticator, and hold_event_seats /
  // create_order_and_tickets only require auth.uid() to be set, not aal2.
  const requestGuestOtp = async (email: string, name: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { name }, shouldCreateUser: true },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const verifyGuestOtp = async (email: string, code: string): Promise<AuthUser | null> => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.user) return null;

    const profile = await loadProfile(data.user.id);
    if (!profile) return null;

    applyActiveOrg(profile);
    return profile;
  };

  const sendPasswordReset = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const updatePassword = async (newPassword: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  // Pre-auth lookup so LoginPage knows whether to show the password step or
  // the email-code step for a given email. Never throws — a network/API
  // failure just falls back to the password step, which always works.
  const checkLoginMethod = async (email: string): Promise<'password' | 'otp'> => {
    try {
      const res = await fetch('/api/auth/login-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return 'password';
      const json = await res.json();
      return json.method === 'otp' ? 'otp' : 'password';
    } catch {
      return 'password';
    }
  };

  // Login-only OTP for regular ('user' role, non-demo) accounts. Unlike
  // requestGuestOtp, shouldCreateUser is false — a mistyped/unregistered
  // email in the login form must never silently create a new account.
  const requestLoginOtp = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const verifyLoginOtp = async (email: string, code: string): Promise<{ user: AuthUser; skippedMfa: boolean } | null> => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.user) return null;

    const profile = await loadProfile(data.user.id);
    if (!profile) return null;
    applyActiveOrg(profile);

    // beginMfaStep (via mfaRequired) is the single source of truth for
    // whether MFA is required — running it here, rather than trusting the
    // earlier /api/auth/login-method routing decision, means this method
    // can never be used (e.g. called directly, bypassing LoginPage) to
    // dodge password+MFA on an elevated, non-exempt account.
    await beginMfaStep(profile);
    return { user: profile, skippedMfa: !mfaRequired(profile) };
  };

  const verifyMFA = async (code: string): Promise<boolean> => {
    if (!mfaFactorId) return false;

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code });
    if (error) return false;

    setState((prev) => ({ ...prev, isAuthenticated: true, mfaVerified: true }));
    setMfaQrCode(null);
    setIsFirstMFASetup(false);
    return true;
  };

  const logout = () => {
    supabase.auth.signOut();
    setState(initialState);
    setMfaFactorId(null);
    setMfaQrCode(null);
    setIsFirstMFASetup(false);
    setActiveOrganizationId(null);
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, verifyMFA, register, requestGuestOtp, verifyGuestOtp, sendPasswordReset, updatePassword, checkLoginMethod, requestLoginOtp, verifyLoginOtp, isFirstMFASetup, mfaQrCode, activeOrganizationId, setActiveOrganizationId, authLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function dashboardPathForRole(role: UserRole | undefined): string {
  switch (role) {
    case 'superadmin': return '/admin';
    case 'organization': return '/organization';
    case 'taquilla': return '/taquilla';
    case 'validador': return '/validador';
    case 'broker': return '/broker';
    case 'promotor': return '/promotor';
    default: return '/wallet';
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'organization' | 'user' | 'taquilla';

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
  register: (name: string, email: string, password: string) => Promise<boolean>;
  isFirstMFASetup: boolean;
  mfaQrCode: string | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

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

  const applyActiveOrg = (profile: AuthUser) => {
    setActiveOrganizationId((prev) =>
      prev && profile.organizations.some((o) => o.id === prev) ? prev : (profile.organizations[0]?.id ?? null)
    );
  };

  // Restore session (e.g. after a page refresh) and re-sync MFA/aal status.
  useEffect(() => {
    const restore = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;

      const profile = await loadProfile(session.user.id);
      if (!profile) return;
      applyActiveOrg(profile);

      if (profile.mfaExempt) {
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
    };
    restore();
  }, []);

  const beginMfaStep = async (profile: AuthUser) => {
    // Demo accounts skip MFA entirely — never inferred from email, only the
    // per-profile mfa_exempt flag set explicitly for the 4 seeded demo users.
    if (profile.mfaExempt) {
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

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
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
      // fails too and the caller sees register() return false as before.
      if (error.message?.toLowerCase().includes('already registered') || (error as any).code === 'user_already_exists') {
        return !!(await login(email, password));
      }
      return false;
    }
    if (!data.user) return false;

    // profiles row is auto-created by the handle_new_user() DB trigger.
    const profile = await loadProfile(data.user.id);
    if (!profile) return false;

    applyActiveOrg(profile);
    await beginMfaStep(profile);
    return true;
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
      value={{ ...state, login, logout, verifyMFA, register, isFirstMFASetup, mfaQrCode, activeOrganizationId, setActiveOrganizationId }}
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
    default: return '/wallet';
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'organization' | 'user' | 'taquilla';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organizationName?: string;
  organizationId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  mfaVerified: boolean;
  pendingRole: UserRole | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  verifyMFA: (code: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  isFirstMFASetup: boolean;
  mfaQrCode: string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, organization_id, organizations(name)')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    avatar: data.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    organizationName: (data as any).organizations?.name,
    organizationId: data.organization_id ?? undefined,
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

  // Restore session (e.g. after a page refresh) and re-sync MFA/aal status.
  useEffect(() => {
    const restore = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;

      const profile = await loadProfile(session.user.id);
      if (!profile) return;

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

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;

    const profile = await loadProfile(data.user.id);
    if (!profile) return false;

    await beginMfaStep(profile);
    return true;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) return false;

    // profiles row is auto-created by the handle_new_user() DB trigger.
    const profile = await loadProfile(data.user.id);
    if (!profile) return false;

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
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, verifyMFA, register, isFirstMFASetup, mfaQrCode }}
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

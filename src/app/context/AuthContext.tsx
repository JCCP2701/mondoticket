import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'organization' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organizationName?: string;
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
  verifyMFA: (code: string) => boolean;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  isFirstMFASetup: boolean;
}

// ─── Mock Users DB ────────────────────────────────────────────────────────────
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'usr_admin_001',
    name: 'Carlos Mendoza',
    email: 'admin@ticketblessing.com',
    password: 'Admin123!',
    role: 'superadmin',
    avatar: 'CM',
  },
  {
    id: 'usr_org_001',
    name: 'Festival Conexión MX',
    email: 'org@ticketblessing.com',
    password: 'Org123!',
    role: 'organization',
    organizationName: 'Festival Conexión MX',
    avatar: 'FC',
  },
  {
    id: 'usr_end_001',
    name: 'Sofía Ramírez',
    email: 'user@ticketblessing.com',
    password: 'User123!',
    role: 'user',
    avatar: 'SR',
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'tb_auth_state';
const LS_REGISTERED_KEY = 'tb_registered_users';

function loadState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return { user: null, isAuthenticated: false, mfaVerified: false, pendingRole: null };
}

function saveState(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState);
  const [isFirstMFASetup] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Check mock users first
    let found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!found) {
      // Check dynamically registered users
      try {
        const registered = JSON.parse(localStorage.getItem(LS_REGISTERED_KEY) || '[]');
        found = registered.find(
          (u: AuthUser & { password: string }) =>
            u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
      } catch { }
    }

    if (found) {
      const { password: _pw, ...user } = found;
      setState({ user, isAuthenticated: false, mfaVerified: false, pendingRole: user.role });
      return true;
    }

    return false;
  };

  const verifyMFA = (code: string): boolean => {
    // Simulated: accept "123456" in dev, or any 6-digit code
    const isValid = code === '123456' || (code.length === 6 && /^\d{6}$/.test(code));
    if (isValid && state.user) {
      setState((prev) => ({ ...prev, isAuthenticated: true, mfaVerified: true }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState({ user: null, isAuthenticated: false, mfaVerified: false, pendingRole: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_REGISTERED_KEY) || '[]');

      // Check if user already exists (in mocks or dynamic)
      const isMock = MOCK_USERS.some(u => u.email.toLowerCase() === email.toLowerCase());
      const isDynamic = existing.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

      if (isMock || isDynamic) {
        if (isDynamic) {
          const { password: _pw, ...user } = isDynamic;
          setState({ user, isAuthenticated: false, mfaVerified: false, pendingRole: 'user' });
        } else {
          const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())!;
          const { password: _pw, ...user } = mockUser;
          setState({ user, isAuthenticated: false, mfaVerified: false, pendingRole: user.role });
        }
        return true; // Already exists, treat as "registered" and set state
      }

      const newUser: AuthUser & { password: string } = {
        id: `usr_${Date.now()}`,
        name,
        email,
        password,
        role: 'user',
        avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      };

      existing.push(newUser);
      localStorage.setItem(LS_REGISTERED_KEY, JSON.stringify(existing));
      const { password: _pw, ...user } = newUser;
      setState({ user, isAuthenticated: false, mfaVerified: false, pendingRole: 'user' });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, verifyMFA, register, isFirstMFASetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import * as neon from "./neonService";
import type { User } from "../types";
import type { RegisterData } from "../../pages/LoginPage";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (moved inline from companyFilter.ts)
// ─────────────────────────────────────────────────────────────────────────────
function getCurrentCompanyId() {
    return localStorage.getItem('estateflow_company_id') || localStorage.getItem('companyId') || null;
}

function setStoredCompanyId(id: string) {
    localStorage.setItem('companyId', id);
    localStorage.setItem('estateflow_company_id', id);
}
function clearStoredCompanyId() { localStorage.removeItem('companyId'); }
function clearAllStoredCompanyIds() {
    localStorage.removeItem('companyId');
    localStorage.removeItem('estateflow_company_id');
}

// Tipos de resposta para facilitar o uso no Front
export interface AuthResponse {
    user: User | null;
    error?: string;
}

// Funções auxiliares para Session Management
const SESSION_KEY = "estateflow_user_session";
const getSessionKey = (companyId = getCurrentCompanyId()) => (
    companyId ? `${SESSION_KEY}_${companyId}` : SESSION_KEY
);

const saveSession = (user: User) => {
    const companyId = user.company_id || getCurrentCompanyId();
    const { password: _password, ...safeUser } = user as any;
    localStorage.setItem(getSessionKey(companyId), JSON.stringify(safeUser));
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    window.dispatchEvent(new Event("auth-change"));
};

export const persistUserSession = (user: User) => {
    saveSession(user);
};

const clearSession = () => {
    localStorage.removeItem(getSessionKey());
    localStorage.removeItem(SESSION_KEY);
    clearAllStoredCompanyIds();
    window.dispatchEvent(new Event("auth-change"));
};

const getSession = (): User | null => {
    const session = localStorage.getItem(getSessionKey()) || localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const user = JSON.parse(session) as User;
    const currentCompanyId = getCurrentCompanyId();
    if (currentCompanyId && user.company_id && user.company_id !== currentCompanyId) {
        return null;
    }
    if (user && !Array.isArray(user.favorites)) {
        user.favorites = [];
    }
    return user;
};

// Hash de senha simples usando Web Crypto API
async function hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Funções de Autenticação ---

export const registerUser = async (data: RegisterData, companyId = getCurrentCompanyId() || 'default'): Promise<AuthResponse> => {
    try {
        const effectiveCompanyId = companyId || getCurrentCompanyId() || 'default';
        // Verificar se usuário já existe pelo email
        setStoredCompanyId(effectiveCompanyId);
        const existingByEmail = await neon.getUserByEmail(data.email);
        if (existingByEmail) {
            return { user: null, error: "Este email já está cadastrado." };
        }
        
        const emailKey = data.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const companyKey = effectiveCompanyId.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userId = `${companyKey}_${emailKey}`;
        const hashedPassword = await hashPassword(data.password);

        const userData: User = {
            id: userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: (data.email === 'admin@estateflow.com' ? 'admin' : data.role) as any,
            favorites: [],
            password: hashedPassword,
            company_id: effectiveCompanyId,
        } as any;

        await neon.upsertUser(userData);
        saveSession(userData);
        
        return { user: userData };

    } catch (error: any) {
        console.error("Erro ao registrar:", error);
        return { user: null, error: "Erro ao criar conta no banco de dados." };
    }
};

export const loginUser = async (email: string, pass: string, companyId = getCurrentCompanyId() || 'default'): Promise<AuthResponse> => {
    try {
        const effectiveCompanyId = companyId || getCurrentCompanyId() || 'default';
        setStoredCompanyId(effectiveCompanyId);
        const user = await neon.getUserByEmail(email) as any;

        if (!user) {
            return { user: null, error: "Usuário não encontrado." };
        }

        const hashedInput = await hashPassword(pass);
        if (user.password !== hashedInput) {
            return { user: null, error: "Senha incorreta." };
        }

        const { password, ...safeUser } = user;
        if (!Array.isArray(safeUser.favorites)) {
            safeUser.favorites = [];
        }
        
        const userCompanyId = (safeUser as any).company_id || effectiveCompanyId;
        setStoredCompanyId(userCompanyId);
        
        saveSession(safeUser);
        
        return { user: safeUser as User };
    } catch (error: any) {
        console.error("Erro ao logar:", error);
        return { user: null, error: "Erro ao autenticar no servidor." };
    }
};

export const logoutUser = async () => {
    clearSession();
};

export const loginWithGoogle = async (email: string, name: string, avatar: string, company_id = getCurrentCompanyId() || 'default'): Promise<AuthResponse> => {
    try {
        const effectiveCompanyId = company_id || getCurrentCompanyId() || 'default';
        setStoredCompanyId(effectiveCompanyId);
        const existingUser = await neon.getUserByEmail(email);
        if (existingUser) {
            const { password: _, ...safeUser } = existingUser as any;
            if (!Array.isArray(safeUser.favorites)) safeUser.favorites = [];
            setStoredCompanyId(safeUser.company_id || effectiveCompanyId);
            saveSession(safeUser);
            return { user: safeUser as User };
        }

        const emailKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const companyKey = effectiveCompanyId.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userId = `${companyKey}_${emailKey}`;
        const newUser: User = {
            id: userId,
            name,
            email,
            avatar,
            role: 'client',
            favorites: [],
            company_id: effectiveCompanyId,
        } as any;

        await neon.upsertUser(newUser);
        setStoredCompanyId(effectiveCompanyId);
        saveSession(newUser);
        return { user: newUser };
    } catch (error: any) {
        console.error("Erro no login com Google:", error);
        return { user: null, error: "Erro ao autenticar com Google." };
    }
};

// Hook para observar o estado
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    const handleAuthChange = () => {
        callback(getSession());
    };

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    
    // Check inicial
    callback(getSession());

    return () => {
        window.removeEventListener("auth-change", handleAuthChange);
        window.removeEventListener("storage", handleAuthChange);
    };
};

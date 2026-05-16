import * as neon from "./neonService";
import type { User } from "../types";
import type { RegisterData } from "../../pages/LoginPage";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (moved inline from companyFilter.ts)
// ─────────────────────────────────────────────────────────────────────────────
function setStoredCompanyId(id: string) { localStorage.setItem('companyId', id); }
function clearStoredCompanyId() { localStorage.removeItem('companyId'); }

// Tipos de resposta para facilitar o uso no Front
export interface AuthResponse {
    user: User | null;
    error?: string;
}

// Funções auxiliares para Session Management
const SESSION_KEY = "estateflow_user_session";

const saveSession = (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth-change"));
};

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    clearStoredCompanyId();
    localStorage.removeItem('estateflow_company_id');
    localStorage.removeItem('estateflow_company_data');
    localStorage.removeItem('estateflow_company_settings');
    window.dispatchEvent(new Event("auth-change"));
};

const getSession = (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const user = JSON.parse(session) as User;
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

export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
    try {
        // Verificar se usuário já existe pelo email
        const existingByEmail = await neon.getUserByEmail(data.email);
        if (existingByEmail) {
            return { user: null, error: "Este email já está cadastrado." };
        }
        
        const userId = data.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const hashedPassword = await hashPassword(data.password);

        const companyId = 'default';
        setStoredCompanyId(companyId);

        const userData: User = {
            id: userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: (data.email === 'admin@estateflow.com' ? 'admin' : data.role) as any,
            favorites: [],
            password: hashedPassword,
            company_id: companyId,
        } as any;

        await neon.upsertUser(userData);
        saveSession(userData);
        
        return { user: userData };

    } catch (error: any) {
        console.error("Erro ao registrar:", error);
        return { user: null, error: "Erro ao criar conta no banco de dados." };
    }
};

export const loginUser = async (email: string, pass: string): Promise<AuthResponse> => {
    try {
        const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const user = await neon.getUserById(userId) as any;

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
        
        const companyId = (safeUser as any).company_id || 'default';
        setStoredCompanyId(companyId);
        
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

export const loginWithGoogle = async (email: string, name: string, avatar: string, company_id = 'default'): Promise<AuthResponse> => {
    try {
        const existingUser = await neon.getUserByEmail(email);
        if (existingUser) {
            const { password: _, ...safeUser } = existingUser as any;
            if (!Array.isArray(safeUser.favorites)) safeUser.favorites = [];
            setStoredCompanyId(safeUser.company_id || company_id);
            saveSession(safeUser);
            return { user: safeUser as User };
        }

        const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const newUser: User = {
            id: userId,
            name,
            email,
            avatar,
            role: 'client',
            favorites: [],
            company_id,
        } as any;

        await neon.upsertUser(newUser);
        setStoredCompanyId(company_id);
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
    
    // Check inicial
    callback(getSession());

    return () => window.removeEventListener("auth-change", handleAuthChange);
};


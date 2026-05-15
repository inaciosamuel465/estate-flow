import * as neon from "./neonService";
import type { User } from "../types";
import type { RegisterData } from "../../pages/LoginPage";

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
    window.dispatchEvent(new Event("auth-change"));
};

const getSession = (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
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


        const userData: User = {
            id: userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: (data.email === 'admin@estateflow.com' ? 'admin' : data.role) as any,
            favorites: [],
            password: hashedPassword // Campo novo
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


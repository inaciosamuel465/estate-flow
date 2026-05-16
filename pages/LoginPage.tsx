import React, { useState } from 'react';
import { loginUser, registerUser, loginWithGoogle } from '../src/services/authService';
import { GoogleLogin } from '@react-oauth/google';
import type { User } from '../src/types';

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'client' | 'owner';
}

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (user: User) => void;
  onCancel: () => void;
  companyId?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onRegisterSuccess, onCancel, companyId }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'client' | 'owner'>('client');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // Login com Firebase
        const response = await loginUser(email, password);
        if (response.user) {
          onLoginSuccess(response.user);
        } else {
          setError(response.error || "Falha no login");
        }
      } else {
        // Registro com Firebase
        if (!regName || !regEmail || !regPhone || !regPassword) {
          setError("Preencha todos os campos.");
          setIsLoading(false);
          return;
        }

        const data: RegisterData = {
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          role: regRole
        };

        const response = await registerUser(data);
        if (response.user) {
          onRegisterSuccess(response.user);
        } else {
          setError(response.error || "Falha no cadastro");
        }
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-10">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">roofing</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
          <p className="text-slate-500 text-sm mt-1">Acesse sua área exclusiva</p>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setIsLoginMode(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLoginMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLoginMode(false)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLoginMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* REGISTER FIELDS */}
          {!isLoginMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Eu sou:</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${regRole === 'client' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <input type="radio" name="role" className="hidden" checked={regRole === 'client'} onChange={() => setRegRole('client')} />
                    <span className="material-symbols-outlined">person</span>
                    <span className="text-xs font-bold">Cliente</span>
                  </label>
                  <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${regRole === 'owner' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <input type="radio" name="role" className="hidden" checked={regRole === 'owner'} onChange={() => setRegRole('owner')} />
                    <span className="material-symbols-outlined">keys</span>
                    <span className="text-xs font-bold">Anunciante</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  placeholder="Seu nome"
                  required={!isLoginMode}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  placeholder="(00) 00000-0000"
                  required={!isLoginMode}
                />
              </div>
            </>
          )}

          {/* COMMON FIELDS */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
              <input
                type="email"
                value={isLoginMode ? email : regEmail}
                onChange={(e) => isLoginMode ? setEmail(e.target.value) : setRegEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                placeholder="nome@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
              <input
                type="password"
                value={isLoginMode ? password : regPassword}
                onChange={(e) => isLoginMode ? setPassword(e.target.value) : setRegPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {isLoading ? (
              <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isLoginMode ? 'Entrar' : 'Criar Conta'}</span>
                <span className="material-symbols-outlined text-[20px]">{isLoginMode ? 'login' : 'person_add'}</span>
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-slate-400 font-medium">ou</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const payload = JSON.parse(atob(credentialResponse.credential!.split('.')[1]));
                const response = await loginWithGoogle(payload.email, payload.name, payload.picture, companyId);
                if (response.user) {
                  onLoginSuccess(response.user);
                } else {
                  setError(response.error || "Erro ao autenticar com Google");
                }
              } catch (err) {
                setError("Erro ao processar login com Google");
              }
            }}
            onError={() => setError("Erro ao autenticar com Google")}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>

        <div className="mt-6 text-center">
          <button onClick={onCancel} className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
            ← Voltar para o Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
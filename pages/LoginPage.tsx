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
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';
  const [isInviteMode, setIsInviteMode] = useState(Boolean(inviteToken));
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'client' | 'owner'>('client');

  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirm, setInviteConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleActivateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!invitePassword || invitePassword.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (invitePassword !== inviteConfirm) {
      setError('As senhas nao conferem.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agency/activate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, password: invitePassword, company_id: companyId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        setError(data.error || 'Nao foi possivel ativar este convite.');
        return;
      }

      setSuccess('Acesso ativado. Entre com o email do administrador e a senha criada.');
      setInvitePassword('');
      setInviteConfirm('');
      setIsInviteMode(false);
      setIsLoginMode(true);
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      setError('Ocorreu um erro ao ativar o convite.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        const response = await loginUser(email, password, companyId);
        if (response.user) {
          onLoginSuccess(response.user);
        } else {
          setError(response.error || 'Falha no login');
        }
      } else {
        if (!regName || !regEmail || !regPhone || !regPassword) {
          setError('Preencha todos os campos.');
          setIsLoading(false);
          return;
        }

        const data: RegisterData = {
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          role: regRole,
        };

        const response = await registerUser(data, companyId);
        if (response.user) {
          onRegisterSuccess(response.user);
        } else {
          setError(response.error || 'Falha no cadastro');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 py-10">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">roofing</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isInviteMode ? 'Ativar acesso admin' : isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isInviteMode ? 'Defina sua senha para administrar esta imobiliaria' : 'Acesse sua area exclusiva'}
          </p>
        </div>

        {!isInviteMode && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 min-h-10 px-3 text-sm font-bold rounded-lg transition-all ${isLoginMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 min-h-10 px-3 text-sm font-bold rounded-lg transition-all ${!isLoginMode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {isInviteMode ? (
          <form onSubmit={handleActivateInvite} className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-600">
              Este convite e exclusivo desta imobiliaria. Depois de ativar, use o email cadastrado pelo master para entrar no painel admin.
            </div>

            <PasswordInput label="Nova senha" value={invitePassword} onChange={setInvitePassword} placeholder="Minimo 6 caracteres" icon="lock" />
            <PasswordInput label="Confirmar senha" value={inviteConfirm} onChange={setInviteConfirm} placeholder="Repita a senha" icon="verified_user" />

            <Message error={error} success={success} />

            <PrimarySubmit loading={isLoading} label="Ativar acesso" icon="key" />
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Eu sou:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <RoleCard active={regRole === 'client'} icon="person" label="Cliente" onClick={() => setRegRole('client')} />
                    <RoleCard active={regRole === 'owner'} icon="keys" label="Anunciante" onClick={() => setRegRole('owner')} />
                  </div>
                </div>

                <TextInput label="Nome Completo" value={regName} onChange={setRegName} placeholder="Seu nome" required />
                <TextInput label="Telefone / WhatsApp" type="tel" value={regPhone} onChange={setRegPhone} placeholder="(00) 00000-0000" required />
              </>
            )}

            <TextInput
              label="Email"
              type="email"
              value={isLoginMode ? email : regEmail}
              onChange={isLoginMode ? setEmail : setRegEmail}
              placeholder="nome@email.com"
              icon="mail"
              required
            />
            <PasswordInput
              label="Senha"
              value={isLoginMode ? password : regPassword}
              onChange={isLoginMode ? setPassword : setRegPassword}
              placeholder="********"
              icon="lock"
            />

            <Message error={error} success={success} />

            <PrimarySubmit loading={isLoading} label={isLoginMode ? 'Entrar' : 'Criar Conta'} icon={isLoginMode ? 'login' : 'person_add'} />
          </form>
        )}

        {!isInviteMode && (
          <>
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
                      setError(response.error || 'Erro ao autenticar com Google');
                    }
                  } catch (err) {
                    setError('Erro ao processar login com Google');
                  }
                }}
                onError={() => setError('Erro ao autenticar com Google')}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
              />
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <button type="button" onClick={onCancel} className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
            Voltar para o site
          </button>
        </div>
      </div>
    </div>
  );
};

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: string;
}> = ({ label, value, onChange, placeholder, type = 'text', required, icon }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none`}
        placeholder={placeholder}
        required={required}
      />
    </div>
  </div>
);

const PasswordInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: string;
}> = ({ label, value, onChange, placeholder, icon }) => (
  <TextInput label={label} type="password" value={value} onChange={onChange} placeholder={placeholder} icon={icon} required />
);

const RoleCard: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${active ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
    <input type="radio" name="role" className="hidden" checked={active} onChange={onClick} />
    <span className="material-symbols-outlined">{icon}</span>
    <span className="text-xs font-bold">{label}</span>
  </label>
);

const Message: React.FC<{ error: string; success: string }> = ({ error, success }) => {
  if (error) {
    return (
      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">error</span>
        {error}
      </div>
    );
  }
  if (success) {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        {success}
      </div>
    );
  }
  return null;
};

const PrimarySubmit: React.FC<{ loading: boolean; label: string; icon: string }> = ({ loading, label, icon }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full min-h-12 px-5 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
  >
    {loading ? <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
      <>
        <span>{label}</span>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </>
    )}
  </button>
);

export default LoginPage;

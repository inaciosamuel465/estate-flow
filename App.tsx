import React, { useState, useEffect, useMemo } from 'react';
import { useCompany } from './src/contexts/CompanyContext';
import MasterApp from './MasterApp';

// Admin Components
import AdminDashboard from './pages/AdminDashboard';
import NewListing from './pages/NewListing';
import InteractiveMap from './pages/InteractiveMap';
import ClientProfile from './pages/ClientProfile';
import PropertyDetails from './pages/PropertyDetails';
import ImageStudio from './pages/ImageStudio';
import AreaSimulation from './pages/AreaSimulation';
import ListingsManagement from './pages/ListingsManagement';
import FinancialManagement from './pages/FinancialManagement';
import MarketingStudio from './pages/MarketingStudio';
import PropertyOperations from './pages/PropertyOperations';
import ContractsPage from './pages/ContractsPage';
import Analytics from './pages/Analytics';
import AIAnalytics from './pages/AIAnalytics';
import UsersManagement from './pages/UsersManagement';
import AdminSettings from './pages/AdminSettings';
import NotificationCenter from './components/NotificationCenter';
import WhatsAppButton from './components/WhatsAppButton';
import PublicContractSign from './pages/PublicContractSign';
import SubscriptionPlans from './pages/SubscriptionPlans';
import PaymentResult from './pages/PaymentResult';
import SaasHome from './pages/SaasHome';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './src/contexts/NotificationContext';

import {
  subscribeToAuthChanges,
  logoutUser,
  persistUserSession
} from './src/services/authService';
import {
  getProperties,
  getContracts,
  getUsers,
  addProperty,
  updateProperty,
  deleteProperty,
  addContract,
  deleteContract,
  updateContract as updateContractService,
  toggleFavorite,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getSettings,
  updateSetting
} from './src/services/dataService';
import LoginPage, { RegisterData } from './pages/LoginPage';
import ClientHome from './pages/ClientHome';
import OwnerLanding from './pages/OwnerLanding';
import UserDashboard from './pages/UserDashboard';
import ProfileSettings from './pages/ProfileSettings';
import {
  addUser,
  updateUser,
  deleteUser as deleteUserService,
  logActivity,
} from './src/services/dataService';
import {
  createContractNotification,
  createPropertyNotification,
} from './src/services/notificationHelpers';
import ReactPlayer from 'react-player';

// --- Types ---
import { User, Property, Contract, AppNotification } from './src/types';
export { AppErrorBoundary } from './components/AppErrorBoundary';

// Wrapper de Scroll
const PublicLayout = ({ children }: { children?: React.ReactNode }) => (
  <div className="min-h-screen w-full bg-slate-50 scroll-smooth">
    {children}
  </div>
);

const ROOT_ONLY_PATHS = ['master', 'plans', 'payment'];
const LEGACY_TENANT_PATHS = ['login', 'admin', 'dashboard', 'advertise', 'property', 'Estate', 'contrato', 'properties'];

const getStoredTenantSlug = () => {
  try {
    return localStorage.getItem('estateflow_last_slug');
  } catch {
    return null;
  }
};

const isSafeTenantReturnPath = (path: string | null) => {
  if (!path || !path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path === '/login' || path.startsWith('/login?')) return false;
  if (path === '/') return true;
  return /^\/(admin|dashboard|profile|property|properties|advertise|plans|contrato)(\/|$)/.test(path);
};

const App: React.FC = () => {
  const { company, companySettings, refreshCompany, isLoading: isCompanyLoading } = useCompany();

  // --- AI States ---
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showPropertyPreview, setShowPropertyPreview] = useState<string | null>(null);

  // --- Music State ---
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // --- Global State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // --- Auth Subscription & Data Loading ---
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });

    const unsubscribeNotifications = subscribeToNotifications((notifs) => {
      setNotifications(notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, currentUser?.id ? String(currentUser.id) : undefined);

    if (isCompanyLoading) {
      return () => {
        unsubscribeAuth();
        unsubscribeNotifications();
      };
    }

    const first = window.location.pathname.split('/').filter(Boolean)[0] || null;
    const isRootOnlyRoute = !first || ROOT_ONLY_PATHS.includes(first);
    if (isRootOnlyRoute) {
      setProperties([]);
      setContracts([]);
      setUsers([]);
      setIsInitialLoading(false);
      return () => {
        unsubscribeAuth();
        unsubscribeNotifications();
      };
    }

    if (!company?.id) {
      setProperties([]);
      setContracts([]);
      setUsers([]);
      setIsInitialLoading(false);
      return () => {
        unsubscribeAuth();
        unsubscribeNotifications();
      };
    }

    setIsInitialLoading(true);

    // Carregar dados reais somente depois que o tenant foi resolvido.
    const loadData = async () => {
      try {
        setDataLoadError(null);
        const [props, conts, userList, globalSettings] = await Promise.all([
          getProperties(),
          getContracts(),
          getUsers(),
          getSettings(),
        ]);
        setProperties(props);
        setContracts(conts);
        setUsers(userList);
        setSettings(globalSettings);
      } catch (err: any) {
        console.error('Falha ao carregar dados iniciais:', err);
        setDataLoadError('Não foi possível conectar ao banco de dados. Verifique sua conexão e recarregue.');
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadData();

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications();
    };
  }, [company?.id, currentUser?.id, isCompanyLoading]);

  // --- Dynamic Branding Injection (Company-aware) ---
  useEffect(() => {
    const primaryColor = companySettings?.primary_color || settings.primaryColor || '#4f46e5';
    const secondaryColor = companySettings?.secondary_color || '#1e40af';
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-secondary', secondaryColor);

    if (companySettings?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = companySettings.favicon_url;
    }
  }, [settings.primaryColor, companySettings]);

  // --- Notifications State ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // --- Navigation State ---
  const navigate = useNavigate();
  const location = useLocation();

  // Extract slug from URL path (e.g., /estate1/admin/dashboard -> slug=estate1)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0] || null;
  const SYSTEM_PATHS = [...ROOT_ONLY_PATHS, 'plans', ...LEGACY_TENANT_PATHS];

  const isSystemRoute = !firstSegment || firstSegment === '' || SYSTEM_PATHS.includes(firstSegment) || firstSegment.startsWith('Estate');
  const routeSlug = isSystemRoute ? null : firstSegment;
  const subpath = routeSlug ? '/' + pathParts.slice(1).join('/') : location.pathname;
  const tenantSlug = routeSlug || company?.slug || getStoredTenantSlug();
  const tenantPrefix = tenantSlug ? `/${tenantSlug}` : '';
  const isAdminRoute = !!routeSlug && subpath.startsWith('/admin');
  const isUserProtectedRoute = !!routeSlug && (subpath === '/dashboard' || subpath === '/profile');
  const tenantReturnKey = tenantSlug ? `estateflow_return_to_${tenantSlug}` : null;

  const getTenantPath = (path = subpath) => `${tenantPrefix}${path === '/' ? '' : path}`;

  const rememberReturnTo = (path = subpath) => {
    if (!tenantReturnKey || !isSafeTenantReturnPath(path)) return;
    localStorage.setItem(tenantReturnKey, path);
  };

  const getLoginPath = (returnPath?: string) => {
    const safeReturnPath = isSafeTenantReturnPath(returnPath || null) ? returnPath : null;
    const query = safeReturnPath ? `?next=${encodeURIComponent(safeReturnPath)}` : '';
    return tenantPrefix ? `${tenantPrefix}/login${query}` : '/';
  };

  const goToLogin = (returnPath = subpath) => {
    rememberReturnTo(returnPath);
    navigate(getLoginPath(returnPath));
  };

  const leaveLogin = () => {
    const params = new URLSearchParams(location.search);
    const nextFromQuery = params.get('next');
    const nextFromStorage = tenantReturnKey ? localStorage.getItem(tenantReturnKey) : null;
    const nextPath = isSafeTenantReturnPath(nextFromQuery) ? nextFromQuery : nextFromStorage;
    if (tenantReturnKey) localStorage.removeItem(tenantReturnKey);

    if (nextPath && !nextPath.startsWith('/admin')) {
      navigate(getTenantPath(nextPath), { replace: true });
      return;
    }

    setCurrentView('home');
  };

  // --- Redirect Guard: all company URLs must have slug ---
  useEffect(() => {
    if (isCompanyLoading) return;
    const first = location.pathname.split('/').filter(Boolean)[0];
    const lastSlug = getStoredTenantSlug() || company?.slug || null;

    if (!first) {
      const storedSlug = getStoredTenantSlug();
      const pwaRedirect = localStorage.getItem('estateflow_pwa_redirect') === 'true';
      if (storedSlug && pwaRedirect) {
        navigate(`/${storedSlug}`, { replace: true });
        return;
      }
      return;
    }

    if (!routeSlug && LEGACY_TENANT_PATHS.includes(first)) {
      if (lastSlug) {
        const rest = location.pathname.split('/').filter(Boolean).slice(1).join('/');
        const normalizedFirst = first === 'Estate' ? 'property' : first;
        navigate(`/${lastSlug}/${normalizedFirst}${rest ? `/${rest}` : ''}${location.search || ''}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    if (routeSlug && !company) {
      return;
    }

    if (subpath.startsWith('/Estate/')) {
      const id = subpath.split('/')[2];
      navigate(`${tenantPrefix}/property/${id}`, { replace: true });
      return;
    }
  }, [isCompanyLoading, location.pathname, company, routeSlug, subpath, tenantPrefix, navigate]);

  useEffect(() => {
    if (isInitialLoading || isCompanyLoading || (!isAdminRoute && !isUserProtectedRoute)) return;

    if ((isAdminRoute || isUserProtectedRoute) && !currentUser) {
      rememberReturnTo(subpath);
      navigate(getLoginPath(subpath), { replace: true });
      return;
    }

    if (isAdminRoute && currentUser.role !== 'admin') {
      navigate(`${tenantPrefix}/dashboard`, { replace: true });
    }
  }, [currentUser, isAdminRoute, isUserProtectedRoute, isCompanyLoading, isInitialLoading, subpath, tenantPrefix, navigate]);

  const currentView = React.useMemo(() => {
    const p = subpath;
    if (p.startsWith('/property/')) return 'details';
    if (p.startsWith('/Estate/')) return 'details';
    if (p.startsWith('/admin/details/')) return 'admin-details';
    if (p === '/login') return 'login';
    if (p === '/advertise') return 'advertise';
    if (p === '/dashboard') return 'user-dashboard';
    if (p === '/profile') return 'profile-settings';
    if (p === '/payment/success') return 'payment-success';
    if (p === '/payment/failure') return 'payment-failure';
    if (p === '/payment/pending') return 'payment-pending';
    if (p.startsWith('/plans')) return 'plans';
    if (p.startsWith('/contrato/')) return 'public-contract';
    if (p.startsWith('/admin')) {
      if (p === '/admin') return 'dashboard';
      if (p === '/admin/dashboard') return 'dashboard';
      if (p === '/admin/listings') return 'all-listings';
      if (p === '/admin/properties') return 'all-listings';
      if (p === '/admin/listing/new') return 'listing';
      if (p === '/admin/listing/edit') return 'edit-listing';
      if (p === '/admin/financial') return 'financial';
      if (p === '/admin/operations') return 'operations';
      if (p === '/admin/contracts') return 'contracts';
      if (p === '/admin/marketing') return 'marketing';
      if (p === '/admin/map') return 'map';
      if (p === '/admin/crm') return 'crm';
      if (p === '/admin/ai') return 'ai';
      if (p === '/admin/ai-analytics') return 'ai-analytics';
      if (p === '/admin/analytics') return 'analytics';
      if (p === '/admin/profile-settings') return 'profile-settings';
      if (p === '/admin/settings') return 'settings';
      if (p === '/admin/users') return 'users';
      return 'dashboard';
    }
    if (p === '/properties') return 'all-listings';
    // If at root with slug (e.g., /estate1), show agency home
    if (routeSlug && (p === '/' || p === '')) return 'home';
    // If at root with no slug, show SaasHome
    if (p === '/' || p === '') return 'saas-home';
    return 'home';
  }, [subpath, routeSlug]);

  const selectedPropertyId = React.useMemo(() => {
    const p = subpath;
    if (p.startsWith('/property/')) return p.split('/')[2];
    if (p.startsWith('/Estate/')) return p.split('/')[2];
    if (p.startsWith('/admin/details/')) return p.split('/')[3];
    return null;
  }, [subpath]);

  const selectedContractId = React.useMemo(() => {
    const p = subpath;
    if (p.startsWith('/contrato/')) return p.split('/')[2];
    return null;
  }, [subpath]);

  const setCurrentView = (view: string, customSlug?: string) => {
    const s = customSlug || tenantSlug || null;
    const pref = s ? `/${s}` : '';
    const viewMap: Record<string, string> = {
      'dashboard': s ? `${pref}/admin` : '/',
      'all-listings': s ? `${pref}/admin/properties` : '/',
      'listing': s ? `${pref}/admin/listing/new` : '/',
      'edit-listing': s ? `${pref}/admin/listing/edit` : '/',
      'financial': s ? `${pref}/admin/financial` : '/',
      'operations': s ? `${pref}/admin/operations` : '/',
      'contracts': s ? `${pref}/admin/contracts` : '/',
      'marketing': s ? `${pref}/admin/marketing` : '/',
      'map': s ? `${pref}/admin/map` : '/',
      'crm': s ? `${pref}/admin/crm` : '/',
      'ai': s ? `${pref}/admin/ai` : '/',
      'ai-analytics': s ? `${pref}/admin/ai-analytics` : '/',
      'analytics': s ? `${pref}/admin/analytics` : '/',
      'profile-settings': s ? `${pref}/admin/profile-settings` : '/',
      'client-profile-settings': s ? `${pref}/profile` : '/',
      'settings': s ? `${pref}/admin/settings` : '/',
      'users': s ? `${pref}/admin/users` : '/',
      'home': s ? `/${s}` : '/',
      'login': s ? `/${s}/login` : '/',
      'advertise': s ? `/${s}/advertise` : '/advertise',
      'user-dashboard': s ? `/${s}/dashboard` : '/',
      'plans': s ? `/${s}/plans` : '/plans',
      'payment-success': '/payment/success',
      'payment-failure': '/payment/failure',
      'payment-pending': '/payment/pending',
    };
    if (viewMap[view]) {
      navigate(viewMap[view]);
    }
  };

  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Check for expiring contracts ---
  useEffect(() => {
    const checkExpiringContracts = async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const contract of contracts) {
        if (contract.endDate && contract.status === 'active') {
          const endDate = new Date(contract.endDate);
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Notificar se faltam 30, 15 ou 7 dias
          if (daysLeft === 30 || daysLeft === 15 || daysLeft === 7) {
            // Verificar se já existe notificação para este contrato neste período
            const existingNotif = notifications.find(n =>
              n.type === 'contract' &&
              n.message.includes(contract.propertyTitle) &&
              n.message.includes('vence')
            );

            if (!existingNotif) {
              const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
              await createContractNotification(adminId, contract.id, contract.propertyTitle, 'expiring');
            }
          }
        }
      }
    };

    // Verificar ao carregar e depois a cada 24 horas
    if (contracts.length > 0 && currentUser?.role === 'admin') {
      checkExpiringContracts();
      const interval = setInterval(checkExpiringContracts, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [contracts, currentUser, notifications]);

  // Deep linking is now natively handled by React Router via location.pathname and currentView / selectedPropertyId derivations

  // --- CRUD Handlers ---


  // --- CRUD Handlers ---

  const handleAddProperty = async (newProperty: Property) => {
    setProperties(prev => [newProperty, ...prev]);
    setCurrentView('all-listings');
    await addProperty(newProperty);
    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    await createPropertyNotification(adminId, newProperty.title, 'created');
    await logActivity(adminId, currentUser?.name, 'create', 'property', String(newProperty.id), `Imóvel "${newProperty.title}" cadastrado`);
  };

  const handleUpdateProperty = async (id: number | string, updatedData: Partial<Property>) => {
    setProperties(prev => prev.map(p =>
      p.id === id ? { ...p, ...updatedData } : p
    ));
    if (currentView === 'edit-listing') {
      setCurrentView('all-listings');
      setPropertyToEdit(null);
    }
    await updateProperty(String(id), updatedData);
    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    await logActivity(adminId, currentUser?.name, 'update', 'property', String(id), `Imóvel ID ${id} atualizado`);
  };

  const handleDeleteProperty = async (id: number | string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    await deleteProperty(String(id));
    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    await logActivity(adminId, currentUser?.name, 'delete', 'property', String(id), `Imóvel ID ${id} removido`);
  };

  const handleEditFull = (property: Property) => {
    setPropertyToEdit(property);
    setCurrentView('edit-listing');
  };

  // --- Handlers de Contratos ---
  const handleAddContract = async (newContract: Contract) => {
    setContracts(prev => [newContract, ...prev]);
    if (newContract.type === 'rent') {
      handleUpdateProperty(newContract.propertyId, { status: 'rented' });
    } else {
      handleUpdateProperty(newContract.propertyId, { status: 'sold' });
    }
    await addContract(newContract);

    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    // Create notifications
    await createContractNotification(adminId, newContract.id, newContract.propertyTitle, 'created');
    await createPropertyNotification(
      adminId,
      newContract.propertyTitle,
      newContract.type === 'rent' ? 'rented' : 'sold'
    );
    await logActivity(adminId, currentUser?.name, 'create', 'contract', String(newContract.id), `Novo contrato de ${newContract.type === 'rent' ? 'locação' : 'venda'} para ${newContract.propertyTitle}`);
  };

  const handleUpdateContract = async (id: number | string, updatedData: Partial<Contract>) => {
    try {
      await updateContractService(String(id), updatedData);
      setContracts(prev => prev.map(c =>
        c.id === id ? { ...c, ...updatedData } : c
      ));
    } catch (e) {
      console.error('Erro ao atualizar contrato no servidor:', e);
      throw e;
    }
  };

  const handleDeleteContract = async (id: number | string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
    await deleteContract(String(id));
    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    await logActivity(adminId, currentUser?.name, 'delete', 'contract', String(id), `Contrato ID ${id} removido`);
  };

  // --- Handlers de Autenticação ---

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    const slug = tenantSlug || company?.slug || getStoredTenantSlug();
    if (!slug) await refreshCompany();

    if (slug) {
      localStorage.setItem(`estateflow_user_tenant_${user.id}`, slug);
    }

    const params = new URLSearchParams(location.search);
    const nextFromQuery = params.get('next');
    const nextFromStorage = tenantReturnKey ? localStorage.getItem(tenantReturnKey) : null;
    const nextPath = isSafeTenantReturnPath(nextFromQuery) ? nextFromQuery : nextFromStorage;

    if (tenantReturnKey) localStorage.removeItem(tenantReturnKey);

    if (nextPath && !(nextPath.startsWith('/admin') && user.role !== 'admin')) {
      navigate(getTenantPath(nextPath), { replace: true });
      return;
    }

    navigate(user.role === 'admin' ? `${tenantPrefix}/admin` : `${tenantPrefix}/dashboard`, { replace: true });
  };

  const handleRegister = async (user: User) => {
    setCurrentUser(user);
    const slug = tenantSlug || company?.slug || getStoredTenantSlug();
    if (slug) {
      localStorage.setItem(`estateflow_user_tenant_${user.id}`, slug);
    }
    navigate(user.role === 'admin' ? `${tenantPrefix}/admin` : `${tenantPrefix}/dashboard`, { replace: true });
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    navigate(tenantPrefix || '/', { replace: true });
    setIsMobileMenuOpen(false);
  };

  const handleUpdateUser = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const success = await updateUser(String(currentUser.id), updatedData);
    if (success) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const { password: _password, ...safeUpdatedData } = updatedData as any;
        const merged = { ...prev, ...safeUpdatedData };
        persistUserSession(merged);
        return merged;
      });
    }
  };

  const handleDeleteUser = async (id: string | number): Promise<boolean> => {
    const success = await deleteUserService(String(id));
    if (success) {
      setUsers(prev => prev.filter(u => String(u.id) !== String(id)));
    }
    return success;
  };

  const handleSendCredentials = async (user: User, password: string): Promise<boolean> => {
    try {
      const siteUrl = 'https://estate-flow-amber.vercel.app';
      const loginUrl = `${siteUrl}${tenantPrefix}/login`;
      const companyId = company?.id || localStorage.getItem('estateflow_company_id');
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          to: user.email,
          subject: `Bem-vindo ao EstateFlow - Suas Credenciais de Acesso`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #2b6cee, #4f46e5); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo ao EstateFlow!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 16px;">Olá <strong>${user.name}</strong>,</p>
                <p style="color: #64748b; font-size: 14px;">Sua conta foi criada no EstateFlow Suite. Utilize as credenciais abaixo para acessar o sistema:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 5px 0; color: #334155;"><strong>Email:</strong> ${user.email}</p>
                  <p style="margin: 5px 0; color: #334155;"><strong>Senha:</strong> ${password}</p>
                  <p style="margin: 5px 0; color: #334155;"><strong>Papel:</strong> ${user.role === 'admin' ? 'Administrador' : user.role === 'owner' ? 'Proprietário' : user.role === 'client' ? 'Cliente' : 'Visitante'}</p>
                </div>
                <a href="${loginUrl}" style="display: inline-block; background: #2b6cee; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 0;">Acessar o Sistema</a>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Por segurança, recomendamos alterar sua senha após o primeiro acesso.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 12px; text-align: center;">
                  <a href="${siteUrl}" style="color: #2b6cee;">${siteUrl}</a>
                </p>
              </div>
            </div>
          `,
        }),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Erro ao enviar email:', e);
      return false;
    }
  };

  // --- Handlers de Navegação e Ações ---

  const handlePropertySelect = (id: number | string) => {
    const prefix = tenantPrefix;
    if (currentUser?.role === 'admin') {
      navigate(`${prefix}/admin/details/${id}`);
    } else {
      navigate(`${prefix}/property/${id}`);
    }
  };

  const handleFavoriteAction = async (id: number | string) => {
    if (!currentUser) {
      alert("Você precisa fazer login para favoritar imóveis.");
      goToLogin(subpath);
      return;
    }

    const newFavorites = await toggleFavorite(String(currentUser.id), id);
    if (!newFavorites) return;
    // Atualiza estado local para feedback imediato
    setCurrentUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, favorites: newFavorites };
      persistUserSession(merged);
      return merged;
    });
    // alert(`Ação de favoritos salva para ${currentUser.name}!`); // Alert opcional, visual é melhor
  };

  const handleSignContractReal = async (contractId: number | string, signatureImage: string) => {
    try {
      if (handleUpdateContract) {
        await handleUpdateContract(contractId, {
          signatureStatus: 'signed',
          signatureImage: signatureImage,
          signedAt: new Date().toISOString()
        });
      }

      // Update local state for immediate feedback
      setContracts(prev => prev.map(c =>
        String(c.id) === String(contractId)
          ? { ...c, signatureStatus: 'signed' as const, signatureImage, signedAt: new Date().toISOString() }
          : c
      ));

    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      alert("Houve um erro ao processar sua assinatura. Tente novamente.");
    }
  };


  // --- Notification Handlers ---
  const handleMarkNotificationAsRead = async (id: string | number) => {
    await markNotificationAsRead(String(id));
  };

  const handleMarkAllNotificationsAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  const handleClearAllNotifications = async () => {
    if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
      await clearAllNotifications();
    }
  };

  // --- Render Logic ---

  // 0. Loading inicial
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-slate-500 font-semibold">Carregando EstateFlow...</p>
      </div>
    );
  }

  // 0b. Erro de dados
  if (dataLoadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">cloud_off</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Falha na Conexão</h1>
        <p className="text-slate-500 mb-8 max-w-md">{dataLoadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">refresh</span>
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!isCompanyLoading && routeSlug && !company) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">domain_disabled</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Imobiliaria nao encontrada</h1>
        <p className="text-slate-500 mb-8 max-w-md">
          O endereco /{routeSlug} nao corresponde a uma imobiliaria ativa no EstateFlow.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          Voltar para o SaaS
        </button>
      </div>
    );
  }

  // Master Admin (rota /master)
  if (location.pathname.startsWith('/master')) {
    return <MasterApp />;
  }

  // 1. Visão de Admin (Logado e role='admin')
  if (!isCompanyLoading && isAdminRoute && !currentUser) {
    rememberReturnTo(subpath);
    return <Navigate to={getLoginPath(subpath)} replace />;
  }

  if (!isCompanyLoading && isAdminRoute && currentUser && currentUser.role !== 'admin') {
    return <Navigate to={`${tenantPrefix}/dashboard`} replace />;
  }

  if (!isCompanyLoading && isUserProtectedRoute && !currentUser) {
    rememberReturnTo(subpath);
    return <Navigate to={getLoginPath(subpath)} replace />;
  }

  if (currentUser?.role === 'admin' && isAdminRoute) {
    const renderAdminView = () => {
      switch (currentView) {
        case 'dashboard': return (
          <AdminDashboard
            onNavigate={setCurrentView}
            properties={properties}
            contracts={contracts}
            currentUser={currentUser}
          />
        );
        case 'listing': return <NewListing onPublish={handleAddProperty} currentUser={currentUser} />;
        case 'edit-listing': return (
          <NewListing
            onPublish={(data) => handleUpdateProperty(data.id, data)}
            currentUser={currentUser}
            initialData={propertyToEdit}
          />
        );
        case 'all-listings': return (
          <ListingsManagement
            onNavigate={setCurrentView}
            onSelectProperty={handlePropertySelect}
            properties={properties}
            onDelete={handleDeleteProperty}
            onUpdate={handleUpdateProperty}
            onEditFull={handleEditFull}
            currentUser={currentUser}
          />
        );
        case 'financial': return (
          <FinancialManagement
            contracts={contracts}
            properties={properties}
            users={users}
            settings={settings}
            onAddContract={handleAddContract}
            onUpdateContract={handleUpdateContract}
          />
        );
        case 'operations': return (
          <PropertyOperations
            properties={properties}
            users={users}
            settings={settings}
            onNavigate={setCurrentView}
          />
        );
        case 'contracts': return (
          <ContractsPage
            contracts={contracts}
            properties={properties}
            users={users}
            settings={settings}
            onAddContract={handleAddContract}
            onDeleteContract={handleDeleteContract}
            onUpdateContract={handleUpdateContract}
          />
        );
        case 'marketing': return (
          <MarketingStudio properties={properties} currentUser={currentUser} />
        );

        case 'map': return <InteractiveMap onSelectProperty={handlePropertySelect} properties={properties} />;
        case 'crm': return (
          <ClientProfile 
            users={users} 
            contracts={contracts} 
            properties={properties}
            onUpdateUser={async (id, data) => {
              const success = await updateUser(String(id), data);
              if (success) {
                setUsers(users.map(u => String(u.id) === String(id) ? { ...u, ...data } : u));
              }
              return success;
            }}
            onAddUser={async (data) => {
              const newUser = await addUser(data);
              if (newUser) {
                setUsers([...users, newUser]);
              }
              return newUser !== null;
            }}
          />
        );
        case 'admin-details': return (
          <PropertyDetails
            propertyId={selectedPropertyId}
            properties={properties}
            onBack={() => setCurrentView('all-listings')}
            isPublic={false}
            settings={settings}
          />
        );
        case 'ai': return <ImageStudio />;
        case 'ai-analytics': return <AIAnalytics properties={properties} contracts={contracts} />;

        case 'analytics': return <Analytics properties={properties} contracts={contracts} />;
        case 'profile-settings': return (
          <ProfileSettings
            user={currentUser}
            onSave={handleUpdateUser}
            onBack={() => setCurrentView('dashboard')}
          />
        );
        case 'settings': return (
          <AdminSettings
            settings={settings}
            onSettingsUpdated={setSettings}
            users={users}
          />
        );
        case 'users': return (
          <UsersManagement
            users={users}
            onUpdateUser={async (id, data) => {
              const success = await updateUser(String(id), data);
              if (success) {
                setUsers(users.map(u => String(u.id) === String(id) ? { ...u, ...data } : u));
              }
              return success;
            }}
            onAddUser={async (data) => {
              const newUser = await addUser(data);
              if (newUser) {
                setUsers([...users, newUser]);
              }
              return newUser !== null;
            }}
            onDeleteUser={handleDeleteUser}
            onSendCredentials={handleSendCredentials}
          />
        );
        default: return <AdminDashboard onNavigate={setCurrentView} />;
      }
    };

    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Mobile Header (Admin) - More integrated */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0b0e14]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-[70] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-lg">roofing</span>
              </div>
            )}
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">
              {settings.companyName || 'EstateFlow'} <span className="text-primary">{settings.companyName ? '' : 'Suite'}</span>
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'grid_view'}</span>
          </button>
        </div>

        {/* Mobile Menu Overlay / Module Selector */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[65] bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="absolute inset-x-0 top-0 pt-20 pb-10 px-6 bg-white dark:bg-[#0b0e14] rounded-b-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-300 flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="mb-8">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Módulos do Sistema</p>
                <div className="grid grid-cols-2 gap-4">
                  <MobileAdminNavButton active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} icon="dashboard" label="Home" />
                  <MobileAdminNavButton active={currentView === 'all-listings'} onClick={() => { setCurrentView('all-listings'); setIsMobileMenuOpen(false); }} icon="inventory_2" label="Imóveis" />
                  <MobileAdminNavButton active={currentView === 'operations'} onClick={() => { setCurrentView('operations'); setIsMobileMenuOpen(false); }} icon="route" label="Operações" />
                  <MobileAdminNavButton active={currentView === 'contracts'} onClick={() => { setCurrentView('contracts'); setIsMobileMenuOpen(false); }} icon="gavel" label="Jurídico" />
                  <MobileAdminNavButton active={currentView === 'marketing'} onClick={() => { setCurrentView('marketing'); setIsMobileMenuOpen(false); }} icon="campaign" label="Marketing" />
                  <MobileAdminNavButton active={currentView === 'ai-analytics'} onClick={() => { setCurrentView('ai-analytics'); setIsMobileMenuOpen(false); }} icon="psychology" label="IA Analytics" />
                  <MobileAdminNavButton active={currentView === 'financial'} onClick={() => { setCurrentView('financial'); setIsMobileMenuOpen(false); }} icon="payments" label="Financeiro" />
                  <MobileAdminNavButton active={currentView === 'users'} onClick={() => { setCurrentView('users'); setIsMobileMenuOpen(false); }} icon="group" label="Usuários" />
                  <MobileAdminNavButton active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} icon="settings" label="Ajustes" />
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-cover bg-center border border-slate-200" style={{ backgroundImage: currentUser.avatar ? `url("${currentUser.avatar}")` : 'none' }}></div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{currentUser.name}</p>
                    <button onClick={() => { setCurrentView('profile-settings'); setIsMobileMenuOpen(false); }} className="text-xs text-primary font-bold">Ver Perfil</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {routeSlug && (
                    <button
                      onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }}
                      className="size-10 flex items-center justify-center text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl"
                      title="Ver Site"
                    >
                      <span className="material-symbols-outlined">open_in_new</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="size-10 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Click outside to close */}
            <div className="flex-1 h-full" onClick={() => setIsMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* Menu Lateral Admin (Desktop) */}
        <div className="hidden lg:flex w-20 flex-col items-center py-6 bg-white dark:bg-[#0b0e14] border-r border-slate-200 dark:border-slate-800 z-50 shrink-0 overflow-y-auto no-scrollbar">
          <div className="mb-4 p-2 bg-primary/20 rounded-xl text-primary" title={settings.companyName || "EstateFlow Suite"}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <span className="material-symbols-outlined notranslate text-2xl">roofing</span>
            )}
          </div>

          {/* Notification Center */}
          <div className="mb-4 w-full flex justify-center">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onClearAll={handleClearAllNotifications}
              position="left"
            />
          </div>

          <div className="flex flex-col gap-4 w-full px-2">
            <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon="dashboard" tooltip="Painel Administrativo" />
            <NavButton active={currentView === 'all-listings' || currentView === 'edit-listing'} onClick={() => setCurrentView('all-listings')} icon="inventory_2" tooltip="Meus Anúncios" />
            <NavButton active={currentView === 'operations'} onClick={() => setCurrentView('operations')} icon="route" tooltip="Operações & Jornada do Imóvel" />
            <NavButton active={currentView === 'contracts'} onClick={() => setCurrentView('contracts')} icon="gavel" tooltip="Canal Jurídico & Contratos" />
            <NavButton active={currentView === 'marketing'} onClick={() => setCurrentView('marketing')} icon="campaign" tooltip="Marketing Studio" />
            <NavButton active={currentView === 'ai-analytics'} onClick={() => setCurrentView('ai-analytics')} icon="psychology" tooltip="IA Analytics & Leads" />
            <NavButton active={currentView === 'financial'} onClick={() => setCurrentView('financial')} icon="payments" tooltip="Financeiro" />
            <NavButton active={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} icon="bar_chart" tooltip="Analytics" />
            <NavButton active={currentView === 'users'} onClick={() => setCurrentView('users')} icon="group" tooltip="Gerenciar Usuários" />
            <NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon="settings_suggest" tooltip="Configurações Globais" />
            <NavButton active={currentView === 'profile-settings'} onClick={() => setCurrentView('profile-settings')} icon="person" tooltip="Configurações da Conta" />
          </div>

          <div className="mt-auto w-full px-2 flex flex-col gap-1">
            {routeSlug && (
              <button
                onClick={() => { setCurrentView('home'); }}
                className="group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="Ver Site"
              >
                <span className="material-symbols-outlined notranslate text-[24px]">open_in_new</span>
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Ver Site
                </span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500"
              title="Sair do Sistema"
            >
              <span className="material-symbols-outlined notranslate text-[24px]">logout</span>
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Sair
              </span>
            </button>
          </div>
        </div>

        {/* O container principal DEVE usar flex-1 e overflow-hidden para conter o scroll dentro das Views */}
        <div className="flex-1 overflow-hidden relative flex flex-col h-full pt-16 lg:pt-0">
          {renderAdminView()}
        </div>

      </div>
      </NotificationProvider>
    );
  }

  // 2. SaaS Landing Page
  if (currentView === 'saas-home') {
    return <SaasHome />;
  }

  // 3. Visão Pública / Cliente / Proprietário

  if (currentView === 'login') {
    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <PublicLayout>
          <LoginPage
            onLoginSuccess={handleLogin}
            onRegisterSuccess={handleRegister}
            onCancel={leaveLogin}
            companyId={company?.id || ''}
          />
        </PublicLayout>
      </NotificationProvider>
    );
  }

  if (currentView === 'advertise') {
    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <PublicLayout>
          <OwnerLanding onBack={() => setCurrentView('home')} />
        </PublicLayout>
      </NotificationProvider>
    );
  }

  if (currentView === 'user-dashboard' && currentUser) {
    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <PublicLayout>
          <UserDashboard
            user={currentUser}
            onBack={() => setCurrentView('home')}
            properties={properties}
            contracts={contracts}
            onPropertySelect={handlePropertySelect}
            onLogout={handleLogout}
            onEditProfile={() => setCurrentView('client-profile-settings')}
            onUpdateContract={handleUpdateContract}
            onToggleFavorite={handleFavoriteAction}
            onAdvertiseClick={() => setCurrentView('advertise')}
          />
        </PublicLayout>
      </NotificationProvider>
    );
  }

  if (currentView === 'profile-settings' && currentUser) {
    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <PublicLayout>
          <ProfileSettings
            user={currentUser}
            onSave={handleUpdateUser}
            onBack={() => setCurrentView(currentUser.role === 'admin' && isAdminRoute ? 'dashboard' : 'user-dashboard')}
          />
        </PublicLayout>
      </NotificationProvider>
    );
  }

  if (currentView === 'details') {
    return (
      <NotificationProvider
        userId={currentUser?.id}
        existingNotifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      >
        <PublicLayout>
          <PropertyDetails
            propertyId={selectedPropertyId}
            properties={properties}
            onBack={() => setCurrentView('home')}
            isPublic={true}
            currentUser={currentUser}
            settings={settings}
          />
          <WhatsAppButton
            phoneNumber="5515997241175"
            propertyTitle={properties.find(p => p.id === selectedPropertyId)?.title}
          />
        </PublicLayout>
      </NotificationProvider>
    );
  }

  // 3. Public Contract View for Signing
  if (currentView === 'public-contract' && selectedContractId) {
    return <PublicContractSign contractId={selectedContractId} settings={settings} />;
  }

  // 4. Subscription Plans
  if (currentView === 'plans') {
    return (
      <SubscriptionPlans
        companyId={currentUser ? (company?.id || '') : ''}
        currentPlan={currentUser ? company?.plan : undefined}
        currentStatus={currentUser ? company?.subscription_status : undefined}
        isLoggedIn={!!currentUser}
        loginPath={tenantPrefix ? `${tenantPrefix}/login` : '/'}
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // 5. Payment result pages
  if (currentView === 'payment-success') {
    return <PaymentResult status="success" onGoHome={() => setCurrentView('home')} />;
  }

  if (currentView === 'payment-failure') {
    return <PaymentResult status="failure" onGoHome={() => setCurrentView('home')} onRetry={() => setCurrentView('plans')} />;
  }

  if (currentView === 'payment-pending') {
    return <PaymentResult status="pending" onGoHome={() => setCurrentView('home')} />;
  }

  // Default: Home Page
  return (
    <NotificationProvider
      userId={currentUser?.id}
      existingNotifications={notifications}
      onMarkAsRead={handleMarkNotificationAsRead}
      onMarkAllAsRead={handleMarkAllNotificationsAsRead}
    >
      <PublicLayout>
        <ClientHome
          properties={properties}
          onPropertySelect={handlePropertySelect}
          onLoginClick={() => goToLogin(subpath)}
          onAdvertiseClick={() => setCurrentView('advertise')}
          currentUser={currentUser}
          onUserDashboardClick={() => setCurrentView('user-dashboard')}
          onAdminClick={() => setCurrentView('dashboard')}
          onLogoutClick={handleLogout}
          onFavoriteClick={handleFavoriteAction}
          settings={settings}
          onBackToSaaS={() => navigate('/')}
        />
        <WhatsAppButton phoneNumber="5515997241175" />
      </PublicLayout>
    </NotificationProvider>
  );
};

const NavButton = ({ active, onClick, icon, tooltip }: { active: boolean; onClick: () => void; icon: string; tooltip: string }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all ${active
      ? 'bg-primary text-white shadow-lg shadow-primary/30'
      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
  >
    <span className="material-symbols-outlined notranslate text-[24px]">{icon}</span>
    <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {tooltip}
    </span>
  </button>
);

const MobileAdminNavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl transition-all ${active
      ? 'bg-primary text-white shadow-xl shadow-primary/30'
      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
      }`}
  >
    <span className="material-symbols-outlined text-[28px]">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

export default App;

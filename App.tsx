import React, { useState, useEffect } from 'react';

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
import ChatManagement from './pages/ChatManagement';
import MarketingStudio from './pages/MarketingStudio';
import ContractsPage from './pages/ContractsPage';
import Analytics from './pages/Analytics';
import AIAnalytics from './pages/AIAnalytics';
import UsersManagement from './pages/UsersManagement';
import AdminSettings from './pages/AdminSettings';
import NotificationCenter from './components/NotificationCenter';
import WhatsAppButton from './components/WhatsAppButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './src/contexts/NotificationContext';

import {
  subscribeToAuthChanges,
  logoutUser
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
  saveMessage,
  subscribeToConversations,
  markConversationAsRead,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getSettings,
  updateSetting
} from './src/services/dataService';
import LoginPage, { RegisterData } from './pages/LoginPage';
import ClientHome from './pages/ClientHome';
import ClientChat from './pages/ClientChat';
import LegalChat from './pages/LegalChat';
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
  createLeadNotification,
  registerServiceWorker,
  requestNotificationPermission
} from './src/services/notificationHelpers';
import ReactPlayer from 'react-player';

// --- Types ---
import { ChatMessage, Conversation, User, Property, Contract, AppNotification } from './src/types';
export { AppErrorBoundary } from './components/AppErrorBoundary';

// Wrapper de Scroll
const PublicLayout = ({ children }: { children?: React.ReactNode }) => (
  <div className="h-screen w-full overflow-y-auto bg-slate-50 scroll-smooth">
    {children}
  </div>
);

const App: React.FC = () => {
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

    const unsubscribeChat = subscribeToConversations((convs) => {
      setConversations(convs);
    });

    const unsubscribeNotifications = subscribeToNotifications((notifs) => {
      setNotifications(notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    // Carregar dados reais
    const loadData = async () => {
      try {
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
      unsubscribeChat();
      unsubscribeNotifications();
    };
  }, []);

  // --- Dynamic Branding Injection ---
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    } else {
      document.documentElement.style.setProperty('--color-primary', '#4f46e5'); // Fallback indigo
    }
  }, [settings.primaryColor]);

  // --- Chat State (Replaces simple messages array) ---
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // --- Notifications State ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // --- Navigation State ---
  const navigate = useNavigate();
  const location = useLocation();

  const currentView = React.useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/Estate/')) return 'details';
    if (p.startsWith('/admin/details/')) return 'admin-details';
    if (p === '/login') return 'login';
    if (p === '/advertise') return 'advertise';
    if (p === '/dashboard') return 'user-dashboard';
    if (p.startsWith('/admin')) {
      if (p === '/admin/dashboard') return 'dashboard';
      if (p === '/admin/listings') return 'all-listings';
      if (p === '/admin/listing/new') return 'listing';
      if (p === '/admin/listing/edit') return 'edit-listing';
      if (p === '/admin/financial') return 'financial';
      if (p === '/admin/contracts') return 'contracts';
      if (p === '/admin/chat') return 'chat';
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
    return 'home';
  }, [location.pathname]);

  const selectedPropertyId = React.useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/Estate/')) return p.split('/')[2];
    if (p.startsWith('/admin/details/')) return p.split('/')[3];
    return null;
  }, [location.pathname]);

  const setCurrentView = (view: string) => {
    const viewMap: Record<string, string> = {
      'dashboard': '/admin/dashboard',
      'all-listings': '/admin/listings',
      'listing': '/admin/listing/new',
      'edit-listing': '/admin/listing/edit',
      'financial': '/admin/financial',
      'contracts': '/admin/contracts',
      'chat': '/admin/chat',
      'marketing': '/admin/marketing',
      'map': '/admin/map',
      'crm': '/admin/crm',
      'ai': '/admin/ai',
      'ai-analytics': '/admin/ai-analytics',
      'analytics': '/admin/analytics',
      'profile-settings': '/admin/profile-settings',
      'settings': '/admin/settings',
      'users': '/admin/users',
      'home': '/',
      'login': '/login',
      'advertise': '/advertise',
      'user-dashboard': '/dashboard',
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

  // --- Client Chat Modal State ---
  const [isClientChatOpen, setIsClientChatOpen] = useState(false);
  const [clientChatPropertyTitle, setClientChatPropertyTitle] = useState('');

  // --- Legal Chat State ---
  const [activeLegalContract, setActiveLegalContract] = useState<Contract | null>(null);
  const [isLegalChatOpen, setIsLegalChatOpen] = useState(false);

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
    setContracts(prev => prev.map(c =>
      c.id === id ? { ...c, ...updatedData } : c
    ));
    await updateContractService(String(id), updatedData);
  };

  const handleDeleteContract = async (id: number | string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
    await deleteContract(String(id));
    const adminId = currentUser?.id ? String(currentUser.id) : 'admin';
    await logActivity(adminId, currentUser?.name, 'delete', 'contract', String(id), `Contrato ID ${id} removido`);
  };

  // --- Handlers de Autenticação ---

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('dashboard');
    } else {
      setCurrentView('home');
    }
  };

  const handleRegister = (user: User) => {
    setCurrentUser(user);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentView('home');
    setIsClientChatOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleUpdateUser = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const success = await updateUser(String(currentUser.id), updatedData);
    if (success) {
      setCurrentUser(prev => prev ? { ...prev, ...updatedData } : null);
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
      const loginUrl = `${siteUrl}/login`;
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    if (currentUser?.role === 'admin') {
      navigate(`/admin/details/${id}`);
    } else {
      navigate(`/Estate/${id}`);
    }
  };

  const handleClientChatStart = (title: string) => {
    if (!currentUser) {
      alert("Você precisa fazer login para iniciar um chat.");
      setCurrentView('login');
      return;
    }
    setClientChatPropertyTitle(title);
    setIsClientChatOpen(true);
  };

  const handleFavoriteAction = async (id: number | string) => {
    if (!currentUser) {
      alert("Você precisa fazer login para favoritar imóveis.");
      setCurrentView('login');
      return;
    }

    const newFavorites = await toggleFavorite(String(currentUser.id), id);
    // Atualiza estado local para feedback imediato
    setCurrentUser(prev => prev ? { ...prev, favorites: newFavorites } : null);
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

      if (activeLegalContract && String(activeLegalContract.id) === String(contractId)) {
        setActiveLegalContract(prev => prev ? { ...prev, signatureStatus: 'signed' as const, signatureImage, signedAt: new Date().toISOString() } : null);
      }

    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      alert("Houve um erro ao processar sua assinatura. Tente novamente.");
    }
  };


  // --- Centralized Message Handler ---
  const handleSendMessage = async (text: string, sender: 'user' | 'agent', conversationIdOrUserId?: number | string, attachment?: ChatMessage['attachment']) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: ChatMessage = {
      id: Date.now(),
      sender,
      text,
      time,
      read: sender === 'agent',
      attachment
    };

    // Identificar ID da conversa (sempre string)
    // Se conversationIdOrUserId começar com 'legal_', é um chat de contrato.
    // Senão, é o ID do usuário (chat de atendimento geral).
    let conversationId = "";
    let targetUserId: string | number = "anonymous";
    let isLegal = false;

    if (typeof conversationIdOrUserId === 'string' && conversationIdOrUserId.startsWith('legal_')) {
      conversationId = conversationIdOrUserId;
      isLegal = true;
    } else {
      targetUserId = conversationIdOrUserId || currentUser?.id || "anonymous";
      conversationId = String(targetUserId);
    }

    // Preparar dados da conversa para update/create
    const targetUser = users.find(u => String(u.id) === String(targetUserId));

    const conversationData: Partial<Conversation> = {
      userId: isLegal ? "0" : String(targetUserId),
      id: conversationId,
      userName: isLegal ? `Jurídico: ${text.substring(0, 20)}...` : (targetUser?.name || currentUser?.name || "Usuário"),
      userAvatar: isLegal ? "https://cdn-icons-png.flaticon.com/512/921/921347.png" : (targetUser?.avatar || currentUser?.avatar || "https://ui-avatars.com/api/?name=User"),
      userRole: isLegal ? 'client' : (targetUser?.role || currentUser?.role || 'client' as any),
      lastMessage: attachment ? `[Anexo: ${attachment.title}]` : text,
      lastMessageTime: time,
      unreadCount: sender === 'user' ? 1 : 0
    };

    // Especial check para conversa jurídica: se já existir, mantemos o nome/avatar original ou atualizamos
    const existingConv = conversations.find(c => c.id === conversationId);
    if (isLegal && existingConv) {
      conversationData.userName = existingConv.userName;
      conversationData.userAvatar = existingConv.userAvatar;
    } else if (isLegal) {
      // Tentar obter o título do contrato para o nome da conversa
      const contractIdAttr = conversationId.replace('legal_', '');
      const contract = contracts.find(c => String(c.id) === contractIdAttr);
      if (contract) {
        conversationData.userName = `Canal Jurídico: ${contract.propertyTitle}`;
      }
    }

    // Atualização Otimista da UI
    setConversations(prev => {
      const exists = prev.find(c => c.id === conversationId);
      if (exists) {
        return prev.map(c => c.id === conversationId ? {
          ...c,
          lastMessage: conversationData.lastMessage || text,
          lastMessageTime: time,
          unreadCount: sender === 'user' ? (c.unreadCount + 1) : c.unreadCount,
          messages: [...(c.messages || []), newMessage]
        } : c);
      } else {
        return [{
          ...conversationData,
          id: conversationId,
          messages: [newMessage]
        } as Conversation, ...prev];
      }
    });

    // Salvar no Firebase (Optimistic update on UI via subscription will eventually sync)
    await saveMessage(conversationId, newMessage, conversationData);

    // Create notification for new user messages (leads)
    if (sender === 'user' && currentUser?.role !== 'admin' && !isLegal) {
      await createLeadNotification(
        conversationData.userName || 'Usuário',
        clientChatPropertyTitle || undefined
      );
    }
  };

  const handleMarkAsRead = async (conversationId: number | string) => {
    // Atualização Otimista
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    // Persistência
    await markConversationAsRead(String(conversationId));
  };

  // Helper para obter mensagens da conversa ativa do cliente logado
  const getCurrentUserMessages = () => {
    if (!currentUser) return [];
    // Comparação frouxa (string vs number) pois IDs do FB são string e mock são number
    const conv = conversations.find(c => String(c.userId) === String(currentUser.id));
    return conv ? conv.messages : [];
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

  // 1. Visão de Admin (Logado e role='admin')
  if (currentUser?.role === 'admin') {
    const renderAdminView = () => {
      switch (currentView) {
        case 'dashboard': return (
          <AdminDashboard
            onNavigate={setCurrentView}
            conversations={conversations}
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
        case 'contracts': return (
          <ContractsPage
            contracts={contracts}
            properties={properties}
            users={users}
            settings={settings}
            onAddContract={handleAddContract}
            onDeleteContract={handleDeleteContract}
            onUpdateContract={handleUpdateContract}
            onOpenLegalChat={(contract) => {
              setActiveLegalContract(contract);
              setIsLegalChatOpen(true);
            }}
            onShareContractToChat={(contract) => {
              handleSendMessage(
                `Encaminhei o contrato de ${contract.type === 'rent' ? 'locação' : 'venda'} para sua conferência.`,
                'agent',
                `legal_${contract.id}`,
                {
                  type: 'contract',
                  id: contract.id,
                  title: `Contrato: ${contract.propertyTitle}`,
                  status: contract.status
                }
              );
              setActiveLegalContract(contract);
              setIsLegalChatOpen(true);
            }}
          />
        );
        case 'chat': return (
          <ChatManagement
            conversations={conversations}
            contracts={contracts}
            users={users}
            onSendMessage={handleSendMessage}
            onMarkAsRead={handleMarkAsRead}
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
                  <MobileAdminNavButton active={currentView === 'contracts'} onClick={() => { setCurrentView('contracts'); setIsMobileMenuOpen(false); }} icon="gavel" label="Jurídico" />
                  <MobileAdminNavButton active={currentView === 'chat'} onClick={() => { setCurrentView('chat'); setIsMobileMenuOpen(false); }} icon="chat" label="Mensagens" />
                  <MobileAdminNavButton active={currentView === 'marketing'} onClick={() => { setCurrentView('marketing'); setIsMobileMenuOpen(false); }} icon="campaign" label="Marketing" />
                  <MobileAdminNavButton active={currentView === 'ai-analytics'} onClick={() => { setCurrentView('ai-analytics'); setIsMobileMenuOpen(false); }} icon="psychology" label="IA Analytics" />
                  <MobileAdminNavButton active={currentView === 'financial'} onClick={() => { setCurrentView('financial'); setIsMobileMenuOpen(false); }} icon="payments" label="Financeiro" />
                  <MobileAdminNavButton active={currentView === 'users'} onClick={() => { setCurrentView('users'); setIsMobileMenuOpen(false); }} icon="group" label="Usuários" />
                  <MobileAdminNavButton active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} icon="settings" label="Ajustes" />
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-cover bg-center border border-slate-200" style={{ backgroundImage: `url("${currentUser.avatar}")` }}></div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{currentUser.name}</p>
                    <button onClick={() => { setCurrentView('profile-settings'); setIsMobileMenuOpen(false); }} className="text-xs text-primary font-bold">Ver Perfil</button>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="size-10 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
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
            <NavButton active={currentView === 'contracts'} onClick={() => setCurrentView('contracts')} icon="gavel" tooltip="Canal Jurídico & Contratos" />
            <NavButton active={currentView === 'chat'} onClick={() => setCurrentView('chat')} icon="chat" tooltip="Chat & Atendimento" />
            <NavButton active={currentView === 'marketing'} onClick={() => setCurrentView('marketing')} icon="campaign" tooltip="Marketing Studio" />
            <NavButton active={currentView === 'ai-analytics'} onClick={() => setCurrentView('ai-analytics')} icon="psychology" tooltip="IA Analytics & Leads" />
            <NavButton active={currentView === 'financial'} onClick={() => setCurrentView('financial')} icon="payments" tooltip="Financeiro" />
            <NavButton active={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} icon="bar_chart" tooltip="Analytics" />
            <NavButton active={currentView === 'users'} onClick={() => setCurrentView('users')} icon="group" tooltip="Gerenciar Usuários" />
            <NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon="settings_suggest" tooltip="Configurações Globais" />
            <NavButton active={currentView === 'profile-settings'} onClick={() => setCurrentView('profile-settings')} icon="person" tooltip="Configurações da Conta" />
          </div>

          <div className="mt-auto w-full px-2">
            <button
              onClick={handleLogout}
              className="group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all text-slate-500 hover:bg-rose-50 hover:text-rose-500"
              title="Sair do Sistema"
            >
              <span className="material-symbols-outlined notranslate text-[24px]">logout</span>
            </button>
          </div>
        </div>

        {/* O container principal DEVE usar flex-1 e overflow-hidden para conter o scroll dentro das Views */}
        <div className="flex-1 overflow-hidden relative flex flex-col h-full pt-16 lg:pt-0">
          {renderAdminView()}
        </div>

        {/* Global Modals for Admin */}
        {isLegalChatOpen && activeLegalContract && (
          <LegalChat
            contract={activeLegalContract}
            currentUser={currentUser!}
            messages={conversations.find(c => c.id === `legal_${activeLegalContract.id}`)?.messages || []}
            onSendMessage={(text, sender, attachment) => handleSendMessage(text, sender, `legal_${activeLegalContract.id}`, attachment)}
            onSignContract={handleSignContractReal}
            onClose={() => setIsLegalChatOpen(false)}
          />
        )}
      </div>
      </NotificationProvider>
    );
  }

  // 2. Visão Pública / Cliente / Proprietário

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
            onCancel={() => setCurrentView('home')}
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
            onEditProfile={() => setCurrentView('profile-settings')}
            onUpdateContract={handleUpdateContract}
            onOpenLegalChat={(contract) => {
              setActiveLegalContract(contract);
              setIsLegalChatOpen(true);
            }}
          />
          {isLegalChatOpen && activeLegalContract && (
            <LegalChat
              contract={activeLegalContract}
              currentUser={currentUser}
              messages={conversations.find(c => c.id === `legal_${activeLegalContract.id}`)?.messages || []}
              onSendMessage={(text, sender, attachment) => handleSendMessage(text, sender, `legal_${activeLegalContract.id}`, attachment)}
              onSignContract={handleSignContractReal}
              onClose={() => setIsLegalChatOpen(false)}
            />
          )}
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
            onBack={() => setCurrentView(currentUser.role === 'admin' ? 'dashboard' : 'user-dashboard')}
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
            onChatStart={handleClientChatStart}
            currentUser={currentUser}
            settings={settings}
          />
          {isClientChatOpen && (
            <ClientChat
              propertyTitle={clientChatPropertyTitle}
              onClose={() => setIsClientChatOpen(false)}
              messages={getCurrentUserMessages()}
              onSendMessage={(text) => handleSendMessage(text, 'user')}
            />
          )}
          <WhatsAppButton
            phoneNumber="5515997241175"
            propertyTitle={properties.find(p => p.id === selectedPropertyId)?.title}
          />
        </PublicLayout>
      </NotificationProvider>
    );
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
          onLoginClick={() => setCurrentView('login')}
          onAdvertiseClick={() => setCurrentView('advertise')}
          currentUser={currentUser}
          onUserDashboardClick={() => setCurrentView('user-dashboard')}
          onLogoutClick={handleLogout}
          onFavoriteClick={handleFavoriteAction}
          onChatClick={handleClientChatStart}
          settings={settings}
        />
        {isClientChatOpen && (
          <ClientChat
            propertyTitle={clientChatPropertyTitle || "Atendimento Geral"}
            onClose={() => setIsClientChatOpen(false)}
            messages={getCurrentUserMessages()}
            onSendMessage={(text) => handleSendMessage(text, 'user')}
          />
        )}
        <WhatsAppButton phoneNumber="5515997241175" />
        {/* Teste de Sincronização */}
        <div className="fixed bottom-4 left-4 z-[100] bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg opacity-80 pointer-events-none">
          v1.0.1 - SYNC ACTIVE
        </div>
        {isLegalChatOpen && activeLegalContract && (
          <LegalChat
            contract={activeLegalContract}
            currentUser={currentUser!}
            messages={conversations.find(c => c.id === `legal_${activeLegalContract.id}`)?.messages || []}
            onSendMessage={(text, sender, attachment) => handleSendMessage(text, sender, `legal_${activeLegalContract.id}`, attachment)}
            onSignContract={handleSignContractReal}
            onClose={() => setIsLegalChatOpen(false)}
          />
        )}
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
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppNotification } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  markAsRead: (id: string | number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);
const PUSH_VAPID_STORAGE_KEY = 'estateflow_push_vapid_public_key';

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de <NotificationProvider>');
  return ctx;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface Props {
  children: React.ReactNode;
  userId: string | number;
  existingNotifications: AppNotification[];
  onMarkAsRead: (id: string | number) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

export const NotificationProvider: React.FC<Props> = ({
  children,
  userId,
  existingNotifications,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  const [isLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermissionStatus('unsupported');
      return;
    }

    if ('Notification' in window) {
      setPermissionStatus(window.Notification.permission);
    }

    navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' })
      .then((reg) => {
        swRegistrationRef.current = reg;
        console.log('[Native Push] Service Worker registrado para Web Push VAPID.');
      })
      .catch((err) => {
        console.warn('[Native Push] Falha ao registrar SW:', err);
      });
  }, []);

  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      const res = await fetch('/api/push/vapidPublicKey');
      const { publicKey, error } = await res.json().catch(() => ({ publicKey: '', error: 'Resposta invalida do servidor' }));
      if (!res.ok) throw new Error(error || 'VAPID public key ausente no servidor.');
      if (!publicKey) throw new Error('VAPID public key ausente no servidor.');

      const storedPublicKey = localStorage.getItem(PUSH_VAPID_STORAGE_KEY);
      let subscription = await reg.pushManager.getSubscription();
      if (subscription && (!storedPublicKey || storedPublicKey !== publicKey)) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;
      }
      subscription = subscription || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const companyId = localStorage.getItem('estateflow_company_id') || '';
      if (!companyId) {
        throw new Error('Empresa nao identificada. Recarregue o painel da imobiliaria antes de ativar o push.');
      }
      const token = localStorage.getItem('ef_token') || '';
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { 'X-EstateFlow-User-Id': String(userId) } : {}),
        },
        body: JSON.stringify({
          ...subscription.toJSON(),
          userId: userId || null,
          companyId,
          company_id: companyId
        })
      });
      const saveData = await saveRes.json().catch(() => null);
      if (!saveRes.ok) throw new Error(saveData?.error || 'Falha ao salvar inscricao de push.');

      reg.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'EstateFlow Suite',
        body: 'Notificacoes ativadas! Voce recebera alertas importantes por aqui.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        url: '/'
      });

      console.log('[Native Push] Dispositivo inscrito com sucesso.');
      localStorage.setItem(PUSH_VAPID_STORAGE_KEY, publicKey);
    } catch (e) {
      console.error('[Native Push] Erro ao subscrever para push:', e);
      alert(e instanceof Error ? e.message : 'Erro ao ativar notificacoes push.');
    }
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Este navegador nao suporta notificacoes push.');
      return;
    }

    const registration = swRegistrationRef.current || await navigator.serviceWorker.ready.catch(() => null);
    if (!registration) {
      alert('Service Worker de notificacoes ainda nao esta pronto. Recarregue a pagina e tente novamente.');
      return;
    }

    const result = await window.Notification.requestPermission();
    setPermissionStatus(result);

    if (result === 'granted') {
      await subscribeToPush(registration);
    } else {
      alert('Permissao de notificacoes negada. Voce nao recebera alertas push.');
    }
  }, [subscribeToPush]);

  const unreadCount = existingNotifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications: existingNotifications,
      unreadCount,
      isLoading,
      permissionStatus,
      requestPermission,
      markAsRead: onMarkAsRead,
      markAllAsRead: onMarkAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

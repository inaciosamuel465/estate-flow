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

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de <NotificationProvider>');
  return ctx;
};

// Helper for VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface Props {
  children: React.ReactNode;
  userId?: string | number;
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
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Registra Service Worker Notification e Push
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
        console.log('[Native Push] Service Worker registrado para Web Push.');
      })
      .catch((err) => {
        console.warn('[Native Push] Falha ao registrar SW:', err);
      });
  }, []);

  // Função core: Inscreve o dispositivo
  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      // 1. Get Public Key from Server
      const res = await fetch('/api/push/vapidPublicKey');
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('VAPID public key ausente no servidor.');

      // 2. Subscribe no Browser
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // 3. Salva no Banco de Dados via API
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: userId || null
        })
      });
      console.log('[Native Push] Dispositivo inscrito com sucesso.');
    } catch (e) {
      console.error('[Native Push] Erro ao subscrever para push:', e);
    }
  }, [userId]);

  // Solicita permissão e vincula
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || !swRegistrationRef.current) {
      alert('Navegador não suporta Push Notifications.');
      return;
    }
    
    const result = await window.Notification.requestPermission();
    setPermissionStatus(result);

    if (result === 'granted') {
      await subscribeToPush(swRegistrationRef.current);
    } else {
      alert('Permissão de notificações negada. Você não receberá alertas PUSH.');
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

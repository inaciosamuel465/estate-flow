import React, { useState, useRef, useEffect } from 'react';
import { AppNotification } from '../src/types';

interface NotificationCenterProps {
    notifications: AppNotification[];
    onMarkAsRead: (id: string | number) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
    position?: 'left' | 'right';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClearAll,
    position = 'right'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'contract': return 'gavel';
            case 'payment': return 'payments';
            case 'lead': return 'person_add';
            case 'property': return 'home';
            default: return 'notifications';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'contract': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
            case 'payment': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'lead': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
            case 'property': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botão de Notificações */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notificações"
            >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                    notifications
                </span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full size-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={`absolute ${position === 'right' ? 'right-0' : 'left-0 md:left-full md:-top-2 md:ml-4'} mt-2 w-[90vw] md:w-96 bg-white dark:bg-[#1a1d23] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in slide-in-from-top-2 md:slide-in-from-left-2 duration-200 fixed md:absolute left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 top-20 md:top-auto`}>
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#111318]">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={onMarkAllAsRead}
                                    className="text-xs font-bold text-primary hover:underline"
                                    title="Marcar todas como lidas"
                                >
                                    Marcar todas
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={onClearAll}
                                    className="text-xs font-bold text-slate-500 hover:text-rose-500"
                                    title="Limpar todas"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista de Notificações */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">notifications_off</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Nenhuma notificação</p>
                                <p className="text-xs text-slate-400 mt-1">Você está em dia com tudo!</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && onMarkAsRead(notification.id)}
                                    className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* Ícone */}
                                        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${getNotificationColor(notification.type)}`}>
                                            <span className="material-symbols-outlined text-[20px]">
                                                {notification.icon || getNotificationIcon(notification.type)}
                                            </span>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <div className="size-2 rounded-full bg-primary shrink-0 mt-1"></div>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                {formatTimestamp(notification.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318] text-center">
                            <button className="text-xs font-bold text-primary hover:underline">
                                Ver todas as notificações
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;

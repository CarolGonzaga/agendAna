import React from 'react';
import AppIcon from '@/components/AppIcon';
import { getUserById, APP_USERS, isSharedEvent } from '@/lib/users';
import { Users, Moon, Gem } from 'lucide-react';

export function UserAvatar({ user, size = 'sm', showName = false, className = '' }) {
    const u = typeof user === 'string' ? getUserById(user) : user;
    if (!u) return null;

    const sizeClasses = {
        xs: 'w-5 h-5 text-[10px]',
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
    };

    const iconSizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const isAna = u.name === 'Ana';

    return (
        <div className={`inline-flex items-center gap-1.5 ${className}`} title={`Compromisso de ${u.name}`}>
            <div
                className={`${sizeClasses[size] || sizeClasses.sm} rounded-full flex items-center justify-center font-bold shadow-sm ring-1 ring-border shrink-0 ${
                    isAna
                        ? 'bg-primary/15 text-primary ring-primary/30'
                        : 'bg-accent/40 text-foreground ring-accent'
                }`}
            >
                <AppIcon name={u.avatar} className={iconSizeClasses[size] || iconSizeClasses.sm} defaultIcon={isAna ? Moon : Gem} />
            </div>
            {showName && (
                <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
            )}
        </div>
    );
}

export function EventUserBadges({ series, size = 'xs', showNames = false, className = '' }) {
    if (!series) return null;

    const isShared = isSharedEvent(series);

    if (isShared) {
        return (
            <div className={`inline-flex items-center gap-1 ${className}`} title="Evento compartilhado com Ana e Carol">
                <div className="flex -space-x-1.5 items-center">
                    <UserAvatar user={APP_USERS[0]} size={size} />
                    <UserAvatar user={APP_USERS[1]} size={size} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                    <Users className="w-2.5 h-2.5" />
                    <span>Ambas</span>
                </div>
            </div>
        );
    }

    const singleUser = getUserById(series.user_id);
    if (!singleUser) return null;

    return (
        <div className={`inline-flex items-center gap-1 ${className}`}>
            <UserAvatar user={singleUser} size={size} showName={showNames} />
        </div>
    );
}

export default UserAvatar;

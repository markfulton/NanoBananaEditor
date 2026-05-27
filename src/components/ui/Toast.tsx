import React, { useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Notification } from '../../store/useNotificationStore';

const toastVariants = cva(
  'pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
        info: 'bg-gray-900/90 border-gray-700 text-gray-100',
      }
    },
    defaultVariants: {
      variant: 'info'
    }
  }
);

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const iconColorMap = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-gray-400'
};

interface ToastProps extends VariantProps<typeof toastVariants> {
  notification: Notification;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const Icon = iconMap[notification.type];
  
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onClose]);

  return (
    <div className={cn(toastVariants({ variant: notification.type }))}>
      <div className="flex items-start space-x-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColorMap[notification.type])} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{notification.title}</h4>
          {notification.message && (
            <p className="mt-1 text-sm opacity-90">{notification.message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 rounded-lg p-1 hover:bg-black/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
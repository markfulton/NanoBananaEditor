import { useNotificationStore } from '../store/useNotificationStore';

export const useNotifications = () => {
  const { addNotification } = useNotificationStore();

  const showSuccess = (title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    addNotification({ type: 'error', title, message });
  };

  const showWarning = (title: string, message?: string) => {
    addNotification({ type: 'warning', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
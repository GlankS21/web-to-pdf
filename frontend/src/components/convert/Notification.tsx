// src/components/Notification.tsx
import { useConverterStore } from '@/stores/converterStore';
import { useEffect } from 'react';

export const Notification = () => {
  const { notification, clearNotification } = useConverterStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const typeStyles = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  };

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-5">
      <div className={`px-6 py-4 rounded-lg border-l-4 shadow-lg ${typeStyles[notification.type]} max-w-md`}>
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium">{notification.message}</p>
          <button
            onClick={clearNotification}
            className="text-current hover:opacity-70 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
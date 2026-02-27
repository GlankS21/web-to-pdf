// src/components/TabButton.tsx
import { cn } from '@/lib/utils';
import type { ConversionTab } from '@/types/convert';

interface TabButtonProps {
  tab: ConversionTab;
  activeTab: ConversionTab;
  icon: string;
  label: string;
  onClick: () => void;
}

export const TabButton = ({ tab, activeTab, icon, label, onClick }: TabButtonProps) => {
  const isActive = activeTab === tab;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300',
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
};
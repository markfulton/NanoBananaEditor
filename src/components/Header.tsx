import React, { useState } from 'react';
import { Button } from './ui/Button';
import { HelpCircle, Settings } from 'lucide-react';
import { InfoModal } from './InfoModal';
import { SettingsModal } from './SettingsModal';
import { useAppStore } from '../store/useAppStore';

export const Header: React.FC = () => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { showSettings, setShowSettings } = useAppStore();

  return (
    <>
      <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🍌</div>
            <h1 className="text-xl font-semibold text-gray-100 hidden md:block">
              Nano Banana AI Image Editor
            </h1>
            <h1 className="text-xl font-semibold text-gray-100 md:hidden">
              NB Editor
            </h1>
          </div>
          <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            1.0
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowInfoModal(true)}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <InfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
};
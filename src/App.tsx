import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from './utils/cn';
import { Header } from './components/Header';
import { PromptComposer } from './components/PromptComposer';
import { ImageCanvas } from './components/ImageCanvas';
import { HistoryPanel } from './components/HistoryPanel';
import { NotificationContainer } from './components/NotificationContainer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppStore } from './store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent() {
  useKeyboardShortcuts();
  
  const { showPromptPanel, setShowPromptPanel, showHistory, setShowHistory } = useAppStore();
  
  // Set mobile defaults on mount
  React.useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setShowPromptPanel(false);
        setShowHistory(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setShowPromptPanel, setShowHistory]);

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-shrink-0 transition-all duration-300", !showPromptPanel && "w-8")}>
          <PromptComposer />
        </div>
        <div className="flex-1 min-w-0">
          <ImageCanvas />
        </div>
        <div className="flex-shrink-0">
          <HistoryPanel />
        </div>
      </div>
      <NotificationContainer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
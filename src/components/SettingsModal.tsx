import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useNotifications } from '../hooks/useNotifications';
import { geminiService } from '../services/geminiService';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const { apiKey, setApiKey } = useAppStore();
  const { showSuccess, showError } = useNotifications();
  
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);

  const handleSave = async () => {
    const trimmedKey = inputKey.trim();
    
    if (!trimmedKey) {
      setApiKey(null);
      showSuccess('Settings saved', 'API key cleared. Using environment variable if available.');
      onOpenChange(false);
      return;
    }
    
    setIsValidating(true);
    try {
      const validation = await geminiService.validateApiKey(trimmedKey);
      
      if (validation.valid) {
        setApiKey(trimmedKey);
        showSuccess('Settings saved', 'API key is valid and has been saved.');
        onOpenChange(false);
      } else {
        showError('Invalid API key', validation.error?.userMessage || 'Please check your API key.');
      }
    } catch (error) {
      showError('Validation failed', 'Unable to validate API key. It will be saved anyway.');
      setApiKey(trimmedKey);
      onOpenChange(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestKey = async () => {
    const trimmedKey = inputKey.trim();
    if (!trimmedKey) {
      showError('No API key', 'Please enter an API key to test.');
      return;
    }

    setIsTestingKey(true);
    try {
      const validation = await geminiService.validateApiKey(trimmedKey);
      
      if (validation.valid) {
        showSuccess('API key is valid', 'Your API key works correctly with Gemini API.');
      } else {
        showError('Invalid API key', validation.error?.userMessage || 'Please check your API key.');
      }
    } catch (error) {
      showError('Test failed', 'Unable to test API key. Please check your connection.');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleCancel = () => {
    setInputKey(apiKey || '');
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-gray-100">
              Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Get your API key from{' '}
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 underline"
                >
                  Google AI Studio
                </a>
              </p>
              
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="flex space-x-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestKey}
                  disabled={isTestingKey || !inputKey.trim()}
                >
                  {isTestingKey ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Key'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isValidating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
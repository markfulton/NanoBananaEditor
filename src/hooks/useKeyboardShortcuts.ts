import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useKeyboardShortcuts = () => {
  const {
    setSelectedTool,
    setShowHistory,
    showHistory,
    setShowPromptPanel,
    showPromptPanel,
    currentPrompt,
    isGenerating,
    selectedTextId,
    deleteTextLayer,
    selectTextLayer,
    selectedTool,
    undoText,
    redoText,
  } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle undo/redo even when typing (for text tool)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && selectedTool === 'text') {
        event.preventDefault();
        if (event.shiftKey) {
          redoText();
        } else {
          undoText();
        }
        return;
      }

      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        // Only handle Cmd/Ctrl + Enter for generation
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          if (!isGenerating && currentPrompt.trim()) {
            console.log('Generate via keyboard shortcut');
          }
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'e':
          event.preventDefault();
          setSelectedTool('edit');
          break;
        case 'g':
          event.preventDefault();
          setSelectedTool('generate');
          break;
        case 'm':
          event.preventDefault();
          setSelectedTool('mask');
          break;
        case 't':
          event.preventDefault();
          setSelectedTool('text');
          break;
        case 'h':
          event.preventDefault();
          setShowHistory(!showHistory);
          break;
        case 'p':
          event.preventDefault();
          setShowPromptPanel(!showPromptPanel);
          break;
        case 'r':
          if (event.shiftKey) {
            event.preventDefault();
            console.log('Re-roll variants');
          }
          break;
        case 'delete':
        case 'backspace':
          // Delete selected text layer
          if (selectedTextId) {
            event.preventDefault();
            deleteTextLayer(selectedTextId);
          }
          break;
        case 'escape':
          // Deselect text layer
          if (selectedTextId) {
            event.preventDefault();
            selectTextLayer(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedTool, setShowHistory, showHistory, setShowPromptPanel, showPromptPanel, currentPrompt, isGenerating, selectedTextId, deleteTextLayer, selectTextLayer, selectedTool, undoText, redoText]);
};
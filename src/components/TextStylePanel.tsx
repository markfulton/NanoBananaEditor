import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { HexColorPicker } from 'react-colorful';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Trash2,
  Plus,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '../utils/cn';

const AVAILABLE_FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Bebas Neue', value: 'Bebas Neue, cursive' },
  { name: 'Pacifico', value: 'Pacifico, cursive' },
  { name: 'Dancing Script', value: 'Dancing Script, cursive' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
];

export const TextStylePanel: React.FC = () => {
  const {
    textLayers,
    selectedTextId,
    addTextLayer,
    updateTextLayer,
    deleteTextLayer,
    selectTextLayer,
    undoText,
    redoText,
    textHistoryIndex,
    textHistory,
  } = useAppStore();

  const [showColorPicker, setShowColorPicker] = useState(false);

  const selectedText = textLayers.find((layer) => layer.id === selectedTextId);

  const handleAddText = () => {
    const newText = {
      id: `text-${Date.now()}`,
      text: 'Double click to edit',
      x: 100,
      y: 100,
      fontSize: 48,
      fontFamily: 'Inter, sans-serif',
      fill: '#FFFFFF',
      align: 'left' as const,
      fontStyle: 'normal' as const,
      textDecoration: '' as const,
      rotation: 0,
      width: 400,
    };
    addTextLayer(newText);
  };

  const handleFontChange = (fontFamily: string) => {
    if (selectedTextId) {
      updateTextLayer(selectedTextId, { fontFamily });

      // Load Google Font dynamically
      const fontName = fontFamily.split(',')[0].replace(/['"]/g, '');
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      if (!document.querySelector(`link[href*="${fontName.replace(/ /g, '+')}"]`)) {
        document.head.appendChild(link);
      }
    }
  };

  const handleToggleBold = () => {
    if (selectedTextId && selectedText) {
      const isBold = selectedText.fontStyle === 'bold';
      updateTextLayer(selectedTextId, {
        fontStyle: isBold ? 'normal' : 'bold',
      });
    }
  };

  const handleToggleItalic = () => {
    if (selectedTextId && selectedText) {
      const isItalic = selectedText.fontStyle === 'italic';
      updateTextLayer(selectedTextId, {
        fontStyle: isItalic ? 'normal' : 'italic',
      });
    }
  };

  const handleToggleUnderline = () => {
    if (selectedTextId && selectedText) {
      const hasUnderline = selectedText.textDecoration === 'underline';
      updateTextLayer(selectedTextId, {
        textDecoration: hasUnderline ? '' : 'underline',
      });
    }
  };

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    if (selectedTextId) {
      updateTextLayer(selectedTextId, { align });
    }
  };

  const handleDeleteText = () => {
    if (selectedTextId) {
      deleteTextLayer(selectedTextId);
    }
  };

  const canUndo = textHistoryIndex > 0;
  const canRedo = textHistoryIndex < textHistory.length - 1;

  return (
    <div className="w-80 h-full bg-gray-950 border-l border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Text Tool</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undoText}
              disabled={!canUndo}
              className="h-7 w-7"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redoText}
              disabled={!canRedo}
              className="h-7 w-7"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={handleAddText} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Text Layer
        </Button>
      </div>

      {selectedText && (
        <>
          {/* Text Input */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Text Content</label>
            <textarea
              value={selectedText.text}
              onChange={(e) => updateTextLayer(selectedTextId!, { text: e.target.value })}
              className="w-full h-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter text..."
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Font Family</label>
            <select
              value={selectedText.fontFamily}
              onChange={(e) => handleFontChange(e.target.value)}
              className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">
              Font Size ({selectedText.fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="200"
              value={selectedText.fontSize}
              onChange={(e) =>
                updateTextLayer(selectedTextId!, { fontSize: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Text Color</label>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm text-gray-100">{selectedText.fill.toUpperCase()}</span>
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: selectedText.fill }}
                />
              </button>
              {showColorPicker && (
                <div className="absolute z-50 mt-2">
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="relative bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-xl">
                    <HexColorPicker
                      color={selectedText.fill}
                      onChange={(color) => updateTextLayer(selectedTextId!, { fill: color })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Styling Buttons */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Style</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedText.fontStyle === 'bold' ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleBold}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedText.fontStyle === 'italic' ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleItalic}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedText.textDecoration === 'underline' ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Alignment</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedText.align === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAlignChange('left')}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedText.align === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAlignChange('center')}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedText.align === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAlignChange('right')}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Delete Button */}
          <div className="pt-4 border-t border-gray-800">
            <Button variant="destructive" onClick={handleDeleteText} className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Text Layer
            </Button>
          </div>
        </>
      )}

      {!selectedText && textLayers.length > 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center">
            Click on a text layer to edit its properties
          </p>
        </div>
      )}

      {textLayers.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center">
            No text layers yet. Click "Add Text Layer" to get started!
          </p>
        </div>
      )}

      {/* Text Layers List */}
      {textLayers.length > 0 && (
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Text Layers</h4>
          <div className="space-y-2">
            {textLayers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => selectTextLayer(layer.id)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all',
                  selectedTextId === layer.id
                    ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
                )}
              >
                <div className="flex items-center justify-between">
                  <Type className="h-4 w-4" />
                  <span className="text-xs">
                    {layer.fontSize}px
                  </span>
                </div>
                <p className="text-xs mt-1 truncate">{layer.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

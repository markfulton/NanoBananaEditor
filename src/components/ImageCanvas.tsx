import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, EyeOff, Eraser } from 'lucide-react';
import { cn } from '../utils/cn';

export const ImageCanvas: React.FC = () => {
  const {
    canvasImage,
    canvasZoom,
    setCanvasZoom,
    canvasPan,
    setCanvasPan,
    brushStrokes,
    addBrushStroke,
    clearBrushStrokes,
    showMasks,
    setShowMasks,
    selectedTool,
    isGenerating,
    brushSize,
    setBrushSize
  } = useAppStore();

  const stageRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);

  // Load image and auto-fit when canvasImage changes
  useEffect(() => {
    if (canvasImage) {
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
        
        // Only auto-fit if this is a new image (no existing zoom/pan state)
        if (canvasZoom === 1 && canvasPan.x === 0 && canvasPan.y === 0) {
          // Auto-fit image to canvas
          const isMobile = window.innerWidth < 768;
          const padding = isMobile ? 0.9 : 0.8; // Use more of the screen on mobile
          
          const scaleX = (stageSize.width * padding) / img.width;
          const scaleY = (stageSize.height * padding) / img.height;
          
          const maxZoom = isMobile ? 0.3 : 0.8;
          const optimalZoom = Math.min(scaleX, scaleY, maxZoom);
          
          setCanvasZoom(optimalZoom);
          
          // Center the image
          setCanvasPan({ x: 0, y: 0 });
        }
      };
      img.src = canvasImage;
    } else {
      setImage(null);
    }
  }, [canvasImage, stageSize, setCanvasZoom, setCanvasPan, canvasZoom, canvasPan]);

  // Handle stage resize
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (container) {
        setStageSize({
          width: container.offsetWidth,
          height: container.offsetHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseDown = (e: any) => {
    if (selectedTool !== 'mask' || !image) return;
    
    setIsDrawing(true);
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    // Use Konva's getRelativePointerPosition for accurate coordinates
    const relativePos = stage.getRelativePointerPosition();
    
    // Calculate image bounds on the stage
    const imageX = (stageSize.width / canvasZoom - image.width) / 2;
    const imageY = (stageSize.height / canvasZoom - image.height) / 2;
    
    // Convert to image-relative coordinates
    const relativeX = relativePos.x - imageX;
    const relativeY = relativePos.y - imageY;
    
    // Check if click is within image bounds
    if (relativeX >= 0 && relativeX <= image.width && relativeY >= 0 && relativeY <= image.height) {
      setCurrentStroke([relativeX, relativeY]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || selectedTool !== 'mask' || !image) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    // Use Konva's getRelativePointerPosition for accurate coordinates
    const relativePos = stage.getRelativePointerPosition();
    
    // Calculate image bounds on the stage
    const imageX = (stageSize.width / canvasZoom - image.width) / 2;
    const imageY = (stageSize.height / canvasZoom - image.height) / 2;
    
    // Convert to image-relative coordinates
    const relativeX = relativePos.x - imageX;
    const relativeY = relativePos.y - imageY;
    
    // Check if within image bounds
    if (relativeX >= 0 && relativeX <= image.width && relativeY >= 0 && relativeY <= image.height) {
      setCurrentStroke([...currentStroke, relativeX, relativeY]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentStroke.length < 4) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }
    
    setIsDrawing(false);
    addBrushStroke({
      id: `stroke-${Date.now()}`,
      points: currentStroke,
      brushSize,
    });
    setCurrentStroke([]);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, canvasZoom + delta));
    setCanvasZoom(newZoom);
  };

  const handleReset = () => {
    if (image) {
      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? 0.9 : 0.8;
      const scaleX = (stageSize.width * padding) / image.width;
      const scaleY = (stageSize.height * padding) / image.height;
      const maxZoom = isMobile ? 0.3 : 0.8;
      const optimalZoom = Math.min(scaleX, scaleY, maxZoom);
      
      setCanvasZoom(optimalZoom);
      setCanvasPan({ x: 0, y: 0 });
    }
  };

  const handleDownload = () => {
    if (canvasImage) {
      if (canvasImage.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = canvasImage;
        link.download = `nano-banana-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between">
          {/* Left side - Zoom controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 min-w-[60px] text-center">
              {Math.round(canvasZoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Tools and actions */}
          <div className="flex items-center space-x-2">
            {selectedTool === 'mask' && (
              <>
                <div className="flex items-center space-x-2 mr-2">
                  <span className="text-xs text-gray-400">Brush:</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-16 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-gray-400 w-6">{brushSize}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBrushStrokes}
                  disabled={brushStrokes.length === 0}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMasks(!showMasks)}
              className={cn(showMasks && 'bg-yellow-400/10 border-yellow-400/50')}
            >
              {showMasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">Masks</span>
            </Button>
            
            {canvasImage && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        id="canvas-container" 
        className="flex-1 relative overflow-hidden bg-gray-800"
      >
        {!image && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🍌</div>
              <h2 className="text-xl font-medium text-gray-300 mb-2">
                Welcome to Nano Banana Framework
              </h2>
              <p className="text-gray-500 max-w-md">
                {selectedTool === 'generate' 
                  ? 'Start by describing what you want to create in the prompt box'
                  : 'Upload an image to begin editing'
                }
              </p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4" />
              <p className="text-gray-300">Creating your image...</p>
            </div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={canvasZoom}
          scaleY={canvasZoom}
          x={canvasPan.x * canvasZoom}
          y={canvasPan.y * canvasZoom}
          draggable={selectedTool !== 'mask'}
          onDragEnd={(e) => {
            setCanvasPan({ 
              x: e.target.x() / canvasZoom, 
              y: e.target.y() / canvasZoom 
            });
          }}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ 
            cursor: selectedTool === 'mask' ? 'crosshair' : 'default' 
          }}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                x={(stageSize.width / canvasZoom - image.width) / 2}
                y={(stageSize.height / canvasZoom - image.height) / 2}
              />
            )}
            
            {/* Brush Strokes */}
            {showMasks && brushStrokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke="#A855F7"
                strokeWidth={stroke.brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                opacity={0.6}
                x={(stageSize.width / canvasZoom - (image?.width || 0)) / 2}
                y={(stageSize.height / canvasZoom - (image?.height || 0)) / 2}
              />
            ))}
            
            {/* Current stroke being drawn */}
            {isDrawing && currentStroke.length > 2 && (
              <Line
                points={currentStroke}
                stroke="#A855F7"
                strokeWidth={brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                opacity={0.6}
                x={(stageSize.width / canvasZoom - (image?.width || 0)) / 2}
                y={(stageSize.height / canvasZoom - (image?.height || 0)) / 2}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {brushStrokes.length > 0 && (
              <span className="text-yellow-400">{brushStrokes.length} brush stroke{brushStrokes.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              © 2025 Mark Fulton - 
              <a
                href="https://www.reinventing.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 transition-colors ml-1"
              >
                Reinventing.AI Solutions
              </a>
            </span>
            <span className="text-gray-600 hidden md:inline">•</span>
            <span className="text-yellow-400 hidden md:inline">⚡</span>
            <span className="hidden md:inline">Powered by Gemini 2.5 Flash Image</span>
          </div>
        </div>
      </div>
    </div>
  );
};
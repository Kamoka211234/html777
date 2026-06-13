import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, Copy, Trash2, Code, Shuffle, Download, Upload, 
  Sun, Moon, Eye, EyeOff, Plus, Minus, RefreshCw, Check, 
  X, Sliders, Palette, Layers, Sparkles, Zap, Heart, Star,
  Grid, AlignCenter, AlignLeft, AlignRight, AlignStart, AlignEnd,
  Move, RotateCw, RotateCcw, ZoomIn, ZoomOut, Undo, Redo,
  Settings, Info, Share2, FileJson, FileText, Image, Monitor,
  Phone, Tablet, Laptop, Globe, Lock, Unlock, FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { playSound } from '../utils/sound';

interface GradientStop {
  id: string;
  position: number;
  color: string;
  opacity: number;
}

interface Preset {
  id: string;
  name: string;
  colors: { position: number; color: string }[];
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  tags: string[];
}

interface SavedGradient {
  id: string;
  name: string;
  stops: GradientStop[];
  type: 'linear' | 'radial' | 'conic';
  angle: number;
  createdAt: number;
  favorited: boolean;
}

interface AnimationConfig {
  type: 'none' | 'shift' | 'pulse' | 'rotate' | 'wave' | 'breath' | 'glow' | 'rainbow';
  duration: number;
  delay: number;
  iterationCount: 'infinite' | number;
  direction: 'normal' | 'reverse' | 'alternate';
  easing: string;
}

const GRADIENT_PRESETS: Preset[] = [
  { id: 'hyper', name: 'Hyper', colors: [{ position: 0, color: '#EC4899' }, { position: 100, color: '#8B5CF6' }], type: 'linear', angle: 45, tags: ['vibrant', 'modern'] },
  { id: 'oceanic', name: 'Oceanic', colors: [{ position: 0, color: '#06b6d4' }, { position: 100, color: '#3b82f6' }], type: 'linear', angle: 135, tags: ['cool', 'calm'] },
  { id: 'peach', name: 'Peach', colors: [{ position: 0, color: '#FFD6A5' }, { position: 100, color: '#FA8072' }], type: 'linear', angle: 90, tags: ['warm', 'soft'] },
  { id: 'mint', name: 'Mint', colors: [{ position: 0, color: '#a8ff78' }, { position: 100, color: '#78ffd6' }], type: 'linear', angle: 0, tags: ['fresh', 'green'] },
  { id: 'dusk', name: 'Dusk', colors: [{ position: 0, color: '#2c3e50' }, { position: 100, color: '#fd746c' }], type: 'linear', angle: 180, tags: ['sunset', 'dramatic'] },
  { id: 'cotton', name: 'Cotton', colors: [{ position: 0, color: '#FBC2EB' }, { position: 100, color: '#A6C1EE' }], type: 'linear', angle: 120, tags: ['pastel', 'gentle'] },
  { id: 'gotham', name: 'Gotham', colors: [{ position: 0, color: '#2C3E50' }, { position: 100, color: '#000000' }], type: 'linear', angle: 135, tags: ['dark', 'premium'] },
  { id: 'sunset', name: 'Sunset', colors: [{ position: 0, color: '#FF7E5F' }, { position: 100, color: '#FEB47B' }], type: 'linear', angle: 90, tags: ['warm', 'sunset'] },
  { id: 'mojito', name: 'Mojito', colors: [{ position: 0, color: '#1D976C' }, { position: 100, color: '#93F9B9' }], type: 'linear', angle: 45, tags: ['fresh', 'green'] },
  { id: 'plasma', name: 'Plasma', colors: [{ position: 0, color: '#8E2DE2' }, { position: 100, color: '#4A00E0' }], type: 'linear', angle: 160, tags: ['vibrant', 'purple'] },
  { id: 'aurora', name: 'Aurora', colors: [{ position: 0, color: '#11998e' }, { position: 50, color: '#38ef7d' }, { position: 100, color: '#00b4db' }], type: 'linear', angle: 120, tags: ['nature', 'vibrant'] },
  { id: 'fire', name: 'Fire', colors: [{ position: 0, color: '#f12711' }, { position: 50, color: '#f5af19' }, { position: 100, color: '#f12711' }], type: 'linear', angle: 90, tags: ['warm', 'intense'] },
  { id: 'ice', name: 'Ice', colors: [{ position: 0, color: '#2193b0' }, { position: 50, color: '#6dd5ed' }, { position: 100, color: '#ffffff' }], type: 'linear', angle: 270, tags: ['cool', 'fresh'] },
  { id: 'midnight', name: 'Midnight', colors: [{ position: 0, color: '#232526' }, { position: 100, color: '#414345' }], type: 'linear', angle: 45, tags: ['dark', 'elegant'] },
  { id: 'cherry', name: 'Cherry', colors: [{ position: 0, color: '#eb3349' }, { position: 100, color: '#f45c43' }], type: 'linear', angle: 135, tags: ['vibrant', 'red'] }
];

const CSS_SNIPPETS = {
  standard: (css: string) => css,
  withBrowserPrefix: (css: string) => {
    return `-webkit-background: ${css.replace('background:', '').trim()};
-moz-background: ${css.replace('background:', '').trim()};
background: ${css.replace('background:', '').trim()};`;
  },
  withFallback: (css: string, fallbackColor: string) => {
    return `background: ${fallbackColor};
${css};`;
  }
};

const GradientGenerator: React.FC = () => {
  // Core state
  const [stops, setStops] = useState<GradientStop[]>([
    { id: '1', position: 0, color: '#EC4899', opacity: 1 },
    { id: '2', position: 100, color: '#8B5CF6', opacity: 1 }
  ]);
  const [gradientType, setGradientType] = useState<'linear' | 'radial' | 'conic'>('linear');
  const [angle, setAngle] = useState(135);
  const [selectedStopId, setSelectedStopId] = useState<string>('1');
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
    type: 'none',
    duration: 3,
    delay: 0,
    iterationCount: 'infinite',
    direction: 'normal',
    easing: 'ease-in-out'
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [showTailwind, setShowTailwind] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedGradients, setSavedGradients] = useState<SavedGradient[]>([]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [exportFormat, setExportFormat] = useState<'css' | 'tailwind' | 'scss' | 'svg'>('css');
  const [previewSize, setPreviewSize] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const [history, setHistory] = useState<{ stops: GradientStop[]; type: string; angle: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [gradientName, setGradientName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [radialPosition, setRadialPosition] = useState({ x: 50, y: 50 });
  const [conicStart, setConicStart] = useState(0);
  const [isDraggingStop, setIsDraggingStop] = useState(false);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  const selectedStop = stops.find(s => s.id === selectedStopId) || stops[0];

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      stops: JSON.parse(JSON.stringify(stops)),
      type: gradientType,
      angle: angle
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [stops, gradientType, angle, history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setStops(prev.stops);
      setGradientType(prev.type as any);
      setAngle(prev.angle);
      setHistoryIndex(historyIndex - 1);
      playSound('click');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setStops(next.stops);
      setGradientType(next.type as any);
      setAngle(next.angle);
      setHistoryIndex(historyIndex + 1);
      playSound('click');
    }
  };

  // Generate random color
  const randomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Add new stop
  const addStop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let position = ((e.clientX - rect.left) / rect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    
    // Find nearest colors to interpolate
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    let leftStop = sortedStops[0];
    let rightStop = sortedStops[sortedStops.length - 1];
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      if (position >= sortedStops[i].position && position <= sortedStops[i + 1].position) {
        leftStop = sortedStops[i];
        rightStop = sortedStops[i + 1];
        break;
      }
    }
    
    const ratio = (position - leftStop.position) / (rightStop.position - leftStop.position);
    const interpolatedColor = interpolateColor(leftStop.color, rightStop.color, ratio);
    
    const newStop: GradientStop = {
      id: Date.now().toString(),
      position: Math.round(position),
      color: interpolatedColor,
      opacity: 1
    };
    
    const newStops = [...stops, newStop].sort((a, b) => a.position - b.position);
    setStops(newStops);
    setSelectedStopId(newStop.id);
    saveToHistory();
    playSound('click');
  };

  const interpolateColor = (color1: string, color2: string, ratio: number): string => {
    const hex1 = color1.substring(1);
    const hex2 = color2.substring(1);
    
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const updateStop = (id: string, updates: Partial<GradientStop>) => {
    setStops(stops.map(s => s.id === id ? { ...s, ...updates } : s).sort((a, b) => a.position - b.position));
    saveToHistory();
  };

  const deleteStop = (id: string) => {
    if (stops.length <= 2) return;
    setStops(stops.filter(s => s.id !== id));
    if (selectedStopId === id) {
      setSelectedStopId(stops.find(s => s.id !== id)?.id || stops[0].id);
    }
    saveToHistory();
    playSound('pop');
  };

  const randomize = () => {
    const numStops = 2 + Math.floor(Math.random() * 4);
    const newStops: GradientStop[] = [];
    for (let i = 0; i < numStops; i++) {
      newStops.push({
        id: Date.now().toString() + i,
        position: Math.floor((i / (numStops - 1)) * 100),
        color: randomColor(),
        opacity: 0.7 + Math.random() * 0.3
      });
    }
    setStops(newStops);
    setAngle(Math.floor(Math.random() * 360));
    setRadialPosition({ x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 });
    saveToHistory();
    playSound('pop');
  };

  const applyPreset = (preset: Preset) => {
    const newStops: GradientStop[] = preset.colors.map((c, idx) => ({
      id: Date.now().toString() + idx,
      position: c.position,
      color: c.color,
      opacity: 1
    }));
    setStops(newStops);
    setGradientType(preset.type);
    if (preset.angle) setAngle(preset.angle);
    saveToHistory();
    playSound('click');
  };

  const getGradientString = useCallback(() => {
    const stopStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');
    if (gradientType === 'linear') return `linear-gradient(${angle}deg, ${stopStr})`;
    if (gradientType === 'radial') return `radial-gradient(circle at ${radialPosition.x}% ${radialPosition.y}%, ${stopStr})`;
    if (gradientType === 'conic') return `conic-gradient(from ${angle + conicStart}deg at ${radialPosition.x}% ${radialPosition.y}%, ${stopStr})`;
    return '';
  }, [stops, gradientType, angle, radialPosition, conicStart]);

  const getCSS = useCallback(() => {
    const grad = getGradientString();
    let css = `background: ${grad};`;
    
    if (animationConfig.type !== 'none' && isPlaying) {
      if (animationConfig.type === 'shift') {
        css += `\nbackground-size: 200% 200%;\nanimation: gradient-shift ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'rotate') {
        css += `\nanimation: gradient-rotate ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'pulse') {
        css += `\nanimation: gradient-pulse ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'wave') {
        css += `\nbackground-size: 300% 100%;\nanimation: gradient-wave ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'breath') {
        css += `\nanimation: gradient-breath ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'glow') {
        css += `\nanimation: gradient-glow ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      } else if (animationConfig.type === 'rainbow') {
        css += `\nanimation: gradient-rainbow ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};`;
      }
    }
    return css;
  }, [getGradientString, animationConfig, isPlaying]);

  const getKeyframes = useCallback(() => {
    if (animationConfig.type === 'shift') {
      return `@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
    }
    if (animationConfig.type === 'rotate') {
      return `@keyframes gradient-rotate {
  100% { transform: rotate(360deg); }
}`;
    }
    if (animationConfig.type === 'pulse') {
      return `@keyframes gradient-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.85; }
}`;
    }
    if (animationConfig.type === 'wave') {
      return `@keyframes gradient-wave {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}`;
    }
    if (animationConfig.type === 'breath') {
      return `@keyframes gradient-breath {
  0%, 100% { opacity: 1; filter: brightness(1); }
  50% { opacity: 0.7; filter: brightness(1.1); }
}`;
    }
    if (animationConfig.type === 'glow') {
      return `@keyframes gradient-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)); }
  50% { filter: drop-shadow(0 0 30px rgba(0,0,0,0.5)); }
}`;
    }
    if (animationConfig.type === 'rainbow') {
      return `@keyframes gradient-rainbow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}`;
    }
    return '';
  }, [animationConfig.type]);

  const getTailwindCode = useCallback(() => {
    const stopsStr = stops.map(s => `${s.color}_${s.position}%`).join(',');
    let gradientClass = '';
    if (gradientType === 'linear') {
      gradientClass = `bg-[linear-gradient(${angle}deg,${stopsStr})]`;
    } else if (gradientType === 'radial') {
      gradientClass = `bg-[radial-gradient(circle_at_${radialPosition.x}%_${radialPosition.y}%,${stopsStr})]`;
    } else {
      gradientClass = `bg-[conic-gradient(from_${angle + conicStart}deg_at_${radialPosition.x}%_${radialPosition.y}%,${stopsStr})]`;
    }
    
    let animationClass = '';
    if (animationConfig.type !== 'none' && isPlaying) {
      const animName = `animate-[gradient-${animationConfig.type}_${animationConfig.duration}s_${animationConfig.easing}_${animationConfig.delay}s_${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount}]`;
      animationClass = ` ${animName}`;
    }
    
    return `<div class="${gradientClass}${animationClass}"></div>`;
  }, [stops, gradientType, angle, radialPosition, conicStart, animationConfig, isPlaying]);

  const getSCSSCode = useCallback(() => {
    const grad = getGradientString();
    let scss = `@mixin gradient-mixin {\n  background: ${grad};\n`;
    if (animationConfig.type !== 'none' && isPlaying) {
      scss += `  animation: gradient-${animationConfig.type} ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction};\n`;
    }
    scss += `}\n\n`;
    if (animationConfig.type !== 'none') {
      scss += getKeyframes();
    }
    return scss;
  }, [getGradientString, animationConfig, isPlaying, getKeyframes]);

  const getSVGCode = useCallback(() => {
    const grad = getGradientString();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${stops.map(s => `<stop offset="${s.position}%" stop-color="${s.color}" stop-opacity="${s.opacity}" />`).join('\n      ')}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" />
</svg>`;
  }, [stops]);

  const getExportCode = useCallback(() => {
    switch (exportFormat) {
      case 'css': return getCSS() + '\n\n' + getKeyframes();
      case 'tailwind': return getTailwindCode();
      case 'scss': return getSCSSCode();
      case 'svg': return getSVGCode();
      default: return getCSS();
    }
  }, [exportFormat, getCSS, getKeyframes, getTailwindCode, getSCSSCode, getSVGCode]);

  const copyToClipboard = async () => {
    const code = getExportCode();
    await navigator.clipboard.writeText(code);
    playSound('success');
  };

  const saveCurrentGradient = () => {
    if (!gradientName.trim()) {
      setGradientName(`Gradient_${Date.now()}`);
    }
    const newSaved: SavedGradient = {
      id: Date.now().toString(),
      name: gradientName || `Gradient_${Date.now()}`,
      stops: JSON.parse(JSON.stringify(stops)),
      type: gradientType,
      angle: angle,
      createdAt: Date.now(),
      favorited: false
    };
    setSavedGradients(prev => [...prev, newSaved]);
    setShowSaveModal(false);
    setGradientName('');
    playSound('success');
  };

  const loadSavedGradient = (saved: SavedGradient) => {
    setStops(saved.stops);
    setGradientType(saved.type);
    setAngle(saved.angle);
    saveToHistory();
    setShowSavedPanel(false);
    playSound('click');
  };

  const deleteSavedGradient = (id: string) => {
    setSavedGradients(prev => prev.filter(g => g.id !== id));
    playSound('pop');
  };

  const exportAsImage = async () => {
    if (!previewRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const rect = previewRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      stops.forEach(stop => {
        gradient.addColorStop(stop.position / 100, stop.color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const link = document.createElement('a');
      link.download = `gradient_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
    playSound('success');
  };

  const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.stops && data.type) {
          setStops(data.stops);
          setGradientType(data.type);
          if (data.angle) setAngle(data.angle);
          saveToHistory();
          playSound('success');
        }
      } catch (err) {
        console.error('Invalid JSON file');
        playSound('pop');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const duplicateStop = () => {
    if (selectedStop) {
      const newStop: GradientStop = {
        ...selectedStop,
        id: Date.now().toString(),
        position: Math.min(100, selectedStop.position + 5)
      };
      const newStops = [...stops, newStop].sort((a, b) => a.position - b.position);
      setStops(newStops);
      setSelectedStopId(newStop.id);
      saveToHistory();
      playSound('click');
    }
  };

  const resetToDefault = () => {
    setStops([
      { id: '1', position: 0, color: '#EC4899', opacity: 1 },
      { id: '2', position: 100, color: '#8B5CF6', opacity: 1 }
    ]);
    setGradientType('linear');
    setAngle(135);
    setAnimationConfig({
      type: 'none',
      duration: 3,
      delay: 0,
      iterationCount: 'infinite',
      direction: 'normal',
      easing: 'ease-in-out'
    });
    setRadialPosition({ x: 50, y: 50 });
    setConicStart(0);
    saveToHistory();
    playSound('click');
  };

  const getPreviewSizeClass = () => {
    switch (previewSize) {
      case 'small': return 'h-32';
      case 'medium': return 'h-48';
      case 'large': return 'h-64';
      case 'full': return 'h-96';
      default: return 'h-48';
    }
  };

  const getAnimationStyle = useMemo(() => {
    if (animationConfig.type === 'none' || !isPlaying) return {};
    
    const baseStyle: any = {};
    if (animationConfig.type === 'shift') {
      baseStyle.backgroundSize = '200% 200%';
      baseStyle.animation = `gradient-shift ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'rotate') {
      baseStyle.animation = `gradient-rotate ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'pulse') {
      baseStyle.animation = `gradient-pulse ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'wave') {
      baseStyle.backgroundSize = '300% 100%';
      baseStyle.animation = `gradient-wave ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'breath') {
      baseStyle.animation = `gradient-breath ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'glow') {
      baseStyle.animation = `gradient-glow ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    } else if (animationConfig.type === 'rainbow') {
      baseStyle.animation = `gradient-rainbow ${animationConfig.duration}s ${animationConfig.easing} ${animationConfig.delay}s ${animationConfig.iterationCount === 'infinite' ? 'infinite' : animationConfig.iterationCount} ${animationConfig.direction}`;
    }
    return baseStyle;
  }, [animationConfig, isPlaying]);

  useEffect(() => {
    saveToHistory();
  }, []);

  const selectedStopData = stops.find(s => s.id === selectedStopId) || stops[0];

  return (
    <div className="flex flex-col h-full text-[#cccccc] overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a]">
      <style>{`
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes gradient-rotate { 100% { transform: rotate(360deg); } }
        @keyframes gradient-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.02); opacity: 0.9; } }
        @keyframes gradient-wave { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes gradient-breath { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.85; filter: brightness(1.05); } }
        @keyframes gradient-glow { 0%, 100% { filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)); } 50% { filter: drop-shadow(0 0 25px rgba(0,0,0,0.5)); } }
        @keyframes gradient-rainbow { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
        
        .gradient-stop-handle { transition: transform 0.1s ease, box-shadow 0.1s ease; }
        .gradient-stop-handle:hover { transform: scale(1.15); }
        .gradient-stop-handle.active { transform: scale(1.2); box-shadow: 0 0 0 3px rgba(0,122,204,0.5); }
      `}</style>

      {/* Hidden file input for JSON import */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={importFromJSON} />

      {/* Live Preview */}
      <div className={`${getPreviewSizeClass()} p-4 flex items-center justify-center relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] shrink-0 border-b border-white/10`}>
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <button onClick={() => setPreviewSize('small')} className={`p-1.5 rounded-lg ${previewSize === 'small' ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/15 transition-colors`}><Monitor size={12} /></button>
          <button onClick={() => setPreviewSize('medium')} className={`p-1.5 rounded-lg ${previewSize === 'medium' ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/15 transition-colors`}><Laptop size={12} /></button>
          <button onClick={() => setPreviewSize('large')} className={`p-1.5 rounded-lg ${previewSize === 'large' ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/15 transition-colors`}><Tablet size={12} /></button>
          <button onClick={() => setPreviewSize('full')} className={`p-1.5 rounded-lg ${previewSize === 'full' ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/15 transition-colors`}><Phone size={12} /></button>
        </div>
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <button onClick={() => setShowCoordinates(!showCoordinates)} className={`p-1.5 rounded-lg ${showCoordinates ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/15 transition-colors`}><Grid size={12} /></button>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors"><ZoomIn size={12} /></button>
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors"><ZoomOut size={12} /></button>
          <span className="text-[10px] px-2 py-1 rounded-lg bg-black/50 font-mono">{zoom}%</span>
        </div>
        <div 
          ref={previewRef}
          className={`w-full rounded-xl shadow-2xl transition-all duration-300 relative overflow-hidden`}
          style={{ 
            background: getGradientString(),
            transform: `scale(${zoom / 100})`,
            ...getAnimationStyle
          }}
        >
          {showCoordinates && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 w-px h-full bg-white/20 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 h-px w-full bg-white/20 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-white/50 -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        {/* Control Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"><Undo size={16} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"><Redo size={16} /></button>
            <button onClick={resetToDefault} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><RefreshCw size={16} /></button>
            <button onClick={randomize} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><Shuffle size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSavedPanel(!showSavedPanel)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><FolderOpen size={16} /></button>
            <button onClick={() => setShowSaveModal(true)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><Heart size={16} /></button>
            <button onClick={() => document.getElementById('fileInput')?.click()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><Upload size={16} /></button>
            <button onClick={exportAsImage} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><Image size={16} /></button>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`p-2 rounded-lg ${showAdvanced ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/10 transition-colors`}><Settings size={16} /></button>
          </div>
        </div>

        {/* Gradient Stops Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Palette size={12} /> Gradient Stops</h3>
            <button onClick={duplicateStop} className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1"><Copy size={10} /> Duplicate</button>
          </div>
          
          <div className="relative h-10 select-none cursor-pointer group" ref={trackRef} onClick={addStop}>
            <div className="absolute top-1/2 left-0 right-0 h-6 -mt-3 rounded-full border border-white/10 group-hover:border-white/20 transition-colors shadow-inner"
              style={{ background: getGradientString() }} />
            {stops.map(stop => (
              <div
                key={stop.id}
                className={`gradient-stop-handle absolute top-1/2 w-6 h-6 -ml-3 -mt-3 border-3 rounded-full cursor-grab active:cursor-grabbing shadow-lg transition-all z-10 ${selectedStopId === stop.id ? 'active border-white ring-2 ring-[#007acc]' : 'border-gray-400 hover:border-white'}`}
                style={{ left: `${stop.position}%`, backgroundColor: stop.color }}
                onClick={(e) => { e.stopPropagation(); setSelectedStopId(stop.id); playSound('click'); }}
                onDoubleClick={(e) => { e.stopPropagation(); deleteStop(stop.id); }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingStop(true);
                  const startX = e.clientX;
                  const startPos = stop.position;
                  const rect = trackRef.current!.getBoundingClientRect();
                  
                  const onMouseMove = (ev: MouseEvent) => {
                    const diff = ev.clientX - startX;
                    let newPos = startPos + (diff / rect.width) * 100;
                    newPos = Math.max(0, Math.min(100, newPos));
                    updateStop(stop.id, { position: newPos });
                  };
                  const onMouseUp = () => {
                    setIsDraggingStop(false);
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    saveToHistory();
                  };
                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 shadow-inner cursor-pointer"
                  style={{ backgroundColor: selectedStopData.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)} />
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-2 z-20 p-2 bg-[#1e1e2e] rounded-xl border border-white/20 shadow-2xl">
                    <input type="color" value={selectedStopData.color} onChange={(e) => updateStop(selectedStopId, { color: e.target.value })} className="w-32 h-32 cursor-pointer" />
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Color</span>
                <span className="text-xs font-mono block">{selectedStopData.color.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Opacity</span>
                <input type="range" min="0" max="1" step="0.01" value={selectedStopData.opacity} onChange={(e) => updateStop(selectedStopId, { opacity: parseFloat(e.target.value) })} className="w-24 accent-[#007acc]" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Position</span>
                <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
                  <input type="number" min="0" max="100" value={Math.round(selectedStopData.position)} onChange={(e) => updateStop(selectedStopId, { position: Number(e.target.value) })} className="w-12 bg-transparent text-white text-xs outline-none text-right" />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
              <button onClick={() => deleteStop(selectedStopId)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>

        {/* Gradient Type & Angle */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Layers size={12} /> Type & Angle</h3>
          <div className="grid grid-cols-3 gap-2">
            {['linear', 'radial', 'conic'].map(type => (
              <button key={type} onClick={() => setGradientType(type as any)} className={`py-2 text-[11px] uppercase rounded-lg transition-all ${gradientType === type ? 'bg-[#007acc] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {type}
              </button>
            ))}
          </div>
          
          {gradientType !== 'radial' && (
            <div>
              <label className="text-xs text-gray-400 block mb-2 flex justify-between">Angle <span>{angle}°</span></label>
              <div className="flex items-center gap-4">
                <input type="range" min="0" max="360" value={angle} onChange={(e) => { setAngle(Number(e.target.value)); saveToHistory(); }} className="flex-1 accent-[#007acc]" />
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center relative bg-white/5">
                  <div className="w-full h-0.5 bg-[#007acc] absolute transition-transform" style={{ transform: `rotate(${angle}deg)` }} />
                </div>
              </div>
            </div>
          )}
          
          {gradientType !== 'linear' && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">Center Position</label>
              <div className="flex gap-4">
                <input type="range" min="0" max="100" value={radialPosition.x} onChange={(e) => setRadialPosition({ ...radialPosition, x: Number(e.target.value) })} className="flex-1 accent-[#007acc]" />
                <input type="range" min="0" max="100" value={radialPosition.y} onChange={(e) => setRadialPosition({ ...radialPosition, y: Number(e.target.value) })} className="flex-1 accent-[#007acc]" />
              </div>
            </div>
          )}
        </div>

        {/* Animation Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Zap size={12} /> Animation</h3>
            {animationConfig.type !== 'none' && (
              <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1.5 rounded-lg ${isPlaying ? 'bg-[#007acc] text-white' : 'bg-white/10'}`}>
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['none', 'shift', 'pulse', 'rotate', 'wave', 'breath', 'glow', 'rainbow'].map(anim => (
              <button key={anim} onClick={() => { setAnimationConfig(prev => ({ ...prev, type: anim as any })); setIsPlaying(true); }} className={`py-1.5 text-[9px] uppercase rounded-lg transition-all ${animationConfig.type === anim ? 'bg-[#007acc] text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                {anim}
              </button>
            ))}
          </div>
          
          {animationConfig.type !== 'none' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 flex justify-between">Duration <span>{animationConfig.duration}s</span></label>
                <input type="range" min="0.5" max="20" step="0.5" value={animationConfig.duration} onChange={(e) => setAnimationConfig(prev => ({ ...prev, duration: Number(e.target.value) }))} className="w-full accent-[#007acc]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 flex justify-between">Delay <span>{animationConfig.delay}s</span></label>
                <input type="range" min="0" max="5" step="0.1" value={animationConfig.delay} onChange={(e) => setAnimationConfig(prev => ({ ...prev, delay: Number(e.target.value) }))} className="w-full accent-[#007acc]" />
              </div>
              <div className="flex gap-3">
                <select value={animationConfig.easing} onChange={(e) => setAnimationConfig(prev => ({ ...prev, easing: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
                  <option value="ease">ease</option>
                  <option value="linear">linear</option>
                  <option value="ease-in">ease-in</option>
                  <option value="ease-out">ease-out</option>
                  <option value="ease-in-out">ease-in-out</option>
                </select>
                <select value={animationConfig.direction} onChange={(e) => setAnimationConfig(prev => ({ ...prev, direction: e.target.value as any }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
                  <option value="normal">normal</option>
                  <option value="reverse">reverse</option>
                  <option value="alternate">alternate</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Presets Grid */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Star size={12} /> Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GRADIENT_PRESETS.map(preset => (
              <button key={preset.id} onClick={() => applyPreset(preset)} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/30 transition-all group">
                <div className="w-8 h-8 rounded-lg overflow-hidden" style={{ background: `linear-gradient(${preset.angle || 135}deg, ${preset.colors.map(c => c.color).join(', ')})` }} />
                <span className="text-[10px] font-medium truncate flex-1 text-left">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Code size={12} /> Export Code</h3>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              {(['css', 'tailwind', 'scss', 'svg'] as const).map(format => (
                <button key={format} onClick={() => setExportFormat(format)} className={`px-2 py-1 text-[9px] uppercase rounded-md transition-all ${exportFormat === format ? 'bg-[#007acc] text-white' : 'text-gray-500'}`}>
                  {format}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-black/30 p-4 rounded-xl border border-white/10 relative group">
            <textarea readOnly value={getExportCode()} className="w-full h-28 bg-transparent text-[10px] font-mono text-gray-400 outline-none resize-none custom-scrollbar" />
            <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-[#007acc] rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <Copy size={12} />
            </button>
          </div>
          
          <button onClick={copyToClipboard} className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98">
            <Copy size={14} /> Copy Code
          </button>
        </div>
      </div>

      {/* Saved Gradients Panel */}
      <AnimatePresence>
        {showSavedPanel && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed right-0 top-0 bottom-0 w-80 bg-[#1a1a2e] border-l border-white/10 shadow-2xl z-50 overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-sm">Saved Gradients</h3>
              <button onClick={() => setShowSavedPanel(false)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="p-3 space-y-2">
              {savedGradients.length === 0 && <p className="text-center text-gray-500 text-xs py-10">No saved gradients yet. Click the heart icon to save.</p>}
              {savedGradients.map(saved => (
                <div key={saved.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex-1" style={{ background: `linear-gradient(${saved.angle}deg, ${saved.stops.map(s => `${s.color} ${s.position}%`).join(', ')})` }} />
                    <span className="text-xs font-medium flex-1">{saved.name}</span>
                    <button onClick={() => loadSavedGradient(saved)} className="p-1 rounded hover:bg-white/10"><Check size={12} /></button>
                    <button onClick={() => deleteSavedGradient(saved.id)} className="p-1 rounded hover:bg-red-500/20"><Trash2 size={12} /></button>
                  </div>
                  <div className="text-[9px] text-gray-500">{new Date(saved.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSaveModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#1e1e2e] rounded-2xl p-5 w-80 border border-white/20" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold mb-3">Save Gradient</h3>
              <input type="text" value={gradientName} onChange={(e) => setGradientName(e.target.value)} placeholder="Gradient name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-[#007acc]" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">Cancel</button>
                <button onClick={saveCurrentGradient} className="flex-1 py-2 rounded-lg bg-[#007acc] hover:bg-[#005f9e] transition-colors">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GradientGenerator;
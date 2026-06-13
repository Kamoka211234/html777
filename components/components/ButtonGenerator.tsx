import React, { useState } from 'react';
import { Copy, Layers, Smartphone, Type, Palette, Maximize2, Square, Box, Sparkles, Move, RotateCw, Eye, Zap, Grid, AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, Volume2, Moon, Sun, Download, RefreshCw } from 'lucide-react';
import { playSound } from '../utils/sound';

const ButtonGenerator = () => {
    // ========== STATE MANAGEMENT ==========
    
    // Content & Typography
    const [text, setText] = useState('Click Me');
    const [fontFamily, setFontFamily] = useState('system-ui');
    const [fontSize, setFontSize] = useState(16);
    const [fontWeight, setFontWeight] = useState(600);
    const [letterSpacing, setLetterSpacing] = useState(0);
    const [lineHeight, setLineHeight] = useState(1.5);
    const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');
    const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
    const [textDecoration, setTextDecoration] = useState<'none' | 'underline' | 'line-through'>('none');
    
    // Colors
    const [bgColor, setBgColor] = useState('#007acc');
    const [bgGradientStart, setBgGradientStart] = useState('#007acc');
    const [bgGradientEnd, setBgGradientEnd] = useState('#00acc');
    const [gradientAngle, setGradientAngle] = useState(135);
    const [gradientType, setGradientType] = useState<'solid' | 'linear' | 'radial'>('solid');
    const [textColor, setTextColor] = useState('#ffffff');
    
    // Dimensions
    const [paddingX, setPaddingX] = useState(24);
    const [paddingY, setPaddingY] = useState(12);
    const [borderRadius, setBorderRadius] = useState(8);
    const [borderRadiusTL, setBorderRadiusTL] = useState(8);
    const [borderRadiusTR, setBorderRadiusTR] = useState(8);
    const [borderRadiusBL, setBorderRadiusBL] = useState(8);
    const [borderRadiusBR, setBorderRadiusBR] = useState(8);
    const [useIndividualRadius, setUseIndividualRadius] = useState(false);
    const [width, setWidth] = useState<'auto' | 'full' | 'custom'>('auto');
    const [customWidth, setCustomWidth] = useState(200);
    const [height, setHeight] = useState<'auto' | 'custom'>('auto');
    const [customHeight, setCustomHeight] = useState(50);
    
    // Border
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState('#ffffff');
    const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'double'>('solid');
    
    // Shadows
    const [shadow, setShadow] = useState(0);
    const [shadowColor, setShadowColor] = useState('#000000');
    const [shadowOpacity, setShadowOpacity] = useState(0.3);
    const [shadowBlur, setShadowBlur] = useState(0);
    const [shadowSpread, setShadowSpread] = useState(0);
    const [shadowX, setShadowX] = useState(0);
    const [shadowY, setShadowY] = useState(0);
    const [innerShadow, setInnerShadow] = useState(false);
    
    // Glassmorphism
    const [isGlass, setIsGlass] = useState(false);
    const [glassOpacity, setGlassOpacity] = useState(0.2);
    const [glassBlur, setGlassBlur] = useState(10);
    
    // Hover Effects
    const [hoverScale, setHoverScale] = useState(1.05);
    const [hoverBgColor, setHoverBgColor] = useState('');
    const [hoverTextColor, setHoverTextColor] = useState('');
    const [hoverShadowIntensity, setHoverShadowIntensity] = useState(5);
    const [hoverTransitionDuration, setHoverTransitionDuration] = useState(0.3);
    
    // Animation
    const [hasRipple, setHasRipple] = useState(false);
    const [hasPulse, setHasPulse] = useState(false);
    const [pulseSpeed, setPulseSpeed] = useState(1.5);
    const [hasGlow, setHasGlow] = useState(false);
    const [glowColor, setGlowColor] = useState('#007acc');
    
    // Layout
    const [icon, setIcon] = useState<'none' | 'left' | 'right' | 'both'>('none');
    const [iconLeft, setIconLeft] = useState('⭐');
    const [iconRight, setIconRight] = useState('→');
    const [iconSize, setIconSize] = useState(18);
    const [gap, setGap] = useState(8);
    
    // Responsive
    const [isResponsive, setIsResponsive] = useState(true);
    const [fullWidthOnMobile, setFullWidthOnMobile] = useState(true);
    
    // Loading state
    const [isLoading, setIsLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    
    // Export format
    const [exportFormat, setExportFormat] = useState<'css' | 'tailwind'>('css');
    
    // Theme
    const [darkMode, setDarkMode] = useState(true);
    
    // Sound
    const [soundEnabled, setSoundEnabled] = useState(true);
    
    // ========== HELPER FUNCTIONS ==========
    
    const getBackgroundCSS = () => {
        if (isGlass) {
            const r = parseInt(bgColor.slice(1, 3), 16);
            const g = parseInt(bgColor.slice(3, 5), 16);
            const b = parseInt(bgColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${glassOpacity})`;
        }
        
        if (gradientType === 'linear') {
            return `linear-gradient(${gradientAngle}deg, ${bgGradientStart}, ${bgGradientEnd})`;
        }
        if (gradientType === 'radial') {
            return `radial-gradient(circle, ${bgGradientStart}, ${bgGradientEnd})`;
        }
        return bgColor;
    };
    
    const getHoverBackgroundCSS = () => {
        if (hoverBgColor) return hoverBgColor;
        if (gradientType !== 'solid') {
            if (gradientType === 'linear') {
                return `linear-gradient(${gradientAngle}deg, ${bgGradientEnd}, ${bgGradientStart})`;
            }
            if (gradientType === 'radial') {
                return `radial-gradient(circle, ${bgGradientEnd}, ${bgGradientStart})`;
            }
        }
        return '';
    };
    
    const getBorderRadiusCSS = () => {
        if (useIndividualRadius) {
            return `${borderRadiusTL}px ${borderRadiusTR}px ${borderRadiusBR}px ${borderRadiusBL}px`;
        }
        return `${borderRadius}px`;
    };
    
    const getShadowCSS = () => {
        if (shadow === 0 && shadowBlur === 0) return 'none';
        const inset = innerShadow ? 'inset ' : '';
        const color = shadowColor;
        const opacity = shadowOpacity;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `${inset}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${opacity})`;
    };
    
    const getWidthCSS = () => {
        if (width === 'full') return '100%';
        if (width === 'custom') return `${customWidth}px`;
        return 'auto';
    };
    
    const getHeightCSS = () => {
        if (height === 'custom') return `${customHeight}px`;
        return 'auto';
    };
    
    const getAnimationCSS = () => {
        let animation = '';
        if (hasPulse) {
            animation += `pulse ${pulseSpeed}s ease-in-out infinite; `;
        }
        if (hasGlow) {
            animation += `glow ${pulseSpeed}s ease-in-out infinite; `;
        }
        return animation;
    };
    
    const getKeyframesCSS = () => {
        let keyframes = '';
        if (hasPulse) {
            keyframes += `
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}`;
        }
        if (hasGlow) {
            const glowColorRgb = glowColor.slice(1);
            keyframes += `
@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px #${glowColorRgb}, 0 0 10px #${glowColorRgb}; }
  50% { box-shadow: 0 0 20px #${glowColorRgb}, 0 0 30px #${glowColorRgb}; }
}`;
        }
        return keyframes;
    };
    
    const getButtonContent = () => {
        const iconElement = (iconChar: string, position: 'left' | 'right') => (
            <span style={{ fontSize: `${iconSize}px` }}>{iconChar}</span>
        );
        
        if (icon === 'left') {
            return (
                <>
                    {iconElement(iconLeft, 'left')}
                    <span>{text}</span>
                </>
            );
        }
        if (icon === 'right') {
            return (
                <>
                    <span>{text}</span>
                    {iconElement(iconRight, 'right')}
                </>
            );
        }
        if (icon === 'both') {
            return (
                <>
                    {iconElement(iconLeft, 'left')}
                    <span>{text}</span>
                    {iconElement(iconRight, 'right')}
                </>
            );
        }
        return text;
    };
    
    const getCSS = () => {
        const responsiveStyles = isResponsive ? `
    font-size: clamp(12px, ${fontSize / 16}vw, ${fontSize}px);
    padding: clamp(${paddingY * 0.75}px, 2vh, ${paddingY}px) clamp(${paddingX * 0.75}px, 4vw, ${paddingX}px);
    ` : `
    font-size: ${fontSize}px;
    padding: ${paddingY}px ${paddingX}px;
    `;
        
        const hoverStyles = [];
        if (hoverBgColor) hoverStyles.push(`background: ${getHoverBackgroundCSS()};`);
        if (hoverTextColor) hoverStyles.push(`color: ${hoverTextColor};`);
        if (hoverScale !== 1) hoverStyles.push(`transform: scale(${hoverScale});`);
        hoverStyles.push(`box-shadow: 0 ${shadowY + hoverShadowIntensity}px ${shadowBlur + hoverShadowIntensity * 2}px ${shadowSpread}px rgba(0,0,0,${shadowOpacity + 0.1});`);
        
        return `${getKeyframesCSS()}

.custom-btn {
  background: ${getBackgroundCSS()};
  color: ${textColor};
  ${responsiveStyles}
  border-radius: ${getBorderRadiusCSS()};
  border: ${borderWidth > 0 ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none'};
  box-shadow: ${getShadowCSS()};
  font-family: ${fontFamily}, system-ui, sans-serif;
  font-weight: ${fontWeight};
  letter-spacing: ${letterSpacing}px;
  line-height: ${lineHeight};
  text-transform: ${textTransform};
  font-style: ${fontStyle};
  text-decoration: ${textDecoration};
  cursor: ${disabled ? 'not-allowed' : 'pointer'};
  transition: all ${hoverTransitionDuration}s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${gap}px;
  text-align: center;
  width: ${getWidthCSS()};
  height: ${getHeightCSS()};
  ${isGlass ? `backdrop-filter: blur(${glassBlur}px);
  -webkit-backdrop-filter: blur(${glassBlur}px);` : ''}
  ${getAnimationCSS()}
  ${disabled ? 'opacity: 0.6;' : ''}
  ${hasRipple ? 'position: relative; overflow: hidden;' : ''}
}

${hasRipple ? `
.custom-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.custom-btn:active::after {
  width: 300px;
  height: 300px;
}
` : ''}

.custom-btn:hover {
  ${hoverStyles.join('\n  ')}
}

.custom-btn:active {
  transform: scale(${hoverScale * 0.98});
}

/* Loading state */
.custom-btn.loading {
  pointer-events: none;
  position: relative;
}

.custom-btn.loading::before {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .custom-btn {
    min-height: 44px;
    ${fullWidthOnMobile && isResponsive ? 'width: 100%;' : ''}
  }
}`;
    };
    
    const getTailwindCSS = () => {
        return `<button class="
  px-${Math.round(paddingX / 4)} py-${Math.round(paddingY / 4)}
  rounded-[${getBorderRadiusCSS()}]
  bg-[${getBackgroundCSS()}]
  text-[${textColor}]
  text-[${fontSize}px]
  font-${fontWeight === 600 ? 'semibold' : fontWeight === 700 ? 'bold' : 'normal'}
  hover:scale-${Math.round(hoverScale * 100)}
  transition-all duration-${hoverTransitionDuration * 1000}
  ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
  flex items-center justify-center gap-${Math.round(gap / 4)}
  ${width === 'full' ? 'w-full' : width === 'custom' ? `w-[${customWidth}px]` : 'w-auto'}
  ${height === 'custom' ? `h-[${customHeight}px]` : 'h-auto'}
  ${isGlass ? `backdrop-blur-[${glassBlur}px] bg-opacity-${Math.round(glassOpacity * 100)}` : ''}
  ${borderWidth > 0 ? `border-${borderWidth} border-[${borderColor}] border-${borderStyle}` : ''}
  shadow-[${getShadowCSS()}]
  hover:shadow-[${shadowY + hoverShadowIntensity}px_${shadowY + hoverShadowIntensity}px_${shadowBlur + hoverShadowIntensity * 2}px_rgba(0,0,0,${shadowOpacity + 0.1})]
">${getButtonContent()}</button>`;
    };
    
    const getHTML = () => {
        const buttonClass = `custom-btn${isLoading ? ' loading' : ''}`;
        return `<button class="${buttonClass}" ${disabled ? 'disabled' : ''}>
  ${getButtonContent()}
</button>`;
    };
    
    const handleCopy = () => {
        const code = exportFormat === 'css' ? getCSS() + '\n\n' + getHTML() : getTailwindCSS();
        navigator.clipboard.writeText(code);
        if (soundEnabled) playSound('success');
    };
    
    // ========== RENDER ==========
    
    return (
        <div className={`flex flex-col h-full overflow-hidden ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-gray-50 text-gray-900'}`}>
            {/* Preview Section */}
            <div className="h-56 flex flex-col relative p-8 items-center justify-center bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center shrink-0">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                
                <div className="relative z-10 p-10 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center min-w-[200px]">
                    <button
                        className={isLoading ? 'loading' : ''}
                        style={{
                            background: getBackgroundCSS(),
                            color: textColor,
                            padding: `${paddingY}px ${paddingX}px`,
                            borderRadius: getBorderRadiusCSS(),
                            border: borderWidth > 0 ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
                            boxShadow: getShadowCSS(),
                            fontFamily: `${fontFamily}, system-ui`,
                            fontSize: `${fontSize}px`,
                            fontWeight: fontWeight,
                            letterSpacing: `${letterSpacing}px`,
                            lineHeight: lineHeight,
                            textTransform: textTransform,
                            fontStyle: fontStyle,
                            textDecoration: textDecoration,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: `all ${hoverTransitionDuration}s ease`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: `${gap}px`,
                            width: getWidthCSS(),
                            height: getHeightCSS(),
                            backdropFilter: isGlass ? `blur(${glassBlur}px)` : 'none',
                            WebkitBackdropFilter: isGlass ? `blur(${glassBlur}px)` : 'none',
                            transform: 'scale(1)',
                            opacity: disabled ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled) {
                                if (hoverScale !== 1) e.currentTarget.style.transform = `scale(${hoverScale})`;
                                if (hoverBgColor) e.currentTarget.style.background = getHoverBackgroundCSS();
                                if (hoverTextColor) e.currentTarget.style.color = hoverTextColor;
                                e.currentTarget.style.boxShadow = `0 ${shadowY + hoverShadowIntensity}px ${shadowBlur + hoverShadowIntensity * 2}px ${shadowSpread}px rgba(0,0,0,${shadowOpacity + 0.1})`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = getBackgroundCSS();
                            e.currentTarget.style.color = textColor;
                            e.currentTarget.style.boxShadow = getShadowCSS();
                        }}
                        onClick={() => {
                            if (!disabled && soundEnabled) playSound('click');
                            if (hasRipple) {
                                // Ripple effect handled by CSS
                            }
                        }}
                        disabled={disabled}
                    >
                        {getButtonContent()}
                    </button>
                </div>
                <div className="absolute bottom-2 text-white/50 text-[10px]">Live Preview</div>
            </div>
            
            {/* Controls - Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Quick Actions Bar */}
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setDisabled(!disabled); if(soundEnabled) playSound('click'); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${disabled ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[#333] text-gray-300'}`}>
                        {disabled ? '🔴 Disabled' : '🟢 Enabled'}
                    </button>
                    <button onClick={() => { setIsLoading(!isLoading); if(soundEnabled) playSound('click'); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isLoading ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-[#333] text-gray-300'}`}>
                        {isLoading ? '⏳ Loading' : '⚡ Loading State'}
                    </button>
                    <button onClick={() => setDarkMode(!darkMode)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#333] text-gray-300">
                        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#333] text-gray-300">
                        <Volume2 size={14} className={soundEnabled ? 'text-green-400' : 'text-red-400'} />
                    </button>
                </div>
                
                {/* Typography Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Type size={14} /> Typography</h3>
                    <div className="space-y-3">
                        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Button Text" className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#007acc]" />
                        <div className="grid grid-cols-2 gap-3">
                            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white">
                                <option value="system-ui">System UI</option>
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Montserrat">Montserrat</option>
                            </select>
                            <select value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value))} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white">
                                <option value={400}>Normal (400)</option>
                                <option value={500}>Medium (500)</option>
                                <option value={600}>Semibold (600)</option>
                                <option value={700}>Bold (700)</option>
                                <option value={800}>Extrabold (800)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500">Font Size: {fontSize}px</label>
                                <input type="range" min="10" max="48" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-[#007acc]" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Letter Spacing: {letterSpacing}px</label>
                                <input type="range" min="-2" max="10" value={letterSpacing} onChange={(e) => setLetterSpacing(Number(e.target.value))} className="w-full accent-[#007acc]" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setFontStyle(fontStyle === 'normal' ? 'italic' : 'normal')} className={`px-3 py-1.5 rounded text-xs ${fontStyle === 'italic' ? 'bg-[#007acc]' : 'bg-[#333]'}`}><Italic size={14} /></button>
                            <button onClick={() => setTextDecoration(textDecoration === 'none' ? 'underline' : 'none')} className={`px-3 py-1.5 rounded text-xs ${textDecoration === 'underline' ? 'bg-[#007acc]' : 'bg-[#333]'}`}><Underline size={14} /></button>
                            <select value={textTransform} onChange={(e) => setTextTransform(e.target.value as any)} className="bg-[#111] border border-[#333] rounded-lg px-2 py-1 text-xs">
                                <option value="none">Normal</option>
                                <option value="uppercase">UPPER</option>
                                <option value="lowercase">lower</option>
                                <option value="capitalize">Capitalize</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                {/* Colors & Background */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Palette size={14} /> Colors & Background</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Text Color</label>
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Hover Text</label>
                            <input type="color" value={hoverTextColor || '#ffffff'} onChange={(e) => setHoverTextColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                        </div>
                    </div>
                    <select value={gradientType} onChange={(e) => setGradientType(e.target.value as any)} className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white">
                        <option value="solid">Solid Color</option>
                        <option value="linear">Linear Gradient</option>
                        <option value="radial">Radial Gradient</option>
                    </select>
                    {gradientType === 'solid' ? (
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="color" value={bgGradientStart} onChange={(e) => setBgGradientStart(e.target.value)} className="h-10 rounded-lg cursor-pointer" />
                                <input type="color" value={bgGradientEnd} onChange={(e) => setBgGradientEnd(e.target.value)} className="h-10 rounded-lg cursor-pointer" />
                            </div>
                            {gradientType === 'linear' && (
                                <div>
                                    <label className="text-[10px] text-gray-500">Angle: {gradientAngle}°</label>
                                    <input type="range" min="0" max="360" value={gradientAngle} onChange={(e) => setGradientAngle(Number(e.target.value))} className="w-full accent-[#007acc]" />
                                </div>
                            )}
                        </>
                    )}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Hover Background</label>
                        <input type="color" value={hoverBgColor || bgColor} onChange={(e) => setHoverBgColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
                    </div>
                </div>
                
                {/* Dimensions & Spacing */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Maximize2 size={14} /> Dimensions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500">Padding X: {paddingX}px</label>
                            <input type="range" min="0" max="80" value={paddingX} onChange={(e) => setPaddingX(Number(e.target.value))} className="w-full accent-[#007acc]" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500">Padding Y: {paddingY}px</label>
                            <input type="range" min="0" max="60" value={paddingY} onChange={(e) => setPaddingY(Number(e.target.value))} className="w-full accent-[#007acc]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Width</label>
                            <select value={width} onChange={(e) => setWidth(e.target.value as any)} className="w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1 text-xs">
                                <option value="auto">Auto</option>
                                <option value="full">100%</option>
                                <option value="custom">Custom</option>
                            </select>
                            {width === 'custom' && <input type="number" value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))} className="mt-2 w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1 text-xs" />}
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Height</label>
                            <select value={height} onChange={(e) => setHeight(e.target.value as any)} className="w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1 text-xs">
                                <option value="auto">Auto</option>
                                <option value="custom">Custom</option>
                            </select>
                            {height === 'custom' && <input type="number" value={customHeight} onChange={(e) => setCustomHeight(Number(e.target.value))} className="mt-2 w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1 text-xs" />}
                        </div>
                    </div>
                </div>
                
                {/* Border Radius */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Square size={14} /> Border Radius</h3>
                        <button onClick={() => setUseIndividualRadius(!useIndividualRadius)} className="text-xs text-[#007acc]">{useIndividualRadius ? 'Use Uniform' : 'Individual Corners'}</button>
                    </div>
                    {useIndividualRadius ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[9px]">TL: {borderRadiusTL}px</label><input type="range" min="0" max="100" value={borderRadiusTL} onChange={(e) => setBorderRadiusTL(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                            <div><label className="text-[9px]">TR: {borderRadiusTR}px</label><input type="range" min="0" max="100" value={borderRadiusTR} onChange={(e) => setBorderRadiusTR(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                            <div><label className="text-[9px]">BL: {borderRadiusBL}px</label><input type="range" min="0" max="100" value={borderRadiusBL} onChange={(e) => setBorderRadiusBL(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                            <div><label className="text-[9px]">BR: {borderRadiusBR}px</label><input type="range" min="0" max="100" value={borderRadiusBR} onChange={(e) => setBorderRadiusBR(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        </div>
                    ) : (
                        <div><label className="text-[10px] text-gray-500">Radius: {borderRadius}px</label><input type="range" min="0" max="100" value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                    )}
                </div>
                
                {/* Border */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Border</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="Width" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="bg-[#111] border border-[#333] rounded px-2 py-1 text-xs" />
                        <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="h-8 rounded cursor-pointer" />
                        <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value as any)} className="bg-[#111] border border-[#333] rounded px-1 py-1 text-xs">
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                        </select>
                    </div>
                </div>
                
                {/* Shadows */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Box size={14} /> Shadows</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[9px]">X: {shadowX}px</label><input type="range" min="-30" max="30" value={shadowX} onChange={(e) => setShadowX(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        <div><label className="text-[9px]">Y: {shadowY}px</label><input type="range" min="-30" max="30" value={shadowY} onChange={(e) => setShadowY(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        <div><label className="text-[9px]">Blur: {shadowBlur}px</label><input type="range" min="0" max="50" value={shadowBlur} onChange={(e) => setShadowBlur(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        <div><label className="text-[9px]">Spread: {shadowSpread}px</label><input type="range" min="0" max="20" value={shadowSpread} onChange={(e) => setShadowSpread(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} className="h-8 w-12 rounded cursor-pointer" />
                        <div className="flex-1"><label className="text-[9px]">Opacity: {Math.round(shadowOpacity * 100)}%</label><input type="range" min="0" max="1" step="0.01" value={shadowOpacity} onChange={(e) => setShadowOpacity(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        <button onClick={() => setInnerShadow(!innerShadow)} className={`px-2 py-1 rounded text-xs ${innerShadow ? 'bg-[#007acc]' : 'bg-[#333]'}`}>Inner</button>
                    </div>
                </div>
                
                {/* Icons */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Grid size={14} /> Icons</h3>
                    <select value={icon} onChange={(e) => setIcon(e.target.value as any)} className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm">
                        <option value="none">No Icons</option>
                        <option value="left">Left Icon</option>
                        <option value="right">Right Icon</option>
                        <option value="both">Both Icons</option>
                    </select>
                    {icon !== 'none' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                {(icon === 'left' || icon === 'both') && <input type="text" value={iconLeft} onChange={(e) => setIconLeft(e.target.value)} placeholder="Left Icon" className="bg-[#111] border border-[#333] rounded px-2 py-1 text-sm" />}
                                {(icon === 'right' || icon === 'both') && <input type="text" value={iconRight} onChange={(e) => setIconRight(e.target.value)} placeholder="Right Icon" className="bg-[#111] border border-[#333] rounded px-2 py-1 text-sm" />}
                            </div>
                            <div><label className="text-[9px]">Icon Size: {iconSize}px</label><input type="range" min="12" max="32" value={iconSize} onChange={(e) => setIconSize(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                            <div><label className="text-[9px]">Gap: {gap}px</label><input type="range" min="0" max="24" value={gap} onChange={(e) => setGap(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        </>
                    )}
                </div>
                
                {/* Hover & Animation */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Sparkles size={14} /> Effects</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[9px]">Hover Scale: {hoverScale}x</label><input type="range" min="1" max="1.3" step="0.01" value={hoverScale} onChange={(e) => setHoverScale(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        <div><label className="text-[9px]">Transition: {hoverTransitionDuration}s</label><input type="range" min="0.1" max="0.8" step="0.01" value={hoverTransitionDuration} onChange={(e) => setHoverTransitionDuration(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setHasRipple(!hasRipple)} className={`px-3 py-1.5 rounded text-xs ${hasRipple ? 'bg-[#007acc]' : 'bg-[#333]'}`}>💧 Ripple</button>
                        <button onClick={() => setHasPulse(!hasPulse)} className={`px-3 py-1.5 rounded text-xs ${hasPulse ? 'bg-[#007acc]' : 'bg-[#333]'}`}>🔄 Pulse</button>
                        <button onClick={() => setHasGlow(!hasGlow)} className={`px-3 py-1.5 rounded text-xs ${hasGlow ? 'bg-[#007acc]' : 'bg-[#333]'}`}>✨ Glow</button>
                    </div>
                    {hasGlow && <input type="color" value={glowColor} onChange={(e) => setGlowColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />}
                    {(hasPulse || hasGlow) && <div><label className="text-[9px]">Speed: {pulseSpeed}s</label><input type="range" min="0.5" max="3" step="0.1" value={pulseSpeed} onChange={(e) => setPulseSpeed(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>}
                </div>
                
                {/* Glassmorphism */}
                <div className="bg-[#111] p-4 rounded-xl border border-[#333] space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Layers size={14} /> Glassmorphism</h3>
                        <button onClick={() => setIsGlass(!isGlass)} className={`w-10 h-5 rounded-full transition-colors relative ${isGlass ? 'bg-[#007acc]' : 'bg-[#333]'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isGlass ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                    {isGlass && (
                        <div className="space-y-4">
                            <div><label className="text-xs text-gray-400">Opacity: {Math.round(glassOpacity * 100)}%</label><input type="range" min="0" max="1" step="0.01" value={glassOpacity} onChange={(e) => setGlassOpacity(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                            <div><label className="text-xs text-gray-400">Blur: {glassBlur}px</label><input type="range" min="0" max="30" value={glassBlur} onChange={(e) => setGlassBlur(Number(e.target.value))} className="w-full accent-[#007acc]" /></div>
                        </div>
                    )}
                </div>
                
                {/* Responsive */}
                <div className="bg-[#111] p-4 rounded-xl border border-[#333] space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Smartphone size={14} /> Responsive Design</h3>
                        <button onClick={() => setIsResponsive(!isResponsive)} className={`w-10 h-5 rounded-full transition-colors relative ${isResponsive ? 'bg-[#007acc]' : 'bg-[#333]'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isResponsive ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                    {isResponsive && (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Full width on mobile</span>
                                <button onClick={() => setFullWidthOnMobile(!fullWidthOnMobile)} className={`w-10 h-5 rounded-full transition-colors relative ${fullWidthOnMobile ? 'bg-[#007acc]' : 'bg-[#333]'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${fullWidthOnMobile ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 italic">Uses clamp() for fluid typography and spacing</p>
                        </>
                    )}
                </div>
                
                {/* Export Options */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Export Code</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setExportFormat('css')} className={`px-2 py-1 rounded text-xs ${exportFormat === 'css' ? 'bg-[#007acc]' : 'bg-[#333]'}`}>CSS</button>
                            <button onClick={() => setExportFormat('tailwind')} className={`px-2 py-1 rounded text-xs ${exportFormat === 'tailwind' ? 'bg-[#007acc]' : 'bg-[#333]'}`}>Tailwind</button>
                        </div>
                    </div>
                    <div className="bg-[#111] p-4 rounded-xl border border-[#333] relative group">
                        <textarea readOnly value={exportFormat === 'css' ? getCSS() + '\n\n' + getHTML() : getTailwindCSS()} className="w-full h-48 bg-transparent text-[11px] font-mono text-gray-400 outline-none resize-none custom-scrollbar" />
                        <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-[#333] hover:bg-[#007acc] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                            <Copy size={14} />
                        </button>
                    </div>
                    <button onClick={handleCopy} className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <Copy size={16} /> Copy Code
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ButtonGenerator;

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { playSound } from '../utils/sound';
import { createRipple } from '../utils/ripple';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  icon?: React.ElementType;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  icon: Icon,
  loading,
  className = '',
  onClick,
  onMouseDown,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 select-none outline-none focus:ring-2 focus:ring-[var(--accent)]/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[var(--accent)] text-white hover:brightness-110 shadow-lg shadow-[var(--accent)]/20",
    secondary: "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)]",
    ghost: "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]",
    outline: "border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white",
    danger: "bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white shadow-lg shadow-red-600/10",
    success: "bg-green-600/10 text-green-500 border border-green-500/20 hover:bg-green-600 hover:text-white shadow-lg shadow-green-600/10",
  };

  const sizes: Record<ButtonSize, string> = {
    xs: "px-2 py-0.5 text-[10px] min-h-[24px]",
    sm: "px-3 py-1.5 text-xs min-h-[32px] sm:min-h-[36px]",
    md: "px-4 py-2 text-sm min-h-[40px] sm:min-h-[44px]", // 44px on tablet/desktop for touch
    lg: "px-6 py-3 text-base min-h-[48px]",
    icon: "p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    createRipple(e);
    playSound('click');
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={size === 'lg' ? 20 : size === 'xs' ? 12 : 16} className={children ? 'opacity-80' : ''} />}
          {children && <span className="truncate">{children}</span>}
        </>
      )}
    </motion.button>
  );
};

export default Button;

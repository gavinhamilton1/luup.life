import React from 'react';

const SIZES = {
  sm: { h: 36, px: 14, fs: 14, radius: 18, gap: 6 },
  md: { h: 48, px: 20, fs: 16, radius: 24, gap: 8 },
  lg: { h: 56, px: 22, fs: 17, radius: 28, gap: 10 },
};

const VARIANTS = {
  primary: {
    background: 'var(--ink)',
    color: 'var(--bg)',
    border: '1.5px solid transparent',
  },
  accent: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1.5px solid transparent',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid var(--line)',
  },
  soft: {
    background: 'var(--bg-elev)',
    color: 'var(--ink)',
    border: '1.5px solid var(--line)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--danger)',
    border: '1.5px solid var(--line)',
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  disabled,
  onClick,
  type = 'button',
  style,
  fullWidth,
  ...rest
}) {
  const sz = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sz.h,
        padding: `0 ${sz.px}px`,
        borderRadius: sz.radius,
        background: v.background,
        color: v.color,
        border: v.border,
        fontFamily: 'inherit',
        fontWeight: 700,
        fontSize: sz.fs,
        letterSpacing: '-0.1px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'transform 120ms ease, background 160ms ease',
        ...style,
      }}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}

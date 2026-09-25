import React, { ButtonHTMLAttributes, ReactNode, useId } from 'react';

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* Pure CSS, no extra dependency. Wrap any element; shows a small      */
/* ink-colored label above it on hover/focus.                          */
/* ------------------------------------------------------------------ */

export const Tooltip: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => {
  const id = useId();
  return (
    <span className="relative inline-flex group/tooltip">
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, { 'aria-describedby': id })
        : children}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full
          whitespace-nowrap rounded-md bg-[var(--ink-950)] border border-[var(--ink-700)]
          px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]
          opacity-0 scale-95 transition-all duration-150 ease-[var(--ease-premium)]
          group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
          group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 z-50"
      >
        {label}
      </span>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Button                                                               */
/* ------------------------------------------------------------------ */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 ease-[var(--ease-premium)] ' +
  'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] rounded-[var(--radius-md)]';

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--thread)] text-[var(--thread-ink)] shadow-[var(--shadow-thread)] hover:bg-[var(--thread-strong)]',
  secondary:
    'bg-[var(--ink-800)] text-[var(--text-primary)] border border-[var(--ink-700)] hover:border-[var(--thread)]/40 hover:bg-[var(--ink-850)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--ink-800)]'
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}) => (
  <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`} {...rest}>
    {icon}
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* IconButton — square, tooltip built in, consistent sizing            */
/* ------------------------------------------------------------------ */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // used for both the tooltip and aria-label
  active?: boolean;
  size?: 'sm' | 'md';
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  active = false,
  size = 'md',
  className = '',
  children,
  ...rest
}) => {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  return (
    <Tooltip label={label}>
      <button
        aria-label={label}
        aria-pressed={active}
        className={`${dim} inline-flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-150 ease-[var(--ease-premium)]
          ${
            active
              ? 'bg-[var(--thread-soft)] text-[var(--thread)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--ink-800)]'
          } disabled:opacity-40 disabled:pointer-events-none ${className}`}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
};

/* ------------------------------------------------------------------ */
/* Card                                                                 */
/* ------------------------------------------------------------------ */

export const Card: React.FC<{
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  as?: 'div' | 'button';
  onClick?: () => void;
}> = ({ children, className = '', hoverable = false, as = 'div', onClick }) => {
  const cls = `bg-[var(--ink-850)] border border-[var(--ink-700)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]
    ${hoverable ? 'transition-all duration-200 ease-[var(--ease-premium)] hover:border-[var(--thread)]/35 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5' : ''}
    ${className}`;
  if (as === 'button') {
    return (
      <button onClick={onClick} className={`${cls} text-left w-full`}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
};

/* ------------------------------------------------------------------ */
/* Skeleton — loading placeholder, shimmer defined in theme.css        */
/* ------------------------------------------------------------------ */

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/* ------------------------------------------------------------------ */
/* PromptChip — suggested-prompt pill for empty states                 */
/* ------------------------------------------------------------------ */

export const PromptChip: React.FC<{ children: ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--ink-800)] border border-[var(--ink-700)]
      text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--thread)]/40
      transition-all duration-150 ease-[var(--ease-premium)]"
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* TypingIndicator — three thread-colored dots                         */
/* ------------------------------------------------------------------ */

export const TypingIndicator: React.FC<{ label?: string }> = ({ label = 'Thinking' }) => (
  <div className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--thread)] inline-block"
          style={{ animation: 'dot-pulse 1.1s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
    {label}
  </div>
);

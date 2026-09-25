import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
  icon?: ReactNode;
};

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-strong shadow-thread",
  secondary:
    "border border-border bg-card text-foreground hover:border-primary/45 hover:bg-elevated",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-elevated hover:text-foreground",
  danger:
    "border border-danger/30 bg-danger-soft text-danger hover:border-danger/60",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  icon: "size-9 p-0",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
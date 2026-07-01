"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "rounded-lg px-6 py-3 text-base font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: {
      backgroundColor: "var(--accent)",
      color: "#ffffff",
    },
    secondary: {
      backgroundColor: "var(--bg-accent)",
      color: "var(--text-primary)",
      border: "1px solid var(--border)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <button
      className={`${base} ${fullWidth ? "w-full" : ""} ${className} hover:opacity-90 active:scale-[0.98]`}
      style={variants[variant]}
      {...props}
    >
      {children}
    </button>
  );
}

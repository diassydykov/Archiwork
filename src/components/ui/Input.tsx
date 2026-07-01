"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full rounded-lg px-4 py-3 text-base transition-colors outline-none focus:ring-2"
        style={{
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: `1px solid ${error ? "#dc2626" : "var(--border)"}`,
          boxShadow: error ? "0 0 0 2px rgba(220,38,38,0.2)" : undefined,
        }}
        {...props}
      />
      {error && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

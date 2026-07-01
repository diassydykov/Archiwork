"use client";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, id, ...props }: TextareaProps) {
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
      <textarea
        id={inputId}
        rows={4}
        className="w-full resize-y rounded-lg px-4 py-3 text-base transition-colors outline-none focus:ring-2"
        style={{
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: `1px solid ${error ? "#dc2626" : "var(--border)"}`,
          minHeight: "100px",
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

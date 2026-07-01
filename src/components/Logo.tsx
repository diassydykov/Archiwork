"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 48, showText = false }: LogoProps) {
  const [src, setSrc] = useState("/logo.png");

  return (
    <div className="flex items-center gap-3">
      <Image
        src={src}
        alt="Archiwork"
        width={size}
        height={size}
        className="object-contain"
        priority
        onError={() => setSrc("/logo.svg")}
      />
      {showText && (
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Archiwork
        </span>
      )}
    </div>
  );
}

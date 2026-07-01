"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  linkToHome?: boolean;
}

export function Logo({
  size = 48,
  showText = false,
  linkToHome = true,
}: LogoProps) {
  const [src, setSrc] = useState("/logo.png");

  const content = (
    <>
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
    </>
  );

  if (!linkToHome) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
      aria-label="На главную"
    >
      {content}
    </Link>
  );
}

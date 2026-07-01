"use client";

import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";
import { AuthProvider } from "@/lib/auth/context";
import { AssistantProvider } from "@/lib/assistant/context";
import { AssistantChat } from "@/components/AssistantChat";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AssistantProvider>
            {children}
            <AssistantChat />
          </AssistantProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

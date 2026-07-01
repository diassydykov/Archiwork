"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useAssistant } from "@/lib/assistant/context";
import { useI18n } from "@/lib/i18n/context";
import type { ChatMessage } from "@/lib/alem/chat";

export function AssistantChat() {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const { buildingType, insertDescription, registerInsertHandler } =
    useAssistant();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canInsert, setCanInsert] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return registerInsertHandler(() => setCanInsert(true));
  }, [registerInsertHandler]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: t("assistantGreeting"),
        },
      ]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = nextMessages.filter(
        (m) =>
          m.role === "user" ||
          (m.role === "assistant" && m.content !== t("assistantGreeting"))
      );

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          locale,
          buildingType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("assistantError"));

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : t("assistantError"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl shadow-lg"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            maxHeight: "min(70vh, 520px)",
          }}
          role="dialog"
          aria-label={t("assistantTitle")}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
            }}
          >
            <span className="font-medium">{t("assistantTitle")}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm opacity-90 hover:opacity-100"
              aria-label={t("assistantClose")}
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            style={{ minHeight: "240px" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user" ? "ml-auto" : "mr-auto"
                }`}
                style={{
                  backgroundColor:
                    msg.role === "user"
                      ? "var(--accent-light)"
                      : "var(--bg-accent)",
                  color: "var(--text-primary)",
                  border:
                    msg.role === "assistant"
                      ? "1px solid var(--border)"
                      : undefined,
                }}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" && canInsert && i > 0 && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium underline"
                    style={{ color: "var(--accent)" }}
                    onClick={() => insertDescription(msg.content)}
                  >
                    {t("assistantInsert")}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("assistantThinking")}
              </p>
            )}
          </div>

          <div
            className="flex gap-2 border-t p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t("assistantPlaceholder")}
              rows={2}
              className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="self-end rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {t("assistantSend")}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-transform hover:scale-105"
        style={{
          backgroundColor: "var(--accent)",
          color: "#fff",
          boxShadow: "var(--shadow)",
        }}
        aria-label={t("assistantOpen")}
        aria-expanded={open}
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

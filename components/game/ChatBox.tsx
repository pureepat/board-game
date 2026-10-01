"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ChatBox({
  messages,
  onSend,
  disabled,
  placeholder,
  tint = "default",
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tint?: "default" | "wolf";
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit() {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className={`flex-1 overflow-y-auto scrollbar-thin space-y-2 p-3 rounded-t-lg ${
          tint === "wolf" ? "bg-crimson-950/20 border border-crimson-800/40" : "bg-night-900/50"
        }`}
        style={{ minHeight: 160, maxHeight: 320 }}
      >
        {messages.length === 0 && <p className="text-moon-400/50 text-xs italic">{t("common.noMessagesYet")}</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className={tint === "wolf" ? "text-crimson-400 font-medium" : "text-wolf-purple font-medium"}>
              {m.nickname}:
            </span>{" "}
            <span className="text-moon-200">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-2 bg-night-800 rounded-b-lg border-t border-wolf-purple/20">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={300}
        />
        <Button size="icon" onClick={submit} disabled={disabled}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

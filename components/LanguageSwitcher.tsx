"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-wolf-purple/30 bg-night-900/60 p-1",
        className
      )}
    >
      <Languages className="w-3.5 h-3.5 text-moon-400 ml-1.5 shrink-0" />
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
          locale === "en" ? "bg-crimson-600 text-moon-200" : "text-moon-400 hover:text-moon-200"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("th")}
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
          locale === "th" ? "bg-crimson-600 text-moon-200" : "text-moon-400 hover:text-moon-200"
        )}
      >
        ไทย
      </button>
    </div>
  );
}

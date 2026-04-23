"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
}

export function SideDrawer({ open, onClose, title, subtitle, width = "780px", children }: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="side-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex h-full flex-col bg-[var(--t-card)] border-l border-[var(--t-border)] shadow-2xl overflow-hidden"
        style={{
          width,
          maxWidth: "100vw",
          animation: "slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--t-border)] px-6 py-4 shrink-0">
          <div>
            <h2
              id="side-drawer-title"
              className="text-[17px] font-bold text-[var(--t-text)] font-display leading-tight"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-[var(--t-sub)]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="ml-4 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-[var(--t-sub)] cursor-pointer hover:bg-[var(--t-hover)] hover:text-[var(--t-text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

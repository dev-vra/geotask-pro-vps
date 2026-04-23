"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutDashboard, FolderOpen } from "lucide-react";

const ReurbDashboardPage = dynamic(() => import("./ReurbDashboardPage"), { ssr: false });
const ReurbProcessosPage = dynamic(() => import("./ReurbProcessosPage"), { ssr: false });

type Tab = "dashboard" | "processos";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { id: "processos",  label: "Processos",   icon: FolderOpen },
];

export default function ReurbPage({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-end gap-0 px-6 pt-5 border-b border-[var(--t-border)] bg-[var(--t-card)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                "flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-t-lg border-b-2 cursor-pointer transition-colors bg-transparent",
                active
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--t-sub)] hover:text-[var(--t-text)] hover:bg-[var(--t-hover)]",
              ].join(" ")}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <ReurbDashboardPage user={user} />}
        {tab === "processos" && <ReurbProcessosPage user={user} />}
      </div>
    </div>
  );
}

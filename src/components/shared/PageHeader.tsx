"use client";

import { Calendar } from "lucide-react";
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionButtons?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, actionButtons }: PageHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50 font-display">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex gap-2.5 items-center">
        <div className="hidden md:flex items-center gap-2 px-3 h-9 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm text-[13px] font-medium text-slate-600 dark:text-gray-300">
          <Calendar size={14} className="text-primary" />
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
        <div className="flex items-center gap-2">
          {actionButtons}
        </div>
      </div>
    </div>
  );
};

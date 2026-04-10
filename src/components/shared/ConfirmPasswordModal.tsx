"use client";

import { useState } from "react";
import { X, Lock, AlertTriangle } from "lucide-react";

interface ConfirmPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  isLoading?: boolean;
}

export default function ConfirmPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar Exclusão",
  isLoading = false,
}: ConfirmPasswordModalProps) {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!password) {
      alert("Por favor, digite sua senha.");
      return;
    }
    await onConfirm(password);
    setPassword("");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-slate-600 dark:text-gray-400 text-sm mb-6">
            {description}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                CONFIRME SUA SENHA DE ADMINISTRADOR
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-gray-800/50 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/20 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Processando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

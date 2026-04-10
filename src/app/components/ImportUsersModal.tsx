"use client";

import { authFetch } from "@/lib/authFetch";
import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  T: any;
}

export const ImportUsersModal: React.FC<ImportUsersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  T,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const XLSX = await import("xlsx");
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const json = XLSX.utils.sheet_to_json(ws);
          setData(json);
        } catch (err) {
          console.error("Erro ao ler excel:", err);
          alert("Erro ao ler o arquivo Excel. Verifique se o formato está correto.");
        }
      };
      reader.readAsBinaryString(f);
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: data }),
      });
      const resData = await res.json();
      if (res.ok) {
        setResults(resData);
        onSuccess();
      } else {
        alert(resData.error || "Erro na importação");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-gray-50 flex items-center gap-2">
            <Upload size={20} className="text-primary" />
            Importar Usuários (.xlsx)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1">
          {!results ? (
            <div className="flex flex-col gap-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-slate-200 dark:border-gray-700 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="flex flex-col items-center cursor-pointer">
                  <Upload size={40} className={file ? "text-primary" : "text-slate-400"} />
                  <span className="mt-2 text-sm font-semibold text-slate-900 dark:text-gray-50">
                    {file ? file.name : "Selecione o arquivo Excel"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    Formatos aceitos: .xlsx, .xls
                  </span>
                </label>
              </div>

              {data.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-50">
                    Prévia dos dados ({data.length} usuários detectados)
                  </h3>
                  <div className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="p-2 border-b border-slate-200 dark:border-gray-700">Nome</th>
                          <th className="p-2 border-b border-slate-200 dark:border-gray-700">E-mail</th>
                          <th className="p-2 border-b border-slate-200 dark:border-gray-700">Cargo</th>
                          <th className="p-2 border-b border-slate-200 dark:border-gray-700">Setor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 5).map((u, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-gray-800 last:border-none">
                            <td className="p-2 text-slate-700 dark:text-gray-300 font-medium">{u.Nome || u.name || "-"}</td>
                            <td className="p-2 text-slate-500 dark:text-gray-400">{u["e-mail"] || u.email || "-"}</td>
                            <td className="p-2 text-slate-500 dark:text-gray-400">{u.Cargo || u.cargo || "-"}</td>
                            <td className="p-2 text-slate-500 dark:text-gray-400">{u.Setor || u.setor || "-"}</td>
                          </tr>
                        ))}
                        {data.length > 5 && (
                          <tr>
                            <td colSpan={4} className="p-2 text-center text-slate-400 bg-slate-50/50 dark:bg-black/10">
                              ... e mais {data.length - 5} usuários
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    * O sistema criará cargos e setores automaticamente se não existirem. O usuário deverá alterar a senha no primeiro acesso.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 size={60} className="text-green-500" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-gray-50">Importação Concluída</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                  <b>{results.created}</b> novos criados, <b>{results.updated}</b> atualizados.
                </p>
              </div>

              {results.errors.length > 0 && (
                <div className="w-full mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500 flex items-center gap-1.5 mb-2">
                    <AlertCircle size={14} /> Avisos e Erros:
                  </h4>
                  <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-1 max-h-[150px] overflow-auto">
                    {results.errors.map((err, i) => <li key={i}>• {err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-gray-700 flex justify-end gap-3">
          {!results ? (
            <>
              <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleImport}
                disabled={loading || data.length === 0}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Confirmar Importação"}
              </button>
            </>
          ) : (
            <button 
              onClick={onClose}
              className="px-8 py-2.5 bg-slate-900 dark:bg-gray-50 text-white dark:text-gray-950 rounded-xl text-sm font-bold"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

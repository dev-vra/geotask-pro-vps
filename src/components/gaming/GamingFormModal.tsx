import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface GamingFormModalProps {
  T: any;
  user: any;
  users: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function GamingFormModal({
  T,
  user,
  users,
  onClose,
  onSaved,
}: GamingFormModalProps) {
  const [targetUserId, setTargetUserId] = useState("");
  const [cycleType, setCycleType] = useState("Mensal");
  const [cycleName, setCycleName] = useState("");
  const [items, setItems] = useState([
    { description: "", weight: "", target: "", achieved: "" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { description: "", weight: "", target: "", achieved: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !cycleName || items.length === 0) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/gaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: targetUserId,
          cycle_type: cycleType,
          cycle_name: cycleName,
          items
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar");
      
      onSaved();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/65 backdrop-blur-sm cursor-pointer" 
      onClick={onClose}
    >
      <div 
        className="w-full h-full md:max-w-[700px] md:h-auto md:max-h-[92vh] md:rounded-[32px] rounded-none border-0 md:border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)] cursor-default animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Consistent with NewTaskModal */}
        <div className="px-[22px] py-[18px] border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="m-0 text-[17px] font-bold text-gray-900 dark:text-gray-50 uppercase tracking-tight">
              Nova Avaliação (Gaming)
            </h2>
            <p className="mt-[3px] mb-0 text-xs text-gray-500 dark:text-gray-400">
              Crie um novo ciclo de desempenho para o colaborador
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-1.5 cursor-pointer flex hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto px-8 py-7 flex-1 custom-scrollbar bg-white dark:bg-gray-900">
          <form id="gaming-form" onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="animate-fade-in-up stagger-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">
                    Liderado (Credenciado) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                    required
                  >
                    <option value="">Selecione um colaborador...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} — {u.Sector?.name || 'Sem Setor'}</option>
                    ))}
                  </select>
                </div>
                <div className="animate-fade-in-up stagger-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">
                    Tipo de Ciclo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cycleType}
                    onChange={(e) => setCycleType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div className="md:col-span-2 animate-fade-in-up stagger-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">
                    Nome do Ciclo / Período <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    placeholder="Ex: Janeiro 2026, Q1 2026, Semestre 1..."
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                    required
                  />
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 animate-fade-in-up stagger-4">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-50">Métricas e Pesos</h3>
                    <button 
                      type="button" 
                      onClick={handleAddItem} 
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 px-3 py-2 rounded-lg bg-primary/10 transition-all border-none cursor-pointer"
                    >
                        <Plus size={14}/> Adicionar Item
                    </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 relative flex flex-col md:flex-row gap-5 items-start group shadow-sm">
                       <div className="flex-1 space-y-4 w-full">
                         <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Descrição da Métrica</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, "description", e.target.value)}
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                              placeholder="Descreva o KPI ou objetivo..."
                              required
                            />
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Peso (%)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.weight}
                                  onChange={(e) => handleItemChange(index, "weight", e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                                  placeholder="0-100"
                                  required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Meta</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.target}
                                  onChange={(e) => handleItemChange(index, "target", e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                                  placeholder="Qtd/Valor"
                                  required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Realizado</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.achieved}
                                  onChange={(e) => handleItemChange(index, "achieved", e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50"
                                  placeholder="Atual"
                                />
                            </div>
                         </div>
                       </div>
                       {items.length > 1 && (
                         <button 
                           type="button" 
                           onClick={() => handleRemoveItem(index)} 
                           className="md:mt-7 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all border-none cursor-pointer"
                           title="Remover métrica"
                         >
                           <Trash2 size={18} />
                         </button>
                       )}
                    </div>
                  ))}
                </div>
                
                <div className={`mt-6 p-4 rounded-2xl flex items-center justify-between transition-all ${
                  items.reduce((a, b) => a + (parseFloat(b.weight) || 0), 0) === 100 
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20" 
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/20"
                }`}>
                   <span className="text-[11px] font-bold uppercase tracking-widest">Soma dos Pesos:</span>
                   <span className="text-lg font-black">{items.reduce((a, b) => a + (parseFloat(b.weight) || 0), 0).toFixed(parseFloat(items.reduce((a, b) => a + (parseFloat(b.weight) || 0), 0).toString()) % 1 === 0 ? 0 : 2)}% / 100%</span>
                </div>
             </div>
          </form>
        </div>

        {/* Footer - Consistent with NewTaskModal */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 px-8 py-5 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all border-none cursor-pointer"
          >
            Cancelar
          </button>
          <button
            form="gaming-form"
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 min-w-[160px] border-none cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : "Criar Nova Gaming"}
          </button>
        </div>
      </div>
    </div>
  );
}

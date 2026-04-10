import React, { useState, useEffect } from "react";
import { X, Lock, Download, Save, History, Edit2, Trophy } from "lucide-react";
import { useGamingDetail } from "@/hooks/useGaming";
import { authFetch } from "@/lib/authFetch";

interface GamingDetailModalProps {
  T: any;
  user: any;
  gamingId: number;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GamingDetailModal({
  T,
  user,
  gamingId,
  onClose,
  onUpdate,
}: GamingDetailModalProps) {
  const { gaming, isLoading, mutate } = useGamingDetail(gamingId);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (gaming && gaming.items) {
      setItems(gaming.items);
    }
  }, [gaming]);

  const isAdminOrHR = ["Admin", "Diretor", "Socio", "GM"].includes(user?.role?.name) || user?.sector?.name === "RH";
  const isOwner = gaming?.user_id === user?.id;
  const canEdit = (!isOwner || isAdminOrHR) && gaming?.status !== "CLOSED";

  const handleItemChange = (id: number, field: string, value: string) => {
    if (!canEdit) return;
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/gaming/${gamingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao atualizar");
      }
      await mutate();
      onUpdate();
      alert("Gaming atualizada com sucesso!");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseGaming = async () => {
    if (!confirm("Tem certeza que deseja FAZER O FECHAMENTO desta Gaming? Esta ação não pode ser desfeita e irá travar a edição.")) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/gaming/${gamingId}/close`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro no fechamento");
      }
      await mutate();
      onUpdate();
      alert("Ciclo encerrado com sucesso!");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (itemParams: any[]) => {
      let total = 0;
      itemParams.forEach(i => {
          const achieved = parseFloat(i.achieved) || 0;
          const target = parseFloat(i.target) || 1;
          const weight = parseFloat(i.weight) || 0;
          const ratio = Math.min(achieved / target, 1.0);
          total += (ratio * weight);
      });
      return total.toFixed(2);
  };

  const currentScore = calculateScore(items);

  if (isLoading || !gaming) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
         <div className="relative text-white z-50 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="font-bold">Carregando detalhes...</p>
         </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/65 backdrop-blur-sm cursor-pointer" 
      onClick={onClose}
    >
      <div 
        className="w-full h-full md:max-w-[800px] md:h-auto md:max-h-[92vh] md:rounded-[32px] rounded-none border-0 md:border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)] cursor-default animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Consistent with NewTaskModal */}
        <div className="px-[22px] py-[18px] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-3">
                <h2 className="m-0 text-[17px] font-bold text-gray-900 dark:text-gray-50 uppercase tracking-tight">
                    Avaliação: {gaming.cycle_name}
                </h2>
                {gaming.status === "CLOSED" ? (
                     <span className="flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-md">
                         <Lock size={10}/> FECHADO
                     </span>
                ) : (
                     <span className="flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 rounded-md">
                         <Edit2 size={10}/> EM ABERTO
                     </span>
                )}
            </div>
            <p className="mt-[3px] mb-0 text-xs text-gray-500 dark:text-gray-400">
               Liderado: <span className="font-bold text-gray-700 dark:text-gray-200">{gaming.user.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`rounded-lg p-2 transition-all border-none cursor-pointer ${showHistory ? 'bg-primary/20 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} 
                title="Ver Histórico"
             >
               <History size={18} />
             </button>
             <button
               onClick={onClose}
               className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-1.5 cursor-pointer flex hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
             >
               <X size={16} className="text-gray-500 dark:text-gray-400" />
             </button>
          </div>
        </div>

        <div className="overflow-y-auto px-8 py-7 flex-1 flex flex-col lg:flex-row gap-8 custom-scrollbar bg-white dark:bg-gray-900">
           <div className={`flex-1 space-y-8 animate-fade-in ${showHistory ? 'lg:w-[60%]' : 'w-full'}`}>
              
              <div className="relative overflow-hidden p-6 rounded-3xl border border-primary/20 bg-primary/5 shadow-sm group">
                  <div className="flex justify-between items-center relative z-10">
                      <div>
                          <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Nota Final Apurada</h3>
                          <p className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">Total ponderado acumulado do ciclo</p>
                      </div>
                      <div className="text-4xl font-black text-primary font-display group-hover:scale-110 transition-transform">
                          {currentScore}%
                      </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-5 text-primary rotate-12">
                      <Trophy size={80} />
                  </div>
              </div>

              <div className="space-y-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Detalhamento por Métrica</h3>
                  
                  <div className="grid gap-5">
                     {items.map((item, index) => {
                         const achieved = parseFloat(item.achieved) || 0;
                         const target = parseFloat(item.target) || 1;
                         const ratio = Math.min(achieved / target, 1.0);
                         const score = ratio * item.weight;

                         return (
                         <div key={item.id} className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 shadow-sm animate-fade-in-up stagger-1">
                            <div className="flex justify-between items-start mb-4">
                               <div className="flex-1">
                                   <span className="text-[13px] font-bold text-gray-900 dark:text-white">{item.description}</span>
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
                                 Peso: {item.weight}%
                               </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                               <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Meta</label>
                                  <input
                                      type="number"
                                      disabled={!canEdit}
                                      value={item.target}
                                      onChange={e => handleItemChange(item.id, "target", e.target.value)}
                                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50 disabled:opacity-50"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Realizado</label>
                                  <input
                                      type="number"
                                      disabled={!canEdit}
                                      value={item.achieved !== null ? item.achieved : ""}
                                      onChange={e => handleItemChange(item.id, "achieved", e.target.value)}
                                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-50 disabled:opacity-50"
                                  />
                               </div>
                               <div className="h-full flex flex-col justify-end">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-400">%</label>
                                  <div className={`text-md font-black ${(ratio >= 1 ? 'text-emerald-600' : 'text-primary')}`}>
                                    {(ratio * 100).toFixed(1)}%
                                  </div>
                               </div>
                               <div className="h-full flex flex-col justify-end text-right">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-400">Pontos</label>
                                  <div className="text-md font-black text-primary">
                                    +{score.toFixed(2)}%
                                  </div>
                               </div>
                            </div>

                            <div className="mt-5 h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-1000 ease-out"
                                  style={{ width: `${ratio * 100}%` }}
                                />
                            </div>
                         </div>
                       )
                     })}
                  </div>
              </div>
           </div>

           {/* History panel - Right side */}
           {showHistory && (
             <div className="lg:w-[40%] border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-8 border-gray-100 dark:border-gray-800 animate-slide-right">
                <div className="flex items-center gap-2 mb-6">
                    <History size={16} className="text-primary" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-900 dark:text-gray-50">Log de Alterações</h3>
                </div>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-3 custom-scrollbar">
                   {gaming.history?.map((h: any) => (
                       <div key={h.id} className="relative pl-6 pb-2 border-l border-gray-200 dark:border-gray-700">
                          <div className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-primary" />
                          
                          <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{h.user?.name || "Sistema"}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                             {new Date(h.created_at).toLocaleString("pt-BR")}
                          </p>
                          
                          <div className="mt-2 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                             {h.action === "CREATED" && <span className="font-bold text-primary">Iniciou este ciclo.</span>}
                             {h.action === "CLOSED" && <span className="font-bold text-red-500">Encerrou o ciclo para faturamento.</span>}
                             {h.action === "UPDATED_ITEM" && (
                                <div className="space-y-1">
                                    <p className="font-bold underline mb-1">Alterou valores:</p>
                                    {h.details && Array.isArray(h.details) ? h.details.map((d: any, idx: number) => {
                                       const f = (val: any) => (val === null || val === undefined || isNaN(val) || val === "") ? " " : val;
                                       return (
                                         <div key={idx} className="mb-0.5 italic">
                                            {d.field}: {d.oldAchieved !== undefined ? `Realizado de [${f(d.oldAchieved)}] p/ [${f(d.newAchieved)}]` : `Meta de [${f(d.oldTarget)}] p/ [${f(d.newTarget)}]`}
                                         </div>
                                       );
                                    }) : "Dados modificados."}
                                </div>
                             )}
                          </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* Footer - Consistent with NewTaskModal */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-8 py-5 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <a 
               href={`/api/gaming/export?gamingId=${gaming.id}&type=pdf`}
               target="_blank"
               className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border-none cursor-pointer"
            >
              <Download size={16} /> DOWNLOAD PDF
            </a>
          </div>
          <div className="flex gap-3">
             {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={handleCloseGaming}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={16}/> FECHAR CICLO
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="btn-primary flex items-center justify-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 min-w-[120px] border-none cursor-pointer"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save size={18}/> SALVAR
                      </>
                    )}
                  </button>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

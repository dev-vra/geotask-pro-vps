import {
  Bell,
  Clock,
  FileText,
  Layers,
  LayoutDashboard,
  Map,
} from "lucide-react";

export const SECTOR_ENUM_TO_DISPLAY: Record<string, string> = {
  AtendimentoAoCliente: "Atendimento ao Cliente",
  AtendimentoSocial: "Social",
  AssistenciaSocial: "Social",
  Administrativo: "Administrativo",
  Cadastro: "Cadastro",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  Reurb: "Reurb",
  RH: "RH",
  TI: "TI",
  Coordenacao: "Coordenação",
  Gerencia: "Gerência",
  Controladoria: "Controladoria",
};

export const TASK_TYPES = [
  "Atendimento",
  "Demanda Extra",
  "Informação Adicional",
  "Meta Engenharia",
  "Nota Devolutiva",
  "Nova Tarefa",
  "Retrabalho",
  "Solicitação Externa",
  "Viagem",
  "Visita Social",
  "Vistoria",
];

export const PRIORITIES = ["Alta", "Média", "Baixa"];

export const STATUS_COLOR: Record<string, string> = {
  "A Fazer": "#6366f1",
  "Em Andamento": "#f59e0b",
  Pausado: "#ef4444",
  Concluído: "#10b981",
};

export const PRIO_COLOR: Record<string, string> = {
  Alta: "#ef4444",
  Média: "#f59e0b",
  Baixa: "#10b981",
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "kanban", label: "Kanban", icon: Layers },
  { id: "cronograma", label: "Cronograma", icon: Clock },
  { id: "map", label: "Mapa", icon: Map },
  { id: "mindmap", label: "Mind Map", icon: FileText },
  { id: "notifications", label: "Notificações", icon: Bell },
];

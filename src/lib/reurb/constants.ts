import { ReurbTipoSolicitacao } from "@prisma/client";

export type TipoSolicitacao = ReurbTipoSolicitacao;

export const TIPO_LABELS: Record<TipoSolicitacao, string> = {
  INSTAURACAO:    "Instauração",
  MATRICULAS:     "Matrículas",
  MAPA_CADASTRAL: "Mapa Cadastral Vetorizado",
  EDITAL:         "Edital",
  CRF:            "CRF",
};

export const STATUS_LABELS: Record<string, string> = {
  ELABORACAO_INTERNA:        "Elaboração Interna",
  ENVIADA_CONTRATANTE:       "Enviada ao Contratante",
  ALTERACAO_SOLICITADA:      "Alteração Solicitada",
  PUBLICADA:                 "Instauração Publicada",
  OFICIO_ENVIADO:            "Ofício Enviado ao Contratante",
  REQUERIMENTO_PROTOCOLADO:  "Requerimento Protocolado",
  PROTOCOLO_ATENDIDO:        "Protocolo Atendido pelo Cartório",
  MAPA_APROVADO:             "Mapa Aprovado",
  EDITAL_PUBLICADO:          "Edital Publicado",
  CRF_PROTOCOLADA:           "CRF Protocolada",
  ABERTURA_INICIADA:         "Abertura de Matrículas Iniciada",
  NOTA_DEVOLUTIVA:           "Nota Devolutiva",
  MATRICULAS_ABERTAS:        "Matrículas Abertas",
  REGISTRADO_CONFIRMADO:     "Registrado ✓",
  CANCELADO:                 "Cancelado",
};

// Tipo colors para badges
export const TIPO_COLORS: Record<TipoSolicitacao, string> = {
  INSTAURACAO:    "#6366f1",
  MATRICULAS:     "#0d9488",
  MAPA_CADASTRAL: "#f59e0b",
  EDITAL:         "#8b5cf6",
  CRF:            "#98af3b",
};

export const STATUS_COLORS: Record<string, string> = {
  ELABORACAO_INTERNA:       "#94a3b8",
  ENVIADA_CONTRATANTE:      "#3b82f6",
  ALTERACAO_SOLICITADA:     "#f59e0b",
  PUBLICADA:                "#22c55e",
  OFICIO_ENVIADO:           "#3b82f6",
  REQUERIMENTO_PROTOCOLADO: "#6366f1",
  PROTOCOLO_ATENDIDO:       "#22c55e",
  MAPA_APROVADO:            "#22c55e",
  EDITAL_PUBLICADO:         "#22c55e",
  CRF_PROTOCOLADA:          "#6366f1",
  ABERTURA_INICIADA:        "#8b5cf6",
  NOTA_DEVOLUTIVA:          "#ef4444",
  MATRICULAS_ABERTAS:       "#22c55e",
  REGISTRADO_CONFIRMADO:    "#16a34a",
  CANCELADO:                "#64748b",
};

export const INITIAL_STATUS: Record<TipoSolicitacao, string> = {
  INSTAURACAO:    "ENVIADA_CONTRATANTE",
  MATRICULAS:     "OFICIO_ENVIADO",
  MAPA_CADASTRAL: "ENVIADA_CONTRATANTE",
  EDITAL:         "ENVIADA_CONTRATANTE",
  CRF:            "ENVIADA_CONTRATANTE",
};

export const VALID_TRANSITIONS: Record<TipoSolicitacao, Record<string, string[]>> = {
  INSTAURACAO: {
    ELABORACAO_INTERNA:   ["ENVIADA_CONTRATANTE", "CANCELADO"],
    ENVIADA_CONTRATANTE:  ["ALTERACAO_SOLICITADA", "PUBLICADA", "CANCELADO"],
    ALTERACAO_SOLICITADA: ["ENVIADA_CONTRATANTE", "CANCELADO"],
    PUBLICADA:            [],
    CANCELADO:            [],
  },
  MATRICULAS: {
    ELABORACAO_INTERNA:       ["OFICIO_ENVIADO", "CANCELADO"],
    OFICIO_ENVIADO:           ["ALTERACAO_SOLICITADA", "REQUERIMENTO_PROTOCOLADO", "CANCELADO"],
    ALTERACAO_SOLICITADA:     ["OFICIO_ENVIADO", "CANCELADO"],
    REQUERIMENTO_PROTOCOLADO: ["PROTOCOLO_ATENDIDO", "CANCELADO"],
    PROTOCOLO_ATENDIDO:       [],
    CANCELADO:                [],
  },
  MAPA_CADASTRAL: {
    ELABORACAO_INTERNA:   ["ENVIADA_CONTRATANTE", "CANCELADO"],
    ENVIADA_CONTRATANTE:  ["ALTERACAO_SOLICITADA", "MAPA_APROVADO", "CANCELADO"],
    ALTERACAO_SOLICITADA: ["ENVIADA_CONTRATANTE", "CANCELADO"],
    MAPA_APROVADO:        [],
    CANCELADO:            [],
  },
  EDITAL: {
    ELABORACAO_INTERNA:   ["ENVIADA_CONTRATANTE", "CANCELADO"],
    ENVIADA_CONTRATANTE:  ["ALTERACAO_SOLICITADA", "EDITAL_PUBLICADO", "CANCELADO"],
    ALTERACAO_SOLICITADA: ["ENVIADA_CONTRATANTE", "CANCELADO"],
    EDITAL_PUBLICADO:     [],
    CANCELADO:            [],
  },
  CRF: {
    ELABORACAO_INTERNA:   ["ENVIADA_CONTRATANTE", "CANCELADO"],
    ENVIADA_CONTRATANTE:  ["ALTERACAO_SOLICITADA", "CRF_PROTOCOLADA", "CANCELADO"],
    ALTERACAO_SOLICITADA: ["ENVIADA_CONTRATANTE", "CANCELADO"],
    CRF_PROTOCOLADA:      ["ABERTURA_INICIADA", "NOTA_DEVOLUTIVA", "CANCELADO"],
    ABERTURA_INICIADA:    ["MATRICULAS_ABERTAS", "CANCELADO"],
    NOTA_DEVOLUTIVA:      ["ENVIADA_CONTRATANTE", "CANCELADO"],
    MATRICULAS_ABERTAS:   [],
    CANCELADO:            [],
  },
};

export function isFinalStatus(tipo: TipoSolicitacao, status: string): boolean {
  return (VALID_TRANSITIONS[tipo]?.[status]?.length ?? -1) === 0;
}

export function getNextStatuses(tipo: TipoSolicitacao, current: string): string[] {
  return VALID_TRANSITIONS[tipo]?.[current] ?? [];
}

// Metadata fields per tipo+status (drives the advance form)
export type MetadataField = {
  field: string;
  label: string;
  type: "date" | "text" | "number";
  required?: boolean;
  maxDays?: number;
  hint?: string;
};

export const ADVANCE_METADATA: Partial<Record<TipoSolicitacao, Record<string, MetadataField[]>>> = {
  INSTAURACAO: {
    ENVIADA_CONTRATANTE:  [{ field:"data_envio",label:"Data de Envio",type:"date",required:true },{ field:"prazo_publicacao",label:"Prazo para Publicação",type:"date",required:true,hint:"Gera aviso automático" }],
    ALTERACAO_SOLICITADA: [{ field:"prazo_reenvio",label:"Prazo para Reenvio ao Contratante",type:"date",required:true }],
    PUBLICADA:            [{ field:"data_publicacao",label:"Data de Publicação",type:"date",required:true },{ field:"veiculo",label:"Veículo de Publicação",type:"text",required:true },{ field:"nr_jornal",label:"Nº do Jornal/Edição",type:"text",required:true }],
  },
  MATRICULAS: {
    OFICIO_ENVIADO:           [{ field:"data_envio",label:"Data de Envio do Ofício",type:"date",required:true },{ field:"prazo_protocolo",label:"Prazo para Protocolar Requerimento",type:"date",required:true,hint:"Gera aviso automático" }],
    ALTERACAO_SOLICITADA:     [{ field:"prazo_reenvio",label:"Prazo para Reenvio ao Contratante",type:"date",required:true }],
    REQUERIMENTO_PROTOCOLADO: [{ field:"data_protocolo",label:"Data do Protocolo",type:"date",required:true },{ field:"nr_protocolo",label:"Nº do Protocolo",type:"text",required:true },{ field:"prazo_monitoramento",label:"Prazo para Monitoramento (máx. 5 dias)",type:"date",required:true,maxDays:5,hint:"Aviso recorrente para cobrança" }],
    PROTOCOLO_ATENDIDO:       [{ field:"data_recebimento",label:"Data de Recebimento",type:"date",required:true }],
  },
  MAPA_CADASTRAL: {
    ENVIADA_CONTRATANTE:  [{ field:"data_envio",label:"Data de Envio",type:"date",required:true },{ field:"prazo_aprovacao",label:"Prazo para Aprovação do Mapa",type:"date",required:true,hint:"Gera aviso automático" }],
    ALTERACAO_SOLICITADA: [{ field:"prazo_reenvio",label:"Prazo para Reenvio ao Contratante",type:"date",required:true }],
    MAPA_APROVADO:        [{ field:"data_aprovacao",label:"Data da Aprovação",type:"date",required:true }],
  },
  EDITAL: {
    ENVIADA_CONTRATANTE:  [{ field:"data_envio",label:"Data de Envio",type:"date",required:true },{ field:"prazo_publicacao",label:"Prazo para Publicação do Edital",type:"date",required:true,hint:"Gera aviso automático" }],
    ALTERACAO_SOLICITADA: [{ field:"prazo_reenvio",label:"Prazo para Reenvio ao Contratante",type:"date",required:true }],
    EDITAL_PUBLICADO:     [{ field:"data_publicacao",label:"Data de Publicação",type:"date",required:true },{ field:"veiculo",label:"Veículo de Publicação",type:"text",required:true },{ field:"nr_jornal",label:"Nº do Jornal/Edição",type:"text",required:true }],
  },
  CRF: {
    ENVIADA_CONTRATANTE:  [{ field:"data_envio",label:"Data de Envio da CRF",type:"date",required:true },{ field:"prazo_protocolo",label:"Prazo para Protocolar no Cartório",type:"date",required:true,hint:"Gera aviso automático" }],
    ALTERACAO_SOLICITADA: [{ field:"prazo_reenvio",label:"Prazo para Reenvio ao Contratante",type:"date",required:true },{ field:"prazo_resolucao_interna",label:"Prazo Interno para Resolução",type:"date",required:false,hint:"Aviso interno da equipe" }],
    CRF_PROTOCOLADA:      [{ field:"data_protocolo",label:"Data do Protocolo",type:"date",required:true },{ field:"nr_protocolo",label:"Nº do Protocolo",type:"text",required:true },{ field:"prazo_monitoramento",label:"Prazo para Monitoramento (máx. 10 dias)",type:"date",required:true,maxDays:10,hint:"Aviso recorrente para cobrança" }],
    ABERTURA_INICIADA:    [{ field:"data_inicio",label:"Data de Início da Abertura",type:"date",required:true }],
    NOTA_DEVOLUTIVA:      [{ field:"data_recebimento",label:"Data de Recebimento da ND",type:"date",required:true },{ field:"prazo_resolucao",label:"Prazo para Resolução (interno)",type:"date",required:true,hint:"Aviso interno para cobrar a equipe" }],
    MATRICULAS_ABERTAS:   [{ field:"data_conclusao",label:"Data de Conclusão",type:"date",required:true },{ field:"qtd_matriculas",label:"Qtd. Matrículas Abertas",type:"number",required:true },{ field:"qtd_titulares",label:"Qtd. Titulares",type:"number",required:true }],
  },
};

// Checklist de documentos para MATRICULAS→PROTOCOLO_ATENDIDO
export const DOCUMENTOS_MATRICULAS = {
  matricula_mae: {
    label: "Matrícula Mãe",
    items: [
      { key: "matricula_recebida", label: "Matrícula Recebida" },
      { key: "transcricao_recebida", label: "Transcrição Recebida" },
      { key: "matricula_precaria", label: "Matrícula Precária" },
    ],
  },
  matriculas_individualizadas: {
    label: "Matrículas Individualizadas",
    items: [
      { key: "matriculas_recebidas", label: "Matrículas Recebidas" },
      { key: "transcricoes_recebidas", label: "Transcrições Recebidas" },
      { key: "matriculas_precarias", label: "Matrículas Precárias" },
    ],
  },
  confrontantes: {
    label: "Confrontantes",
    items: [
      { key: "matriculas_recebidas", label: "Matrículas Recebidas" },
      { key: "transcricoes_recebidas", label: "Transcrições Recebidas" },
      { key: "matriculas_precarias", label: "Matrículas Precárias" },
    ],
  },
  bci: {
    label: "BCI",
    items: [
      { key: "recebido", label: "Recebido" },
      { key: "nao_existente", label: "Não Existente" },
    ],
  },
  pp_solo: {
    label: "PP de Solo",
    items: [
      { key: "recebido", label: "Recebido" },
      { key: "nao_existente", label: "Não Existente" },
    ],
  },
};

// Which metadata field is the prazo_alerta source per tipo+status
export const PRAZO_FIELD: Partial<Record<TipoSolicitacao, Record<string, string>>> = {
  INSTAURACAO:    { ENVIADA_CONTRATANTE: "prazo_publicacao", ALTERACAO_SOLICITADA: "prazo_reenvio" },
  MATRICULAS:     { OFICIO_ENVIADO: "prazo_protocolo", ALTERACAO_SOLICITADA: "prazo_reenvio", REQUERIMENTO_PROTOCOLADO: "prazo_monitoramento" },
  MAPA_CADASTRAL: { ENVIADA_CONTRATANTE: "prazo_aprovacao", ALTERACAO_SOLICITADA: "prazo_reenvio" },
  EDITAL:         { ENVIADA_CONTRATANTE: "prazo_publicacao", ALTERACAO_SOLICITADA: "prazo_reenvio" },
  CRF:            { ENVIADA_CONTRATANTE: "prazo_protocolo", ALTERACAO_SOLICITADA: "prazo_reenvio", CRF_PROTOCOLADA: "prazo_monitoramento", NOTA_DEVOLUTIVA: "prazo_resolucao" },
};

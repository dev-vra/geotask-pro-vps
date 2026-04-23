import { z } from "zod";

// ReurbTipoSolicitacao enum values (matches Prisma enum)
export const REURB_TIPO_SOLICITACAO = ["INSTAURACAO", "MATRICULAS", "MAPA_CADASTRAL", "EDITAL", "CRF"] as const;

export const createProcessSchema = z.object({
  neighborhood_id: z.coerce.number().int().positive("Bairro obrigatório"),
  sector_id: z.coerce.number().int().positive("Setor obrigatório"),
  contract_id: z.coerce.number().int().positive().optional().nullable(),
  qtde_lotes: z.coerce.number().int().min(0).optional().default(0),
});

export const updateProcessSchema = z.object({
  qtde_lotes: z.coerce.number().int().min(0).optional(),
  contract_id: z.coerce.number().int().positive().optional().nullable(),
});

export const createSolicitacaoSchema = z.object({
  process_id: z.coerce.number().int().positive(),
  tipo: z.enum(REURB_TIPO_SOLICITACAO, { required_error: "Tipo de solicitação obrigatório" }),
  status_atual: z.string().min(1).optional().default("ELABORACAO_INTERNA"),
  prazo_alerta: z.string().datetime().optional().nullable(),
  link: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
});

// kept as alias for backwards compat in existing routes
export const createProtocolSchema = createSolicitacaoSchema;

export const updateStatusSchema = z.object({
  status_novo: z.string().min(1, "Novo status obrigatório"),
  prazo_alerta: z.string().datetime().optional().nullable(),
  link: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});

// advanceStageSchema kept for backwards compat with existing route + tests
export const advanceStageSchema = updateStatusSchema;

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comentário não pode ser vazio"),
  solicitacao_id: z.coerce.number().int().positive(),
});

export type CreateProcessInput = z.infer<typeof createProcessSchema>;
export type UpdateProcessInput = z.infer<typeof updateProcessSchema>;
export type CreateSolicitacaoInput = z.infer<typeof createSolicitacaoSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AdvanceStageInput = z.infer<typeof advanceStageSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

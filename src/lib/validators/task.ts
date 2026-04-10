import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  type: z.string().optional(),
  status: z.string().default("A Fazer"),
  priority: z.string().optional(),
  sector_id: z.coerce.number().int().optional().nullable(),
  sector: z.string().optional(),
  responsible_id: z.coerce.number().int().optional().nullable(),
  responsible: z.string().optional(),
  contract_id: z.coerce.number().int().optional().nullable(),
  contract: z.string().optional(),
  city_id: z.coerce.number().int().optional().nullable(),
  city: z.string().optional(),
  neighborhood_id: z.coerce.number().int().optional().nullable(),
  neighborhood: z.string().optional(),
  nucleus: z.string().optional(),
  quadra: z.string().optional(),
  lote: z.string().optional(),
  deadline: z.string().optional().nullable(),
  link: z.string().optional(),
  created_by_id: z.coerce.number().int().optional(),
  parent_id: z.coerce.number().int().optional().nullable(),
  children: z.array(z.any()).optional(),
  subtasks: z.array(z.any()).optional(),
});

export const updateTaskSchema = z.object({
  id: z.coerce.number().int().positive("ID é obrigatório"),
}).passthrough();

export const deleteTaskSchema = z.object({
  id: z.coerce.string().min(1, "ID é obrigatório"),
});

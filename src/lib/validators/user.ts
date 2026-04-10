import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  role_id: z.coerce.number().int().positive().optional(),
  sector_id: z.coerce.number().int().positive().optional(),
  role: z.coerce.number().int().positive().optional(),
  sector: z.coerce.number().int().positive().optional(),
  avatar: z.string().optional(),
  team_id: z.coerce.number().int().positive().nullable().optional(),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
}).refine(
  (d) => d.role_id || d.role,
  { message: "role_id é obrigatório", path: ["role_id"] },
).refine(
  (d) => d.sector_id || d.sector,
  { message: "sector_id é obrigatório", path: ["sector_id"] },
);

export const updateUserSchema = z.object({
  id: z.coerce.number().int().positive("ID é obrigatório"),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role_id: z.coerce.number().int().positive().optional(),
  sector_id: z.coerce.number().int().positive().optional(),
  role: z.coerce.number().int().positive().optional(),
  sector: z.coerce.number().int().positive().optional(),
  avatar: z.string().optional(),
  active: z.boolean().optional(),
  team_id: z.coerce.number().int().positive().nullable().optional(),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
  password: z.string().min(6).optional(),
  resetPassword: z.boolean().optional(),
});

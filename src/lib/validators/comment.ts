import { z } from "zod";

export const createCommentSchema = z.object({
  task_id: z.coerce.number().int().positive("task_id é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  user_id: z.coerce.number().int().positive("user_id é obrigatório"),
});

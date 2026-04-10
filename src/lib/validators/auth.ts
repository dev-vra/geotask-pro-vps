import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const changePasswordSchema = z.object({
  userId: z.coerce.number().int().positive("userId inválido"),
  currentPassword: z.string().optional().nullable(),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
});

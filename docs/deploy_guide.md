# Guia de Deploy - GeoTask-Pro

Este guia descreve o processo seguro para subir novas funcionalidades para produção e sincronizar o banco de dados no Supabase.

## 1. Preparação Local
Antes de enviar as alterações, certifique-se de que o banco de dados local está sincronizado e que a build do projeto está passando.

```powershell
# Sincronizar Prisma localmente
npx prisma generate
```

## 2. Commit e Push (GitHub)
Siga o padrão de commits para manter o histórico organizado.

```powershell
git add .
git commit -m "feat: modulo gaming finalizado e vinculo de gestores adicionado"
git push origin main
```

## 3. Atualização do Banco de Dados (Supabase)
> [!IMPORTANT]
> **NUNCA** use `npx prisma migrate dev` apontando para o banco de produção (Supabase). Isso pode apagar dados existentes se houver conflitos de drift.

### Passo a Passo Seguro:
1. Certifique-se de que sua `DATABASE_URL` no `.env` de produção (ou no seu ambiente de migração) está apontando para o Supabase.
2. Execute o comando de deploy de migrações:

```powershell
npx prisma migrate deploy
```

Este comando apenas aplica migrações pendentes sem resetar o banco ou solicitar confirmação destrutiva.

## 4. Deploy no Vercel / VPS
Se você utiliza Vercel, o deploy será automático após o push. Caso utilize VPS:

```powershell
# Na sua VPS
git pull origin main
npm install
npm run build
pm2 restart all # Ou o gerenciador que você utiliza
```

## 5. Verificação Pós-Deploy
Após o deploy, valide:
- [ ] Login de usuários.
- [ ] Criação de uma nova Gaming.
- [ ] Vínculo de um gestor em um usuário existente.

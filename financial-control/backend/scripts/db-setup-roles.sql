-- ══════════════════════════════════════════════════════════════════════════════
--  Privilégios Mínimos no Banco de Dados (Principle of Least Privilege)
--
--  Execute este script UMA VEZ como superusuário (postgres) antes de
--  colocar a aplicação em produção.
--
--  Roles criados:
--    app_rw   → leitura/escrita para a aplicação (runtime)
--    app_ro   → somente leitura para backups, analytics, auditoria externa
--
--  Uso:
--    psql -U postgres -d financial_control -f scripts/db-setup-roles.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Roles ──────────────────────────────────────────────────────────────────

-- Role de leitura/escrita (aplicação em runtime)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN PASSWORD 'SUBSTITUA_POR_SENHA_FORTE_app_rw';
  END IF;
END $$;

-- Role somente leitura (backups, relatórios, auditoria)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_ro') THEN
    CREATE ROLE app_ro LOGIN PASSWORD 'SUBSTITUA_POR_SENHA_FORTE_app_ro';
  END IF;
END $$;

-- ── 2. Revogar permissões padrão do schema public ─────────────────────────────

-- Impede que roles criem objetos arbitrários no schema public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL    ON DATABASE financial_control FROM PUBLIC;

-- ── 3. Permissões para app_rw (runtime da aplicação) ─────────────────────────

-- Conexão ao banco
GRANT CONNECT ON DATABASE financial_control TO app_rw;

-- Uso do schema
GRANT USAGE ON SCHEMA public TO app_rw;

-- Tabelas existentes: DML completo (sem DDL — app NÃO pode alterar estrutura)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;

-- Sequences (para IDs auto-incremento, UUIDs via sequence, etc.)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- Garantir que novas tabelas criadas via migrations também recebam permissão
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;

-- ── 4. Permissões para app_ro (backups / auditoria) ──────────────────────────

GRANT CONNECT ON DATABASE financial_control TO app_ro;
GRANT USAGE   ON SCHEMA public TO app_ro;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO app_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_ro;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO app_ro;

-- ── 5. Revogar do superusuário para garantir hardening ────────────────────────
-- ATENÇÃO: Execute estas linhas somente após confirmar que app_rw funciona.
-- Nunca use o role 'postgres' na string DATABASE_URL da aplicação em produção.

-- REVOKE ALL ON DATABASE financial_control FROM postgres;  -- descomente se aplicável

-- ── 6. Row-Level Security (RLS) — Opcional mas recomendado ───────────────────
--
-- Se quiser adicionar uma camada extra de isolamento por tenant (userId):
--
-- ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON "Transaction"
--   USING (user_id = current_setting('app.current_user_id')::uuid);
--
-- A aplicação precisaria executar:
--   SET app.current_user_id = '<userId>' antes de cada query
--   (pode ser feito via Prisma middleware / connection pool)
--
-- Isso garante que MESMO SE houver um bug de IDOR na aplicação,
-- o banco rejeitará queries que cruzem dados entre usuários.

-- ── 7. Verificação ────────────────────────────────────────────────────────────

-- Execute para confirmar as permissões:
-- \dp   (lista privilégios de todas as tabelas)
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' ORDER BY grantee, table_name;

-- ── 8. DATABASE_URL para produção ────────────────────────────────────────────
-- Use app_rw na string de conexão da aplicação:
-- DATABASE_URL="postgresql://app_rw:SENHA@host:5432/financial_control?ssl=true&sslmode=require"
--
-- Use app_ro para backups (pg_dump):
-- pg_dump -U app_ro -h host -d financial_control | gpg --symmetric > backup_$(date +%Y%m%d).sql.gpg

# Documentação Supabase - RastroDin

Guia completo de uso do Supabase CLI e boas práticas para o projeto.

## Índice

- [Instalação e Setup](#instalação-e-setup)
- [Autenticação](#autenticação)
- [Migrations](#migrations)
- [Banco de Dados](#banco-de-dados)
- [Secrets](#secrets)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Instalação e Setup

### Instalar Supabase CLI

```bash
npm install --save-dev supabase
```

### Inicializar projeto Supabase local

```bash
supabase init
```

Isso cria a pasta `supabase/` com:

- `config.toml` - Configurações do projeto
- `migrations/` - Arquivos SQL de migrations

### Verificar versão

```bash
supabase --version
```

## Autenticação

### Login na conta Supabase

```bash
supabase login
```

### Verificar status de autenticação

```bash
supabase projects list
```

### Logout

```bash
supabase logout
```

## Migrations

### Criar nova migration

```bash
supabase migration new nome_da_migration
```

**Exemplo:**

```bash
supabase migration new create_users_table
supabase migration new add_parent_id_to_categories
```

Isso gera um arquivo com timestamp na pasta `supabase/migrations/` com nome: `YYYYMMDDHHMMSS_nome_da_migration.sql`

### Executar migrations

```bash
supabase migration up
```

Aplica as migrations pendentes no banco local sem apagar os dados já cadastrados.

Para aplicar migrations no banco remoto/vinculado:

```bash
supabase db push
```

Aplica as migrations pendentes no projeto vinculado. Use esse comando quando quiser enviar alterações para o Supabase remoto depois de validar localmente.

### Resetar banco local

```bash
supabase db reset
```

**⚠️ Atenção:** Isso recria o banco de dados local completamente, apaga os dados locais e executa todas as migrations do zero. Use apenas quando quiser reconstruir o ambiente local.

### Alterações incrementais sem perder dados

Para mudanças simples em tabelas existentes, como adicionar uma coluna, crie uma migration com `alter table` e aplique com `supabase migration up`:

```sql
alter table public.categories
add column parent_id uuid references public.categories(id)
on delete cascade;
```

Ao aplicar essa migration incrementalmente, os registros existentes são preservados. No exemplo acima, as categorias já cadastradas continuam no banco e a nova coluna começa com valor `null` para esses registros.

### Ver status das migrations

```bash
supabase migration list
```

### Criar snapshot do banco de dados

```bash
supabase db pull
```

Puxa o schema atual do banco remoto e cria uma migration.

### Diff entre schemas

```bash
supabase db diff [--schema <schema_name>]
```

### Exemplo Prático: Criar uma Tabela

Passo a passo para criar uma nova tabela com migration:

#### 1. Criar a migration

```bash
supabase migration new create_categories_table
```

Isso gera: `supabase/migrations/20260527XXXXXX_create_categories_table.sql`

#### 2. Adicionar o SQL na migration

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id)
    on delete cascade,

  name text not null,

  type text not null check (
    type in ('expense', 'income')
  ),

  color text,
  icon text,

  parent_id uuid references public.categories(id)
    on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint category_cannot_be_own_parent
    check (id <> parent_id)
);

-- Criar índices para performance
create index idx_categories_user_id on public.categories(user_id);
create index idx_categories_parent_id on public.categories(parent_id);
create index idx_categories_type on public.categories(type);
```

#### 3. Aplicar a migration

```bash
supabase migration up
```

Aplica a migration pendente no banco local sem apagar os dados existentes.

Se você quiser recriar o banco local do zero para testar todas as migrations desde o início, use:

```bash
supabase db reset
```

**⚠️ Atenção:** `supabase db reset` apaga os dados locais.

#### 4. Verificar se foi criada

```bash
# Conectar ao banco
psql postgresql://postgres:postgres@localhost:54322/postgres

# Listar tabelas
\dt public.categories

# Ver estrutura
\d public.categories
```

#### 5. Testar via API

```bash
curl http://localhost:54321/rest/v1/categories
```

## Banco de Dados

### Acessar banco local

```bash
supabase start
```

Inicia o banco PostgreSQL local. Conexão disponível em `postgresql://postgres:postgres@localhost:54322/postgres`

### Parar banco local

```bash
supabase stop
```

### Resetar banco local

```bash
supabase db reset
```

**⚠️ Atenção:** Deleta todos os dados locais e re-executa todas as migrations.

### Acessar console remoto

```bash
supabase projects list
supabase link --project-ref <project-ref>
```

### Ver logs do banco

```bash
supabase logs --help
supabase logs postgres --follow
```

## Secrets

### Definir secrets (variáveis de ambiente)

```bash
supabase secrets set KEY=value
```

### Listar secrets

```bash
supabase secrets list
```

### Remover secret

```bash
supabase secrets unset KEY
```

### Usar secrets em functions

Em `Edge Functions`, os secrets são acessíveis via `Deno.env.get('KEY')`

## Deployment

### Fazer push do schema para produção

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Ver projeto remoto vinculado

```bash
supabase projects list
```

### Desvincular projeto remoto

```bash
supabase unlink
```

### Fazer backup do banco remoto

```bash
supabase db download --project-ref <project-ref>
```

## Boas Práticas

### 1. Naming Conventions

- **Tables:** snake_case, plural (ex: `users`, `categories`)
- **Columns:** snake_case (ex: `user_id`, `created_at`)
- **Migrations:** Descritivas e em inglês (ex: `create_users_table`)

### 2. Estrutura de Migrations

```sql
-- Migration: 20260527180826_add_parent_id_to_categories.sql

-- Create parent_id column
ALTER TABLE categories
ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN categories.parent_id IS 'Reference to parent category for nested structure';

-- Create index for performance
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
```

### 3. Timestamps

Sempre incluir `created_at` e `updated_at`:

```sql
ALTER TABLE table_name
ADD COLUMN created_at timestamp with time zone DEFAULT now(),
ADD COLUMN updated_at timestamp with time zone DEFAULT now();
```

### 4. Versionar Migrations

Cada migration deve ser pequena e focada em uma única alteração. Comitar junto com o código da aplicação.

### 5. Testar Localmente

```bash
supabase start          # Inicia banco local
supabase migration up   # Aplica migrations locais sem apagar dados
# Testa a aplicação
supabase stop           # Para o banco
```

## Troubleshooting

### Erro: "Already initialized"

Se receber erro ao rodar `supabase init`, é porque o projeto já foi inicializado. Para reiniciar:

```bash
rm -rf supabase/
supabase init
```

### Erro: "Not linked to any project"

Vincule o projeto remoto:

```bash
supabase link --project-ref <seu-project-ref>
```

### Banco local não inicia

Verifique se a porta 54322 está disponível:

```bash
lsof -i :54322
```

Se estiver em uso, altere no `supabase/config.toml`.

### Ver logs detalhados

```bash
supabase --debug <comando>
```

### Resetar ambiente completo

```bash
supabase stop
supabase db reset
supabase start
```

## Arquivos Importantes

### `supabase/config.toml`

Configurações locais do projeto. Não comitar valores sensíveis.

```toml
[api]
port = 54321

[db]
port = 54322
shadow_db_url = "postgresql://postgres:postgres@localhost:54323/postgres"

[auth]
enable_signup = true
```

### `supabase/migrations/`

Contém todos os arquivos SQL de migrations numerados por timestamp.

## Referências

- [Documentação Oficial Supabase](https://supabase.com/docs)
- [CLI Reference](https://supabase.com/docs/guides/cli)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Comandos Rápidos

| Comando                         | Descrição                                                   |
| ------------------------------- | ----------------------------------------------------------- |
| `supabase init`                 | Inicializa projeto Supabase local                           |
| `supabase start`                | Inicia banco de dados local                                 |
| `supabase stop`                 | Para banco de dados local                                   |
| `supabase migration new <name>` | Cria nova migration                                         |
| `supabase migration up`         | Aplica migrations pendentes no banco local sem apagar dados |
| `supabase db push`              | Aplica migrations pendentes no banco remoto/vinculado       |
| `supabase db reset`             | Recria o banco local e apaga dados locais                   |
| `supabase login`                | Faz login no Supabase                                       |
| `supabase link`                 | Vincula projeto remoto                                      |
| `supabase secrets set`          | Define variáveis de ambiente                                |

---

**Última atualização:** 27 de maio de 2026

# Redobrai Finan

Sistema ERP Financeiro completo para gestão de cobranças, pagamentos e integrações bancárias.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/seu-repo&env=DATABASE_URL,NEXTAUTH_SECRET&envDescription=Variáveis%20necessárias%20para%20o%20deploy)

## 🚀 Deploy na Vercel (1 Clique)

### Passo 1: Clique no botão acima ou acesse [vercel.com/new](https://vercel.com/new)

### Passo 2: Configure o banco de dados
Na Vercel, vá em **Storage** → **Create Database** → **Postgres**

### Passo 3: Configure as variáveis de ambiente
```env
DATABASE_URL=            # Configurado automaticamente pelo Vercel Postgres
NEXTAUTH_SECRET=         # Gere com: openssl rand -base64 32
NEXTAUTH_URL=            # Configurado automaticamente pela Vercel
```

### Passo 4: Execute as migrações
```bash
npx vercel env pull .env.local
npx prisma db push
```

**Pronto!** Sua aplicação estará disponível em `https://seu-projeto.vercel.app`

---

## Tecnologias

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── api/               # API Routes
│   │   │   ├── boletos/       # Endpoints de boletos
│   │   │   ├── clientes/      # Endpoints de clientes
│   │   │   └── sicredi/       # Integração Sicredi
│   │   ├── dashboard/         # Páginas do dashboard
│   │   │   ├── boletos/       # Gestão de boletos
│   │   │   ├── clientes/      # Gestão de clientes
│   │   │   ├── contas/        # Gestão de contas
│   │   │   ├── integracoes/   # Integrações bancárias
│   │   │   └── page.tsx       # Dashboard principal
│   │   ├── login/             # Página de login
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── layout/            # Componentes de layout
│   │   │   ├── sidebar.tsx    # Barra lateral
│   │   │   └── header.tsx     # Cabeçalho
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Componentes UI (shadcn)
│   └── lib/
│       ├── api.ts             # Cliente API
│       ├── store.ts           # Zustand stores
│       └── utils.ts           # Utilitários
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Páginas Principais

### Landing Page (`/`)
- Hero section com CTA
- Features do produto
- Benefícios
- Footer

### Login (`/login`)
- Formulário de login
- OAuth com Google/GitHub
- Link para registro

### Dashboard (`/dashboard`)
- Cards de métricas (receita, clientes, boletos)
- Gráfico de receita mensal
- Lista de boletos vencendo
- Transações recentes

### Clientes (`/dashboard/clientes`)
- Tabela de clientes com busca e filtros
- Cards de estatísticas
- CRUD completo

### Boletos (`/dashboard/boletos`)
- Tabela de boletos com status
- Filtros por status e período
- Ações: ver, copiar linha digitável, baixar PDF, cancelar
- Suporte a boleto híbrido (PIX)

### Integração Sicredi (`/dashboard/integracoes/sicredi`)
- Status da conexão
- Credenciais (mascaradas)
- Logs de atividade
- Configuração de webhooks

## API Routes

### Boletos

```typescript
// GET /api/boletos - Listar boletos
// POST /api/boletos - Criar boleto
// GET /api/boletos/[id] - Buscar boleto
// PATCH /api/boletos/[id] - Atualizar boleto
// DELETE /api/boletos/[id] - Cancelar boleto
```

### Clientes

```typescript
// GET /api/clientes - Listar clientes
// POST /api/clientes - Criar cliente
// GET /api/clientes/[id] - Buscar cliente
// PATCH /api/clientes/[id] - Atualizar cliente
// DELETE /api/clientes/[id] - Excluir cliente
```

### Sicredi

```typescript
// POST /api/sicredi/boletos - Criar boleto via Sicredi
// GET /api/sicredi/boletos?nossoNumero=XXX - Consultar boleto
```

## Stores (Zustand)

```typescript
// Auth Store
useAuthStore()
  .user
  .token
  .login(email, password)
  .logout()

// Notifications Store
useNotificationsStore()
  .notifications
  .unreadCount
  .addNotification(notification)
  .markAsRead(id)

// Settings Store
useSettingsStore()
  .settings
  .toggleSidebar()
  .setTheme(theme)

// Boletos Store
useBoletosStore()
  .boletos
  .addBoleto(boleto)
  .updateBoleto(id, data)
```

## Componentes UI

Baseado em [shadcn/ui](https://ui.shadcn.com/):

- `Button` - Botões com variantes
- `Card` - Cards com header, content, footer
- `Input` - Campos de entrada
- `Badge` - Badges de status
- `Avatar` - Avatares com fallback
- `DropdownMenu` - Menus dropdown
- `Separator` - Separadores
- `ScrollArea` - Áreas com scroll

## 🌐 Deploy na Vercel (Detalhado)

### Opção 1: Via Interface Web

1. **Acesse [vercel.com](https://vercel.com)** e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Importe seu repositório do GitHub
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. Adicione as variáveis de ambiente:
   ```
   NEXTAUTH_SECRET=sua-chave-secreta-aqui
   ```
6. Clique em **Deploy**

### Opção 2: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Seguir as instruções interativas
```

### Configurar Banco de Dados

#### Vercel Postgres (Recomendado)
1. No dashboard da Vercel, vá em **Storage**
2. Clique em **Create Database** → **Postgres**
3. Conecte ao seu projeto
4. As variáveis `DATABASE_URL` serão configuradas automaticamente

#### Alternativas Gratuitas
- **[Neon](https://neon.tech)** - PostgreSQL serverless
- **[Supabase](https://supabase.com)** - PostgreSQL + Auth + Storage
- **[Railway](https://railway.app)** - PostgreSQL + Redis

### Executar Migrações

Após configurar o banco:

```bash
# Baixar variáveis de ambiente da Vercel
npx vercel env pull .env.local

# Aplicar schema do Prisma
npx prisma db push

# (Opcional) Popular com dados de exemplo
npx prisma db seed
```

### Webhook Público

O webhook para consulta de boletos está disponível em:

```
POST https://seu-projeto.vercel.app/api/webhook/boletos/consultar
```

**Request:**
```json
{
  "telefone": "11999998888",
  "senha": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "cliente": "João da Silva",
  "total": 2,
  "boletos": [
    {
      "nossoNumero": "2520000011",
      "linhaDigitavel": "74891.12511...",
      "qrCode": "00020126...",
      "valor": 150.00,
      "dataVencimento": "2026-02-15",
      "status": "pendente"
    }
  ]
}
```

### Cron Jobs

O sistema inclui um cron job que roda diariamente às 8h:
- Atualiza boletos vencidos automaticamente

Configurado em `vercel.json`.

---

## 📊 Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral com métricas e gráficos |
| **Clientes** | CRUD completo de clientes (PF/PJ) |
| **Boletos** | Emissão, consulta e gestão de boletos |
| **Transações** | Histórico de movimentações |
| **Integrações** | Sicredi, Sicoob e outros bancos |
| **Webhook** | API pública para consulta de boletos |

---

## 🔗 Links Úteis

- [Documentação da Vercel](https://vercel.com/docs)
- [Documentação do Prisma](https://www.prisma.io/docs)
- [Documentação do Next.js](https://nextjs.org/docs)

## Licença

Proprietário - Redobrai Finan © 2026

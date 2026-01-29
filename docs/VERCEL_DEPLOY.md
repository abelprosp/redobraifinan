# Deploy do Webhook de Boletos na Vercel

## Visão Geral

O webhook de consulta de boletos foi implementado como uma **API Route do Next.js**, o que permite fazer deploy diretamente na Vercel sem necessidade de servidores adicionais.

## Endpoint

Após o deploy, o webhook estará disponível em:

```
https://seu-projeto.vercel.app/api/webhook/boletos/consultar
```

## Como Fazer o Deploy

### 1. Via GitHub (Recomendado)

1. **Faça push do código para o GitHub**:
   ```bash
   cd frontend
   git add .
   git commit -m "Adiciona webhook de consulta de boletos"
   git push
   ```

2. **Conecte o repositório na Vercel**:
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Selecione seu repositório
   - Configure o diretório raiz como `frontend`

3. **Configure as variáveis de ambiente**:
   - `DATABASE_URL` - URL de conexão do PostgreSQL
   
   Exemplo:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
   ```

4. **Clique em "Deploy"**

### 2. Via Vercel CLI

1. **Instale a Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Faça login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

4. **Configure as variáveis de ambiente**:
   ```bash
   vercel env add DATABASE_URL
   ```

## Configuração do Banco de Dados

A Vercel requer um banco de dados PostgreSQL acessível pela internet. Opções recomendadas:

### Opção 1: Vercel Postgres (Mais Simples)
1. No dashboard da Vercel, vá em "Storage"
2. Clique em "Create Database" → "Postgres"
3. A variável `DATABASE_URL` será configurada automaticamente

### Opção 2: Neon (Gratuito)
1. Crie uma conta em [neon.tech](https://neon.tech)
2. Crie um novo projeto
3. Copie a connection string para `DATABASE_URL`

### Opção 3: Supabase
1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em Settings → Database
3. Copie a connection string

### Opção 4: Railway
1. Crie um projeto em [railway.app](https://railway.app)
2. Adicione um serviço PostgreSQL
3. Copie a connection string

## Executar Migrações do Prisma

Após configurar o banco de dados, execute as migrações:

```bash
# Localmente
cd frontend
npx prisma db push

# Ou via Vercel CLI
vercel env pull .env.local
npx prisma db push
```

## Testar o Webhook

### Usando cURL

```bash
curl -X POST https://seu-projeto.vercel.app/api/webhook/boletos/consultar \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "11999998888",
    "senha": "1234"
  }'
```

### Usando JavaScript (Fetch)

```javascript
const response = await fetch('https://seu-projeto.vercel.app/api/webhook/boletos/consultar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telefone: '11999998888',
    senha: '1234'
  })
})

const data = await response.json()
console.log(data)
```

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Boletos encontrados com sucesso",
  "cliente": "João da Silva",
  "total": 2,
  "boletos": [
    {
      "id": "clx123...",
      "nossoNumero": "2520000011",
      "linhaDigitavel": "74891.12511...",
      "qrCode": "00020126930014br.gov.bcb.pix...",
      "valor": 150.00,
      "dataVencimento": "2026-02-15",
      "status": "pendente",
      "vencido": false,
      "diasVencimento": 17
    }
  ]
}
```

## Integração com Chatbots

O webhook é ideal para integrar com chatbots de WhatsApp, Telegram, etc.

### Exemplo de Fluxo no N8N / Make / Zapier

1. **Trigger**: Mensagem recebida no WhatsApp
2. **Extrair dados**: Telefone e senha da mensagem
3. **HTTP Request**: POST para o webhook
4. **Responder**: Formatar boletos e enviar resposta

### Exemplo de Código para WhatsApp Business API

```javascript
// Função para consultar boletos
async function consultarBoletos(telefone, senha) {
  const response = await fetch('https://seu-projeto.vercel.app/api/webhook/boletos/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, senha })
  })
  return response.json()
}

// Formatar mensagem de resposta
function formatarMensagem(data) {
  if (!data.success) {
    return `❌ ${data.error}`
  }

  if (data.total === 0) {
    return `✅ Olá ${data.cliente}!\n\nVocê não possui boletos pendentes.`
  }

  let msg = `✅ Olá ${data.cliente}!\n\nEncontrei ${data.total} boleto(s):\n\n`

  data.boletos.forEach((b, i) => {
    const emoji = b.vencido ? '⚠️' : '📄'
    const status = b.vencido ? `VENCIDO há ${Math.abs(b.diasVencimento)} dias` : `Vence em ${b.diasVencimento} dias`
    
    msg += `${emoji} *Boleto ${i + 1}*\n`
    msg += `💰 Valor: R$ ${b.valor.toFixed(2)}\n`
    msg += `📅 Vencimento: ${b.dataVencimento}\n`
    msg += `📊 Status: ${status}\n`
    
    if (b.linhaDigitavel) {
      msg += `\n📋 Linha digitável:\n\`${b.linhaDigitavel}\`\n`
    }
    
    if (b.qrCode) {
      msg += `\n📱 PIX disponível para pagamento!\n`
    }
    
    msg += `\n---\n\n`
  })

  return msg
}
```

## Limites da Vercel (Plano Gratuito)

- **Execução**: Máximo 10 segundos por requisição
- **Requests**: 100.000 por mês
- **Bandwidth**: 100 GB por mês

Para produção com alto volume, considere o plano Pro ou um serviço dedicado.

## Monitoramento

### Logs na Vercel
1. Acesse o dashboard do projeto
2. Vá em "Functions" → Selecione a função
3. Visualize os logs em tempo real

### Adicionar Monitoramento (Opcional)
```typescript
// Exemplo de integração com serviço de monitoramento
import { track } from '@vercel/analytics'

// No início da função POST
track('webhook_boletos_consulta', {
  telefone: telefone.substring(0, 4) + '****',
  success: true,
  boletosCount: boletos.length,
})
```

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
Execute o build do Prisma antes do deploy:
```bash
npx prisma generate
```

### Erro: "Connection timeout"
- Verifique se o banco de dados está acessível
- Aumente o timeout na connection string: `?connect_timeout=10`

### Erro: "CORS blocked"
O CORS já está configurado em `next.config.js`. Se ainda houver problemas, adicione o domínio específico:
```javascript
// next.config.js
headers: [
  { key: 'Access-Control-Allow-Origin', value: 'https://seu-chatbot.com' },
]
```

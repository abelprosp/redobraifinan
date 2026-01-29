# API de Webhook para Consulta de Boletos

## Visão Geral

Este webhook permite que clientes consultem seus boletos pendentes informando apenas o número de telefone e uma senha de 4 dígitos (primeiros 4 números do CPF ou CNPJ).

## Base URL

```
http://localhost:8081
```

## Autenticação

A autenticação é feita através dos dados do cliente:
- **Telefone**: Número de celular cadastrado (DDD + número)
- **Senha**: Primeiros 4 dígitos do CPF ou CNPJ

## Endpoints

### 1. Consultar Boletos

Retorna todos os boletos pendentes do cliente.

```
POST /webhook/boletos/consultar
```

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "telefone": "11999998888",
  "senha": "1234"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `telefone` | string | Sim | Telefone do cliente (apenas números ou formatado) |
| `senha` | string | Sim | Primeiros 4 dígitos do CPF ou CNPJ |

#### Response - Sucesso (200)

```json
{
  "success": true,
  "message": "Boletos encontrados com sucesso",
  "cliente": "João da Silva",
  "total": 2,
  "boletos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nosso_numero": "12345678901",
      "linha_digitavel": "74891.12345 67890.123456 12345.678901 1 12340000010000",
      "codigo_barras": "74891123456789012345612345678901112340000010000",
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_url": "https://api.sicredi.com.br/qrcode/abc123",
      "valor": 150.00,
      "data_emissao": "2026-01-15",
      "data_vencimento": "2026-02-15",
      "status": "PENDENTE",
      "pagador_nome": "João da Silva",
      "url_boleto": "https://api.sicredi.com.br/boleto/abc123",
      "url_pdf": "https://api.sicredi.com.br/boleto/abc123.pdf",
      "descricao": "Mensalidade Janeiro/2026",
      "vencido": false,
      "dias_vencimento": 17
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nosso_numero": "12345678902",
      "linha_digitavel": "74891.12345 67890.123456 12345.678902 1 12340000020000",
      "valor": 200.00,
      "valor_pago": null,
      "data_emissao": "2026-01-01",
      "data_vencimento": "2026-01-25",
      "status": "PENDENTE",
      "pagador_nome": "João da Silva",
      "descricao": "Parcela 2/12",
      "vencido": true,
      "dias_vencimento": -4
    }
  ]
}
```

#### Response - Nenhum Boleto (200)

```json
{
  "success": true,
  "message": "Nenhum boleto encontrado para este cliente",
  "cliente": "João da Silva",
  "total": 0,
  "boletos": []
}
```

#### Response - Telefone Não Encontrado (404)

```json
{
  "success": false,
  "error": "Telefone não encontrado no sistema.",
  "code": "USER_NOT_FOUND"
}
```

#### Response - Senha Incorreta (401)

```json
{
  "success": false,
  "error": "Senha incorreta. A senha são os 4 primeiros dígitos do seu CPF ou CNPJ.",
  "code": "INVALID_CREDENTIALS"
}
```

#### Response - Dados Inválidos (400)

```json
{
  "success": false,
  "error": "Telefone inválido. Informe DDD + número (10 ou 11 dígitos).",
  "code": "INVALID_PHONE"
}
```

### 2. Health Check

Verifica se o serviço está funcionando.

```
GET /health
```

#### Response (200)

```json
{
  "status": "healthy",
  "service": "boleto-webhook",
  "version": "1.0.0",
  "time": "2026-01-29T10:30:00Z"
}
```

### 3. Ready Check

Verifica se o serviço está pronto para receber requisições.

```
GET /ready
```

#### Response (200)

```json
{
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

## Campos do Boleto

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único do boleto |
| `nosso_numero` | string | Número do boleto no banco |
| `linha_digitavel` | string | Linha digitável para pagamento |
| `codigo_barras` | string | Código de barras |
| `qr_code` | string | QR Code PIX (para boletos híbridos) |
| `qr_code_url` | string | URL da imagem do QR Code |
| `valor` | number | Valor do boleto |
| `valor_pago` | number | Valor pago (se houver pagamento parcial) |
| `data_emissao` | string | Data de emissão (YYYY-MM-DD) |
| `data_vencimento` | string | Data de vencimento (YYYY-MM-DD) |
| `data_pagamento` | string | Data de pagamento (se pago) |
| `status` | string | Status do boleto |
| `pagador_nome` | string | Nome do pagador |
| `url_boleto` | string | URL para visualizar o boleto |
| `url_pdf` | string | URL para download do PDF |
| `descricao` | string | Descrição/observação |
| `vencido` | boolean | Se o boleto está vencido |
| `dias_vencimento` | number | Dias para vencer (positivo) ou vencido (negativo) |

## Status do Boleto

| Status | Descrição |
|--------|-----------|
| `PENDENTE` | Aguardando pagamento |
| `REGISTRADO` | Registrado no banco |
| `LIQUIDADO` | Pago |
| `VENCIDO` | Vencido sem pagamento |
| `BAIXADO` | Baixado manualmente |
| `PROTESTADO` | Enviado para protesto |
| `NEGATIVADO` | Enviado para negativação |
| `CANCELADO` | Cancelado |

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `INVALID_REQUEST` | Dados da requisição inválidos |
| `INVALID_PHONE` | Telefone em formato inválido |
| `INVALID_PASSWORD` | Senha em formato inválido |
| `USER_NOT_FOUND` | Telefone não cadastrado |
| `INVALID_CREDENTIALS` | Senha incorreta |
| `INTERNAL_ERROR` | Erro interno do servidor |
| `METHOD_NOT_ALLOWED` | Método HTTP não permitido |

## Exemplos de Uso

### cURL

```bash
curl -X POST http://localhost:8081/webhook/boletos/consultar \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "11999998888",
    "senha": "1234"
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:8081/webhook/boletos/consultar', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    telefone: '11999998888',
    senha: '1234'
  })
});

const data = await response.json();

if (data.success) {
  console.log(`Cliente: ${data.cliente}`);
  console.log(`Total de boletos: ${data.total}`);
  
  data.boletos.forEach(boleto => {
    console.log(`- ${boleto.descricao}: R$ ${boleto.valor} (vence em ${boleto.data_vencimento})`);
    console.log(`  Link: ${boleto.url_boleto}`);
    console.log(`  PIX QR Code: ${boleto.qr_code_url}`);
  });
} else {
  console.error(`Erro: ${data.error}`);
}
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:8081/webhook/boletos/consultar',
    json={
        'telefone': '11999998888',
        'senha': '1234'
    }
)

data = response.json()

if data['success']:
    print(f"Cliente: {data['cliente']}")
    for boleto in data['boletos']:
        print(f"- {boleto['descricao']}: R$ {boleto['valor']}")
        print(f"  Link: {boleto['url_boleto']}")
else:
    print(f"Erro: {data['error']}")
```

### PHP

```php
<?php
$ch = curl_init('http://localhost:8081/webhook/boletos/consultar');

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'telefone' => '11999998888',
        'senha' => '1234'
    ])
]);

$response = curl_exec($ch);
$data = json_decode($response, true);

if ($data['success']) {
    echo "Cliente: " . $data['cliente'] . "\n";
    foreach ($data['boletos'] as $boleto) {
        echo "- " . $boleto['descricao'] . ": R$ " . $boleto['valor'] . "\n";
        echo "  Link: " . $boleto['url_boleto'] . "\n";
    }
} else {
    echo "Erro: " . $data['error'] . "\n";
}
```

## Integração com Chatbots

Este webhook é ideal para integração com chatbots (WhatsApp, Telegram, etc):

1. **Fluxo do Chatbot:**
   - Pergunte o telefone do cliente
   - Pergunte os 4 primeiros dígitos do CPF/CNPJ
   - Chame o webhook
   - Apresente os boletos encontrados com links para pagamento

2. **Exemplo de Mensagem:**
   ```
   Olá! Encontrei 2 boletos para você:

   📄 Mensalidade Janeiro/2026
   💰 Valor: R$ 150,00
   📅 Vencimento: 15/02/2026
   🔗 Link: https://...
   📱 PIX: [QR Code]

   📄 Parcela 2/12
   💰 Valor: R$ 200,00
   ⚠️ VENCIDO há 4 dias
   🔗 Link: https://...
   ```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `WEBHOOK_PORT` | 8081 | Porta do servidor |
| `APP_ENV` | development | Ambiente (development/production) |
| `POSTGRES_HOST` | localhost | Host do PostgreSQL |
| `POSTGRES_PORT` | 5433 | Porta do PostgreSQL |
| `POSTGRES_USER` | kamino | Usuário do banco |
| `POSTGRES_PASSWORD` | - | Senha do banco |
| `POSTGRES_DB` | kamino | Nome do banco |
| `POSTGRES_SSLMODE` | disable | Modo SSL |

## Segurança

- A senha são apenas os 4 primeiros dígitos do documento, oferecendo uma camada básica de verificação
- Rate limiting está habilitado (30 requisições por minuto por IP)
- Após 5 tentativas incorretas de senha, o IP é bloqueado por 15 minutos
- Todas as requisições são logadas para auditoria
- CORS está configurado para aceitar requisições de qualquer origem (ajuste em produção)

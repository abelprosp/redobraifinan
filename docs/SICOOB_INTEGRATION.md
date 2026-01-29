# Integração Sicoob - Documentação

## Visão Geral

Esta documentação descreve a integração com a API do Sicoob para emissão de boletos e cobranças PIX.

**Portal de Desenvolvedores:** https://developers.sicoob.com.br/portal/

## Pré-requisitos

1. Conta ativa em uma cooperativa Sicoob
2. Contrato de cobrança bancária
3. Cadastro no Portal de Desenvolvedores Sicoob
4. Credenciais OAuth2 (Client ID e Client Secret)
5. Certificado mTLS para ambiente de produção

## Configuração

### 1. Obter Credenciais

1. Acesse https://developers.sicoob.com.br/portal/
2. Crie uma aplicação
3. Solicite acesso às APIs:
   - Cobrança Bancária (Boletos)
   - PIX
4. Obtenha Client ID e Client Secret

### 2. Configurar no Redobrai Finan

```yaml
# config/sicoob/config.yaml
sicoob:
  client_id: "seu-client-id"
  client_secret: "seu-client-secret"
  numero_contrato: "12345678"
  cooperativa_code: "0001"
  environment: "sandbox"  # ou "production"
  
  # Certificado mTLS (produção)
  cert_path: "/path/to/certificado.crt"
  key_path: "/path/to/chave.key"
```

### 3. Variáveis de Ambiente

```env
# .env
SICOOB_CLIENT_ID=seu-client-id
SICOOB_CLIENT_SECRET=seu-client-secret
SICOOB_NUMERO_CONTRATO=12345678
SICOOB_COOPERATIVA_CODE=0001
SICOOB_ENVIRONMENT=sandbox
SICOOB_CERT_PATH=/path/to/cert.crt
SICOOB_KEY_PATH=/path/to/key.key
SICOOB_CHAVE_PIX=sua-chave@email.com
```

## URLs da API

### Sandbox (Testes)
- **Auth:** `https://sandbox.sicoob.com.br/sicoob/sandbox/oauth/token`
- **API:** `https://sandbox.sicoob.com.br/sicoob/sandbox`

### Produção
- **Auth:** `https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token`
- **API:** `https://api.sicoob.com.br`

## Autenticação OAuth2

```go
// Exemplo de autenticação
data := url.Values{}
data.Set("grant_type", "client_credentials")
data.Set("client_id", clientID)
data.Set("client_secret", clientSecret)
data.Set("scope", "cobranca_boletos_consultar cobranca_boletos_incluir")

// POST para URL de auth
// Header: Content-Type: application/x-www-form-urlencoded
```

### Escopos Disponíveis

| Escopo | Descrição |
|--------|-----------|
| `cobranca_boletos_consultar` | Consultar boletos |
| `cobranca_boletos_incluir` | Emitir boletos |
| `cobranca_boletos_alterar` | Alterar boletos |
| `cobranca_pagadores_consultar` | Consultar pagadores |
| `cob.read` | Consultar cobranças PIX |
| `cob.write` | Criar cobranças PIX |
| `pix.read` | Consultar transações PIX |
| `pix.write` | Criar transações PIX |

## Operações de Boleto

### Criar Boleto

```http
POST /cobranca-bancaria/v2/boletos
Authorization: Bearer {access_token}
Content-Type: application/json
x-sicoob-clientid: {client_id}
```

```json
{
  "numeroContrato": "12345678",
  "modalidadePartilha": 1,
  "valor": 150.00,
  "dataVencimento": "2026-02-15",
  "especieDocumento": "DM",
  "tipoJurosMora": 2,
  "valorJurosMora": 1.0,
  "tipoMulta": 2,
  "valorMulta": 2.0,
  "pagador": {
    "tipoPessoa": "JURIDICA",
    "cpfCnpj": "12345678000199",
    "nome": "Empresa ABC LTDA",
    "endereco": "Av. Paulista, 1000",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01310100"
  },
  "mensagem1": "Não receber após vencimento",
  "gerarPix": true
}
```

**Resposta:**
```json
{
  "nossoNumero": 12345678901234,
  "linhaDigitavel": "75691.12345 67890.123456 78901.234567 1 12340000015000",
  "codigoBarras": "75691123400000150001234567890123456789012345",
  "qrCode": "00020126930014br.gov.bcb.pix...",
  "txId": "sicoob202601281234567890"
}
```

### Consultar Boleto

```http
GET /cobranca-bancaria/v2/boletos?numeroContrato=12345678&nossoNumero=12345678901234
Authorization: Bearer {access_token}
```

### Listar Boletos por Período

```http
GET /cobranca-bancaria/v2/boletos?numeroContrato=12345678&dataInicio=2026-01-01&dataFim=2026-01-31&situacao=EM_ABERTO
Authorization: Bearer {access_token}
```

### Situações de Boleto

| Situação | Descrição |
|----------|-----------|
| `EM_ABERTO` | Boleto pendente de pagamento |
| `BAIXADO` | Boleto baixado (cancelado) |
| `LIQUIDADO` | Boleto pago |

### Baixar Boleto

```http
PATCH /cobranca-bancaria/v2/boletos/{nossoNumero}/baixar
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "numeroContrato": "12345678"
}
```

### Alterar Vencimento

```http
PATCH /cobranca-bancaria/v2/boletos/{nossoNumero}/prorrogacoes
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "numeroContrato": "12345678",
  "dataVencimento": "2026-03-15"
}
```

### Segunda Via (PDF)

```http
GET /cobranca-bancaria/v2/boletos/{nossoNumero}/segunda-via?numeroContrato=12345678
Authorization: Bearer {access_token}
Accept: application/pdf
```

## Operações PIX

### Criar Cobrança PIX

```http
POST /pix/api/v2/cob
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpfCnpj": "12345678901",
    "nome": "João Silva"
  },
  "valor": {
    "original": "150.00"
  },
  "chave": "sua-chave-pix@email.com",
  "solicitacaoPagador": "Pagamento NF 1234"
}
```

**Resposta:**
```json
{
  "txid": "sicoob2026012812345",
  "location": "pix.sicoob.com.br/qr/v2/...",
  "pixCopiaECola": "00020126930014br.gov.bcb.pix...",
  "imagemQrcode": "data:image/png;base64,..."
}
```

### Consultar Cobrança PIX

```http
GET /pix/api/v2/cob/{txid}
Authorization: Bearer {access_token}
```

## Webhooks

### Configurar Webhook

```http
PUT /pix/api/v2/webhook/{chave}
Authorization: Bearer {access_token}
Content-Type: application/json
```

```json
{
  "webhookUrl": "https://seudominio.com/api/webhooks/sicoob"
}
```

### Payload do Webhook

```json
{
  "pix": [
    {
      "endToEndId": "E756912345678901234567890",
      "txid": "sicoob2026012812345",
      "valor": "150.00",
      "horario": "2026-01-28T14:30:00Z",
      "pagador": {
        "cpf": "12345678901",
        "nome": "João Silva"
      }
    }
  ]
}
```

## Tipos de Documento

| Código | Descrição |
|--------|-----------|
| `DM` | Duplicata Mercantil |
| `NP` | Nota Promissória |
| `RC` | Recibo |
| `DS` | Duplicata de Serviço |
| `OUT` | Outros |

## Tipos de Juros e Multa

| Código | Descrição |
|--------|-----------|
| `0` | Isento |
| `1` | Valor Fixo |
| `2` | Percentual |

## Exemplo de Uso (Go)

```go
package main

import (
    "log"
    "time"
    
    sicoob "redobrai/services/integrations/sicoob"
)

func main() {
    // Configurar cliente
    config := sicoob.Config{
        ClientID:       "seu-client-id",
        ClientSecret:   "seu-client-secret",
        NumeroContrato: "12345678",
        Environment:    "sandbox",
        Timeout:        30 * time.Second,
    }
    
    client, err := sicoob.NewClient(config)
    if err != nil {
        log.Fatal(err)
    }
    
    // Autenticar
    if err := client.Authenticate(); err != nil {
        log.Fatal(err)
    }
    
    // Criar boleto
    boleto := &sicoob.Boleto{
        Valor:          150.00,
        DataVencimento: "2026-02-15",
        TipoJurosMora:  2,
        ValorJurosMora: 1.0,
        TipoMulta:      2,
        ValorMulta:     2.0,
        GerarPix:       true,
        Pagador: sicoob.Pessoa{
            TipoPessoa: "JURIDICA",
            CpfCnpj:    "12345678000199",
            Nome:       "Empresa ABC LTDA",
            Endereco:   "Av. Paulista, 1000",
            Cidade:     "São Paulo",
            Uf:         "SP",
            Cep:        "01310100",
        },
        Mensagem1: "Não receber após vencimento",
    }
    
    resp, err := client.CriarBoleto(boleto)
    if err != nil {
        log.Fatal(err)
    }
    
    log.Printf("Boleto criado!")
    log.Printf("Nosso Número: %d", resp.NossoNumero)
    log.Printf("Linha Digitável: %s", resp.LinhaDigitavel)
    log.Printf("QR Code PIX: %s", resp.QrCode)
}
```

## Tratamento de Erros

```go
resp, err := client.CriarBoleto(boleto)
if err != nil {
    if apiErr, ok := err.(*sicoob.APIError); ok {
        log.Printf("Erro API: [%s] %s", apiErr.Codigo, apiErr.Mensagem)
    } else {
        log.Printf("Erro: %v", err)
    }
}
```

### Códigos de Erro Comuns

| Código | Descrição |
|--------|-----------|
| `401` | Token inválido ou expirado |
| `403` | Sem permissão para a operação |
| `404` | Boleto não encontrado |
| `422` | Dados inválidos |
| `500` | Erro interno do servidor |

## Boas Práticas

1. **Cache de Token**: O token OAuth2 tem validade. Armazene e reutilize até expirar.

2. **Retry com Backoff**: Implemente retry exponencial para falhas temporárias.

3. **Idempotência**: Use `seuNumero` como referência para evitar duplicatas.

4. **Logs**: Registre todas as operações para auditoria.

5. **Certificado mTLS**: Em produção, sempre use certificado válido.

6. **Webhook**: Configure webhook para notificações em tempo real.

## Suporte

- **Portal Sicoob:** https://developers.sicoob.com.br/portal/
- **Documentação API:** https://developers.sicoob.com.br/#!/apis
- **Suporte Técnico:** Entre em contato com sua cooperativa

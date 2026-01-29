# KaminoClone

**Plataforma de Gestão Financeira, Liquidez e Pagamentos de Alta Performance**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev)
[![Rust Version](https://img.shields.io/badge/Rust-1.70+-000000?logo=rust)](https://rust-lang.org)

---

## Visão Geral

KaminoClone é uma plataforma empresarial de fintech projetada para integrar o ecossistema TradFi (Bancos/Cartões) com sistemas modernos de alta performance. A arquitetura é construída para ser:

- **Fault-Tolerant**: Zero downtime em transações críticas
- **Hyper Secure**: Compliance com PCI-DSS, LGPD, ISO 27001
- **High Performance**: Milhares de TPS (Transações por Segundo)

## Tech Stack

| Componente | Tecnologia |
|------------|------------|
| Orquestração | Docker Swarm / Kubernetes |
| Message Broker | Apache Kafka |
| Database (OLTP) | PostgreSQL + TimescaleDB |
| Database (OLAP) | ClickHouse |
| Cache | Redis |
| Linguagem Core | Go 1.21+, Rust 1.70+ |
| Linguagem Auxiliar | Node.js 20+, Python 3.11+ |
| API Gateway | Kong |
| Secrets | HashiCorp Vault |
| Observability | Prometheus + Grafana |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                             │
│                         (Mobile / Web / Third-Party)                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      API GATEWAY          │
                    │    (Kong + Rate Limit)    │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
│    Ledger     │        │    Payment    │        │     Card      │
│   Service     │        │    Service    │        │   Service     │
│    (Go)       │        │    (Go)       │        │   (Rust)      │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      APACHE KAFKA       │
                    │   (Event Bus / CQRS)    │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│  PostgreSQL   │       │     Redis     │       │  ClickHouse   │
│ (TimescaleDB) │       │   (Cache)     │       │  (Analytics)  │
└───────────────┘       └───────────────┘       └───────────────┘
```

## Quick Start

### Pré-requisitos

- Docker 24.0+
- Docker Compose 2.20+
- Make (opcional)

### Iniciar Stack de Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/your-org/kaminoclone.git
cd kaminoclone

# Iniciar infraestrutura
docker-compose up -d

# Verificar status
docker-compose ps

# Iniciar com serviços de aplicação
docker-compose --profile services up -d
```

### Acessar Interfaces

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| API Gateway | http://localhost:8000 | - |
| Kong Admin | http://localhost:8001 | - |
| Kafka UI | http://localhost:8090 | - |
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Vault | http://localhost:8200 | Token: kamino-dev-token |
| ClickHouse | http://localhost:8123 | kamino/kamino_analytics |

## Estrutura do Projeto

```
kaminoclone/
├── ARCHITECTURE.md           # Documentação de arquitetura
├── docker-compose.yml        # Stack de desenvolvimento
├── Makefile                  # Comandos úteis
│
├── services/                 # Microserviços
│   ├── ledger-service/       # Go - Core financeiro
│   ├── payment-service/      # Go - Pagamentos
│   ├── card-service/         # Rust - Cartões
│   └── notification-service/ # Node.js - Notificações
│
├── database/                 # Schemas e migrations
│   ├── schema.sql            # Schema PostgreSQL completo
│   └── migrations/           # Migrations versionadas
│
├── analytics/                # ClickHouse e dashboards
│   ├── clickhouse/
│   │   ├── tables.sql        # Tabelas OLAP
│   │   └── alerts.sql        # Sistema de alertas
│   └── grafana/
│       └── dashboards/       # Dashboards JSON
│
├── config/                   # Configurações
│   ├── prometheus/
│   ├── alertmanager/
│   └── vault/
│
└── docs/                     # Documentação
    ├── INTEGRATIONS.md       # Integrações bancárias
    └── SECURITY.md           # Segurança e compliance
```

## Comandos Úteis

```bash
# Infraestrutura
make up                    # Subir stack completa
make down                  # Parar stack
make logs                  # Ver logs
make ps                    # Status dos containers

# Database
make db-migrate           # Executar migrations
make db-seed              # Popular dados de teste
make db-shell             # Conectar ao PostgreSQL

# Kafka
make kafka-topics         # Listar tópicos
make kafka-consume TOPIC=x # Consumir mensagens

# Desenvolvimento
make test                 # Executar testes
make lint                 # Linting
make build                # Build de todos os serviços
```

## Documentação

- [Arquitetura Completa](./ARCHITECTURE.md)
- [Schema do Banco de Dados](./database/schema.sql)
- [Integrações Bancárias](./docs/INTEGRATIONS.md)
- [Segurança e Compliance](./docs/SECURITY.md)
- [Analytics e Alertas](./analytics/clickhouse/alerts.sql)

## Tópicos Kafka

| Tópico | Descrição | Partições |
|--------|-----------|-----------|
| `transactions.events` | Eventos de transações | 12 |
| `payments.intents` | Intenções de pagamento | 12 |
| `payments.processed` | Pagamentos processados | 12 |
| `cards.events` | Eventos de cartões | 6 |
| `cards.authorizations` | Autorizações de cartão | 12 |
| `fraud.events` | Eventos de detecção de fraude | 6 |
| `notifications.outbound` | Notificações para envio | 6 |
| `webhooks.inbound` | Webhooks recebidos | 6 |
| `audit.events` | Eventos de auditoria | 12 |

## Variáveis de Ambiente

```env
# PostgreSQL
POSTGRES_USER=kamino
POSTGRES_PASSWORD=kamino_secure_password
POSTGRES_DB=kamino

# Redis
REDIS_PASSWORD=redis_secure_password

# ClickHouse
CLICKHOUSE_USER=kamino
CLICKHOUSE_PASSWORD=kamino_analytics

# Vault
VAULT_TOKEN=kamino-dev-token

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin

# Aplicação
APP_ENV=development
APP_PORT=8080
```

## Segurança

- **Criptografia em repouso**: AES-256-GCM para todos os dados sensíveis
- **Criptografia em trânsito**: TLS 1.3 obrigatório
- **Autenticação**: OAuth2 + JWT com refresh tokens
- **Autorização**: Open Policy Agent (OPA)
- **Secrets**: HashiCorp Vault
- **Tokenização**: PAN de cartões nunca armazenado em texto plano

## Monitoramento

### Métricas Principais

- TPS (Transações por Segundo)
- Latência P50/P95/P99
- Taxa de erro de APIs
- Taxa de aprovação de cartões
- Consumer lag do Kafka
- Uso de memória/CPU

### Alertas Configurados

- Service Down (Critical)
- High Error Rate > 5% (Critical)
- High Latency P95 > 2s (Warning)
- Transaction Volume Drop > 50% (Critical)
- Kafka Consumer Lag > 10k (Critical)

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**KaminoClone** - Construído para escala, segurança e confiabilidade.
#   r e d o b r a i f i n a n  
 
# ============================================================================
# KAMINOCLONE - MAKEFILE (Windows Compatible)
# ============================================================================

.PHONY: help up down logs ps build test lint clean

# Variáveis
DOCKER_COMPOSE := docker-compose
PROJECT_NAME := kaminoclone

help: ## Mostrar esta ajuda
	@echo "KaminoClone - Comandos Disponiveis"
	@echo ""
	@echo "  up            - Iniciar stack de desenvolvimento"
	@echo "  down          - Parar stack"
	@echo "  logs          - Ver logs de todos os containers"
	@echo "  ps            - Status dos containers"
	@echo "  db-migrate    - Executar migrations PostgreSQL"
	@echo "  db-shell      - Conectar ao PostgreSQL"
	@echo "  ch-migrate    - Executar migrations ClickHouse"
	@echo "  kafka-topics  - Listar topicos Kafka"
	@echo "  redis-cli     - Conectar ao Redis"
	@echo "  status        - Status completo do ambiente"

# ============================================================================
# DOCKER
# ============================================================================

up: ## Iniciar stack de desenvolvimento
	@echo "Iniciando stack..."
	$(DOCKER_COMPOSE) up -d
	@echo "Stack iniciada!"

up-full: ## Iniciar stack completa com serviços
	@echo "Iniciando stack completa..."
	$(DOCKER_COMPOSE) --profile services up -d
	@echo "Stack completa iniciada!"

down: ## Parar stack
	@echo "Parando stack..."
	$(DOCKER_COMPOSE) down

down-clean: ## Parar stack e remover volumes
	@echo "Parando stack e removendo volumes..."
	$(DOCKER_COMPOSE) down -v

restart: down up ## Reiniciar stack

logs: ## Ver logs de todos os containers
	$(DOCKER_COMPOSE) logs -f

logs-service: ## Ver logs de um serviço específico (uso: make logs-service SERVICE=kafka)
	$(DOCKER_COMPOSE) logs -f $(SERVICE)

ps: ## Status dos containers
	$(DOCKER_COMPOSE) ps

# ============================================================================
# DATABASE
# ============================================================================

db-shell: ## Conectar ao PostgreSQL
	@echo "Conectando ao PostgreSQL..."
	docker exec -it kamino-postgres psql -U kamino -d kamino

db-migrate: ## Executar migrations
	@echo "Executando migrations..."
	docker cp database/schema.sql kamino-postgres:/tmp/schema.sql
	docker exec kamino-postgres psql -U kamino -d kamino -f /tmp/schema.sql
	@echo "Migrations executadas!"

db-reset: ## Reset completo do banco (CUIDADO!)
	@echo "Resetando banco de dados..."
	docker exec kamino-postgres psql -U kamino -c "DROP SCHEMA IF EXISTS core, identity, payments, cards, integrations, event_sourcing, audit CASCADE;"
	$(MAKE) db-migrate
	@echo "Banco resetado!"

db-backup: ## Fazer backup do banco
	@echo "Fazendo backup..."
	docker exec kamino-postgres pg_dump -U kamino kamino > backups/kamino_backup.sql
	@echo "Backup criado!"

# ============================================================================
# KAFKA
# ============================================================================

kafka-topics: ## Listar tópicos Kafka
	docker exec kamino-kafka kafka-topics --bootstrap-server localhost:29092 --list

kafka-describe: ## Descrever um tópico (uso: make kafka-describe TOPIC=transactions.events)
	docker exec kamino-kafka kafka-topics --bootstrap-server localhost:29092 --describe --topic $(TOPIC)

kafka-consume: ## Consumir mensagens de um tópico (uso: make kafka-consume TOPIC=transactions.events)
	docker exec kamino-kafka kafka-console-consumer --bootstrap-server localhost:29092 --topic $(TOPIC) --from-beginning

kafka-produce: ## Produzir mensagem para um tópico (uso: make kafka-produce TOPIC=test)
	docker exec -it kamino-kafka kafka-console-producer --bootstrap-server localhost:29092 --topic $(TOPIC)

kafka-groups: ## Listar consumer groups
	docker exec kamino-kafka kafka-consumer-groups --bootstrap-server localhost:29092 --list

kafka-lag: ## Ver lag de um consumer group (uso: make kafka-lag GROUP=ledger-service)
	docker exec kamino-kafka kafka-consumer-groups --bootstrap-server localhost:29092 --describe --group $(GROUP)

# ============================================================================
# REDIS
# ============================================================================

redis-cli: ## Conectar ao Redis CLI
	docker exec -it kamino-redis redis-cli -a redis_secure_password

redis-flush: ## Limpar cache Redis (CUIDADO!)
	docker exec kamino-redis redis-cli -a redis_secure_password FLUSHALL

redis-monitor: ## Monitorar comandos Redis em tempo real
	docker exec kamino-redis redis-cli -a redis_secure_password MONITOR

# ============================================================================
# CLICKHOUSE
# ============================================================================

ch-shell: ## Conectar ao ClickHouse
	docker exec -it kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics

ch-migrate: ## Executar migrations do ClickHouse
	@echo "Executando migrations ClickHouse..."
	docker cp analytics/clickhouse/tables.sql kamino-clickhouse:/tmp/tables.sql
	docker cp analytics/clickhouse/alerts.sql kamino-clickhouse:/tmp/alerts.sql
	docker exec kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics --queries-file /tmp/tables.sql
	docker exec kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics --queries-file /tmp/alerts.sql
	@echo "Migrations ClickHouse executadas!"

# ============================================================================
# VAULT
# ============================================================================

vault-ui: ## Abrir Vault UI
	@echo "Vault UI disponivel em: http://localhost:8200"
	@echo "Token: kamino-dev-token"

vault-init: ## Inicializar secrets no Vault
	@echo "Inicializando secrets no Vault..."
	docker exec kamino-vault vault kv put secret/kamino/stripe api_key=sk_test_xxx secret_key=xxx webhook_secret=whsec_xxx
	docker exec kamino-vault vault kv put secret/kamino/plaid client_id=xxx secret=xxx
	@echo "Secrets inicializados!"

# ============================================================================
# BUILD & TEST
# ============================================================================

build: ## Build de todos os serviços
	@echo "Building services..."
	$(DOCKER_COMPOSE) build

build-service: ## Build de um serviço específico (uso: make build-service SERVICE=ledger-service)
	$(DOCKER_COMPOSE) build $(SERVICE)

test: ## Executar todos os testes
	@echo "Executando testes..."
	cd services/ledger-service && go test ./...
	@echo "Testes concluidos!"

lint: ## Executar linting
	@echo "Executando linting..."
	cd services/ledger-service && golangci-lint run

# ============================================================================
# MONITORING
# ============================================================================

grafana: ## Abrir Grafana
	@echo "Grafana disponivel em: http://localhost:3000"
	@echo "Credenciais: admin/admin"

prometheus: ## Abrir Prometheus
	@echo "Prometheus disponivel em: http://localhost:9090"

alertmanager: ## Abrir Alertmanager
	@echo "Alertmanager disponivel em: http://localhost:9093"

# ============================================================================
# UTILITY
# ============================================================================

clean: ## Limpar arquivos temporários e caches
	@echo "Limpando..."
	@echo "Limpo!"

init: ## Inicialização completa do ambiente
	@echo "Iniciando stack..."
	$(DOCKER_COMPOSE) up -d
	@echo "Aguardando servicos (60 segundos)..."
	@ping -n 61 127.0.0.1 > nul 2>&1 || timeout /t 60 /nobreak > nul 2>&1 || sleep 60
	$(MAKE) db-migrate
	$(MAKE) ch-migrate
	@echo "Ambiente inicializado!"

status: ## Status completo do ambiente
	@echo "=== Status dos Containers ==="
	$(MAKE) ps
	@echo ""
	@echo "=== URLs dos Servicos ==="
	@echo "API Gateway:    http://localhost:8000"
	@echo "Kong Admin:     http://localhost:8001"
	@echo "Kafka UI:       http://localhost:8090"
	@echo "Grafana:        http://localhost:3000"
	@echo "Prometheus:     http://localhost:9090"
	@echo "Vault:          http://localhost:8200"
	@echo "ClickHouse:     http://localhost:8123"

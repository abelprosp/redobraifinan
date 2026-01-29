<# 
.SYNOPSIS
    KaminoClone - Script de Gerenciamento (Windows PowerShell)

.DESCRIPTION
    Script para gerenciar a stack KaminoClone no Windows.
    Alternativa ao Makefile para usuários Windows.

.EXAMPLE
    .\kamino.ps1 up
    .\kamino.ps1 status
    .\kamino.ps1 db-migrate
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('help', 'up', 'down', 'logs', 'ps', 'status', 'init', 
                 'db-migrate', 'db-shell', 'db-reset',
                 'ch-migrate', 'ch-shell',
                 'kafka-topics', 'kafka-ui',
                 'redis-cli', 'vault-ui', 'grafana')]
    [string]$Command = 'help',
    
    [Parameter(Position=1)]
    [string]$Service
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Test-DockerRunning {
    try {
        $null = docker info 2>&1
        return $true
    } catch {
        return $false
    }
}

function Show-Help {
    Write-Host ""
    Write-Host "KaminoClone - Comandos Disponiveis" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Uso: .\kamino.ps1 <comando>" -ForegroundColor White
    Write-Host ""
    Write-Host "  Comandos de Stack:" -ForegroundColor Yellow
    Write-Host "    up           Iniciar todos os containers"
    Write-Host "    down         Parar todos os containers"
    Write-Host "    logs         Ver logs (Ctrl+C para sair)"
    Write-Host "    ps           Status dos containers"
    Write-Host "    status       Status completo + URLs"
    Write-Host "    init         Inicializacao completa"
    Write-Host ""
    Write-Host "  Banco de Dados (PostgreSQL):" -ForegroundColor Yellow
    Write-Host "    db-migrate   Executar migrations"
    Write-Host "    db-shell     Conectar ao PostgreSQL"
    Write-Host "    db-reset     Reset completo (CUIDADO!)"
    Write-Host ""
    Write-Host "  ClickHouse:" -ForegroundColor Yellow
    Write-Host "    ch-migrate   Executar migrations"
    Write-Host "    ch-shell     Conectar ao ClickHouse"
    Write-Host ""
    Write-Host "  Kafka:" -ForegroundColor Yellow
    Write-Host "    kafka-topics Listar topicos"
    Write-Host "    kafka-ui     Abrir Kafka UI no browser"
    Write-Host ""
    Write-Host "  Outros:" -ForegroundColor Yellow
    Write-Host "    redis-cli    Conectar ao Redis"
    Write-Host "    vault-ui     Info do Vault"
    Write-Host "    grafana      Info do Grafana"
    Write-Host ""
}

function Start-Stack {
    Write-Header "Iniciando Stack KaminoClone"
    
    if (-not (Test-DockerRunning)) {
        Write-Host "ERRO: Docker nao esta rodando!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor:" -ForegroundColor Yellow
        Write-Host "  1. Abra o Docker Desktop"
        Write-Host "  2. Aguarde ele iniciar completamente"
        Write-Host "  3. Execute este comando novamente"
        Write-Host ""
        return
    }
    
    docker-compose up -d
    Write-Success "Stack iniciada!"
    Write-Host ""
    Write-Host "Aguarde alguns segundos para os servicos iniciarem."
    Write-Host "Use '.\kamino.ps1 status' para verificar."
}

function Stop-Stack {
    Write-Header "Parando Stack"
    docker-compose down
    Write-Success "Stack parada!"
}

function Show-Logs {
    Write-Header "Logs dos Containers (Ctrl+C para sair)"
    docker-compose logs -f
}

function Show-Ps {
    docker-compose ps
}

function Show-Status {
    Write-Header "Status dos Containers"
    
    if (-not (Test-DockerRunning)) {
        Write-Host "Docker nao esta rodando!" -ForegroundColor Red
        return
    }
    
    docker-compose ps
    
    Write-Host ""
    Write-Header "URLs dos Servicos"
    Write-Host "  API Gateway:    http://localhost:8000"
    Write-Host "  Kong Admin:     http://localhost:8001"
    Write-Host "  Kafka UI:       http://localhost:8090"
    Write-Host "  Grafana:        http://localhost:3000  (admin/admin)"
    Write-Host "  Prometheus:     http://localhost:9090"
    Write-Host "  Vault:          http://localhost:8200  (token: kamino-dev-token)"
    Write-Host "  ClickHouse:     http://localhost:8123"
    Write-Host "  PostgreSQL:     localhost:5432        (kamino/kamino_secure_password)"
    Write-Host "  Redis:          localhost:6379"
    Write-Host ""
}

function Initialize-Stack {
    Write-Header "Inicializacao Completa do KaminoClone"
    
    if (-not (Test-DockerRunning)) {
        Write-Host "ERRO: Docker nao esta rodando!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, inicie o Docker Desktop primeiro." -ForegroundColor Yellow
        return
    }
    
    # Criar diretorios necessarios
    Write-Host "Criando diretorios..." -ForegroundColor Gray
    New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    New-Item -ItemType Directory -Force -Path "data\kong-db" | Out-Null
    
    # Iniciar stack
    Write-Host "Iniciando containers..." -ForegroundColor Gray
    docker-compose up -d
    
    # Aguardar
    Write-Warning "Aguardando servicos iniciarem (60 segundos)..."
    Start-Sleep -Seconds 60
    
    # Migrations
    Write-Host "Executando migrations PostgreSQL..." -ForegroundColor Gray
    Invoke-DbMigrate
    
    Write-Host "Executando migrations ClickHouse..." -ForegroundColor Gray
    Invoke-ChMigrate
    
    Write-Success "Ambiente inicializado com sucesso!"
    Write-Host ""
    Show-Status
}

function Invoke-DbMigrate {
    Write-Header "Executando Migrations PostgreSQL"
    
    # Copiar arquivo para o container
    docker cp database/schema.sql kamino-postgres:/tmp/schema.sql
    
    # Executar migrations
    docker exec kamino-postgres psql -U kamino -d kamino -f /tmp/schema.sql
    
    Write-Success "Migrations PostgreSQL executadas!"
}

function Invoke-DbShell {
    Write-Header "Conectando ao PostgreSQL"
    Write-Host "Use \q para sair" -ForegroundColor Gray
    docker exec -it kamino-postgres psql -U kamino -d kamino
}

function Invoke-DbReset {
    Write-Warning "ATENCAO: Isso vai apagar todos os dados!"
    $confirm = Read-Host "Digite 'SIM' para confirmar"
    
    if ($confirm -eq "SIM") {
        Write-Header "Resetando Banco de Dados"
        docker exec kamino-postgres psql -U kamino -c "DROP SCHEMA IF EXISTS core, identity, payments, cards, integrations, event_sourcing, audit CASCADE;"
        Invoke-DbMigrate
        Write-Success "Banco resetado!"
    } else {
        Write-Host "Operacao cancelada."
    }
}

function Invoke-ChMigrate {
    Write-Header "Executando Migrations ClickHouse"
    
    # Copiar arquivos
    docker cp analytics/clickhouse/tables.sql kamino-clickhouse:/tmp/tables.sql
    docker cp analytics/clickhouse/alerts.sql kamino-clickhouse:/tmp/alerts.sql
    
    # Executar
    docker exec kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics --queries-file /tmp/tables.sql
    docker exec kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics --queries-file /tmp/alerts.sql
    
    Write-Success "Migrations ClickHouse executadas!"
}

function Invoke-ChShell {
    Write-Header "Conectando ao ClickHouse"
    docker exec -it kamino-clickhouse clickhouse-client -u kamino --password kamino_analytics
}

function Show-KafkaTopics {
    Write-Header "Topicos Kafka"
    docker exec kamino-kafka kafka-topics --bootstrap-server localhost:29092 --list
}

function Open-KafkaUI {
    Write-Header "Kafka UI"
    Write-Host "Abrindo http://localhost:8090 no browser..."
    Start-Process "http://localhost:8090"
}

function Invoke-RedisCli {
    Write-Header "Conectando ao Redis"
    Write-Host "Use 'exit' para sair" -ForegroundColor Gray
    docker exec -it kamino-redis redis-cli -a redis_secure_password
}

function Show-VaultInfo {
    Write-Header "Vault"
    Write-Host "URL:   http://localhost:8200"
    Write-Host "Token: kamino-dev-token"
    Write-Host ""
    Write-Host "Para abrir no browser, acesse a URL acima."
}

function Show-GrafanaInfo {
    Write-Header "Grafana"
    Write-Host "URL:      http://localhost:3000"
    Write-Host "Usuario:  admin"
    Write-Host "Senha:    admin"
    Write-Host ""
    Start-Process "http://localhost:3000"
}

# Main
switch ($Command) {
    'help'         { Show-Help }
    'up'           { Start-Stack }
    'down'         { Stop-Stack }
    'logs'         { Show-Logs }
    'ps'           { Show-Ps }
    'status'       { Show-Status }
    'init'         { Initialize-Stack }
    'db-migrate'   { Invoke-DbMigrate }
    'db-shell'     { Invoke-DbShell }
    'db-reset'     { Invoke-DbReset }
    'ch-migrate'   { Invoke-ChMigrate }
    'ch-shell'     { Invoke-ChShell }
    'kafka-topics' { Show-KafkaTopics }
    'kafka-ui'     { Open-KafkaUI }
    'redis-cli'    { Invoke-RedisCli }
    'vault-ui'     { Show-VaultInfo }
    'grafana'      { Show-GrafanaInfo }
    default        { Show-Help }
}

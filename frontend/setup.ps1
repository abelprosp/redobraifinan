# ============================================================================
# REDOBRAI FINAN - SCRIPT DE SETUP
# Execute como Administrador
# ============================================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  REDOBRAI FINAN - SETUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está disponível
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  OK: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERRO: Docker nao encontrado!" -ForegroundColor Red
    Write-Host "  Certifique-se de que o Docker Desktop esta rodando." -ForegroundColor Red
    exit 1
}

# Verificar containers rodando
Write-Host ""
Write-Host "[2/6] Verificando containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}"
if ($containers -match "kamino-postgres") {
    Write-Host "  OK: PostgreSQL rodando" -ForegroundColor Green
} else {
    Write-Host "  AVISO: PostgreSQL nao esta rodando. Iniciando..." -ForegroundColor Yellow
    Set-Location ..
    docker compose up -d postgres
    Write-Host "  Aguardando PostgreSQL iniciar (30s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    Set-Location frontend
}

# Testar conexão com PostgreSQL
Write-Host ""
Write-Host "[3/6] Testando conexao com PostgreSQL..." -ForegroundColor Yellow
try {
    $testResult = docker exec kamino-postgres pg_isready -U kamino -d kamino 2>&1
    if ($testResult -match "accepting connections") {
        Write-Host "  OK: PostgreSQL aceitando conexoes" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: PostgreSQL ainda inicializando..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "  ERRO: Nao foi possivel conectar ao PostgreSQL" -ForegroundColor Red
}

# Gerar cliente Prisma
Write-Host ""
Write-Host "[4/6] Gerando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Cliente Prisma gerado" -ForegroundColor Green
} else {
    Write-Host "  ERRO ao gerar cliente Prisma" -ForegroundColor Red
}

# Criar tabelas
Write-Host ""
Write-Host "[5/6] Criando tabelas no banco..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Tabelas criadas" -ForegroundColor Green
} else {
    Write-Host "  ERRO ao criar tabelas" -ForegroundColor Red
    Write-Host "  Verifique se a DATABASE_URL esta correta no .env" -ForegroundColor Yellow
    exit 1
}

# Seed
Write-Host ""
Write-Host "[6/6] Populando dados de teste..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Dados de teste criados" -ForegroundColor Green
} else {
    Write-Host "  AVISO: Seed pode ter falhado (dados ja existem?)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o servidor:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Acesse: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login:" -ForegroundColor Cyan
Write-Host "  Email: admin@redobrai.com.br" -ForegroundColor White
Write-Host "  Senha: admin123" -ForegroundColor White
Write-Host ""

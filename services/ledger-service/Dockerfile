# ============================================================================
# KAMINOCLONE - LEDGER SERVICE DOCKERFILE
# Multi-stage build otimizado para produção
# ============================================================================

# =============================================================================
# STAGE 1: Build
# =============================================================================
FROM golang:1.21-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache git ca-certificates tzdata

# Configurar ambiente Go
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# Criar diretório de trabalho
WORKDIR /build

# Copiar go.mod e go.sum primeiro (cache de dependências)
COPY go.mod go.sum ./

# Download de dependências
RUN go mod download && go mod verify

# Copiar código fonte
COPY . .

# Build da aplicação
RUN go build \
    -ldflags="-w -s -X main.Version=${VERSION:-dev} -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o /app/ledger-service \
    ./cmd/server

# =============================================================================
# STAGE 2: Runtime
# =============================================================================
FROM alpine:3.18 AS runtime

# Labels
LABEL maintainer="KaminoClone Team <team@kamino.io>" \
      version="1.0.0" \
      description="Ledger Service - Core Financial Engine"

# Instalar dependências de runtime
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para segurança
RUN addgroup -S kamino && adduser -S kamino -G kamino

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/config && \
    chown -R kamino:kamino /app

# Copiar binário do builder
COPY --from=builder /app/ledger-service /app/ledger-service

# Copiar arquivos de configuração
COPY --from=builder /build/config /app/config

# Copiar certificados
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Definir timezone
ENV TZ=America/Sao_Paulo

# Mudar para usuário não-root
USER kamino

# Expor porta
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Diretório de trabalho
WORKDIR /app

# Entrypoint
ENTRYPOINT ["/app/ledger-service"]

# Comando padrão
CMD ["serve"]

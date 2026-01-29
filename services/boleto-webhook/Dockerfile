# ============================================================================
# BOLETO WEBHOOK SERVICE - DOCKERFILE
# ============================================================================

# Build stage
FROM golang:1.21-alpine AS builder

# Instalar certificados e git
RUN apk add --no-cache ca-certificates git

WORKDIR /app

# Copiar go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fonte
COPY . .

# Build com otimizações
ARG VERSION=dev
ARG BUILD_TIME=unknown

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME}" \
    -o /app/boleto-webhook \
    ./cmd/server

# Runtime stage
FROM alpine:3.19

# Instalar certificados CA
RUN apk --no-cache add ca-certificates tzdata

# Criar usuário não-root
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copiar binário do builder
COPY --from=builder /app/boleto-webhook .

# Mudar ownership
RUN chown -R appuser:appgroup /app

# Usar usuário não-root
USER appuser

# Expor porta
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/health || exit 1

# Entrypoint
ENTRYPOINT ["./boleto-webhook"]

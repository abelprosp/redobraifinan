// ============================================================================
// KAMINOCLONE - BOLETO WEBHOOK SERVICE
// Serviço de consulta de boletos via webhook com autenticação por telefone
// ============================================================================

package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

// Build info (injetado no build)
var (
	Version   = "dev"
	BuildTime = "unknown"
)

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

type Config struct {
	// Server
	Port string
	Env  string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Rate limiting
	RateLimitPerMinute int
	MaxAttempts        int    // Máximo de tentativas de senha incorreta
	LockDuration       string // Duração do bloqueio após tentativas excedidas
}

func loadConfig() *Config {
	return &Config{
		Port: getEnv("WEBHOOK_PORT", "8081"),
		Env:  getEnv("APP_ENV", "development"),

		DBHost:     getEnv("POSTGRES_HOST", "localhost"),
		DBPort:     getEnv("POSTGRES_PORT", "5433"),
		DBUser:     getEnv("POSTGRES_USER", "kamino"),
		DBPassword: getEnv("POSTGRES_PASSWORD", "kamino_secure_password"),
		DBName:     getEnv("POSTGRES_DB", "kamino"),
		DBSSLMode:  getEnv("POSTGRES_SSLMODE", "disable"),

		RateLimitPerMinute: 30,
		MaxAttempts:        5,
		LockDuration:       "15m",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ============================================================================
// MODELOS
// ============================================================================

// ConsultaBoletoRequest requisição para consultar boletos
type ConsultaBoletoRequest struct {
	Telefone string `json:"telefone" binding:"required"` // Telefone do cliente (apenas números)
	Senha    string `json:"senha" binding:"required"`    // Primeiros 4 dígitos do CPF/CNPJ
}

// BoletoResponse resposta com dados do boleto
type BoletoResponse struct {
	ID              string   `json:"id"`
	NossoNumero     string   `json:"nosso_numero"`
	LinhaDigitavel  string   `json:"linha_digitavel,omitempty"`
	CodigoBarras    string   `json:"codigo_barras,omitempty"`
	QRCode          string   `json:"qr_code,omitempty"`
	QRCodeURL       string   `json:"qr_code_url,omitempty"`
	Valor           float64  `json:"valor"`
	ValorPago       *float64 `json:"valor_pago,omitempty"`
	DataEmissao     string   `json:"data_emissao"`
	DataVencimento  string   `json:"data_vencimento"`
	DataPagamento   *string  `json:"data_pagamento,omitempty"`
	Status          string   `json:"status"`
	PagadorNome     string   `json:"pagador_nome"`
	URLBoleto       string   `json:"url_boleto,omitempty"`
	URLPDF          string   `json:"url_pdf,omitempty"`
	Descricao       string   `json:"descricao,omitempty"`
	Vencido         bool     `json:"vencido"`
	DiasVencimento  int      `json:"dias_vencimento"` // Positivo = dias para vencer, Negativo = dias vencido
}

// ConsultaBoletoResponse resposta da consulta de boletos
type ConsultaBoletoResponse struct {
	Success  bool              `json:"success"`
	Message  string            `json:"message"`
	Cliente  string            `json:"cliente,omitempty"`
	Total    int               `json:"total,omitempty"`
	Boletos  []BoletoResponse  `json:"boletos,omitempty"`
}

// ErrorResponse resposta de erro
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
}

// ============================================================================
// APLICAÇÃO
// ============================================================================

type App struct {
	config *Config
	db     *sql.DB
	logger *zap.SugaredLogger
}

func NewApp(config *Config, logger *zap.SugaredLogger) (*App, error) {
	// Conectar ao banco de dados
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.DBHost, config.DBPort, config.DBUser,
		config.DBPassword, config.DBName, config.DBSSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar ao banco: %w", err)
	}

	// Configurar pool de conexões
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Testar conexão
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("erro ao pingar banco: %w", err)
	}

	return &App{
		config: config,
		db:     db,
		logger: logger,
	}, nil
}

func (a *App) Close() error {
	return a.db.Close()
}

// ============================================================================
// HANDLERS
// ============================================================================

// consultarBoletos endpoint para consultar boletos por telefone e senha
func (a *App) consultarBoletos(c *gin.Context) {
	var req ConsultaBoletoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Error:   "Dados inválidos. Informe telefone e senha.",
			Code:    "INVALID_REQUEST",
		})
		return
	}

	// Normalizar telefone (remover caracteres não numéricos)
	telefone := normalizarTelefone(req.Telefone)
	if len(telefone) < 10 || len(telefone) > 11 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Error:   "Telefone inválido. Informe DDD + número (10 ou 11 dígitos).",
			Code:    "INVALID_PHONE",
		})
		return
	}

	// Validar senha (deve ter exatamente 4 dígitos)
	senha := strings.TrimSpace(req.Senha)
	if len(senha) != 4 || !isNumeric(senha) {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Error:   "Senha inválida. Informe os 4 primeiros dígitos do seu CPF ou CNPJ.",
			Code:    "INVALID_PASSWORD",
		})
		return
	}

	// Buscar usuário pelo telefone
	usuario, err := a.buscarUsuarioPorTelefone(c.Request.Context(), telefone)
	if err != nil {
		a.logger.Errorw("Erro ao buscar usuário", "telefone", telefone, "error", err)
		c.JSON(http.StatusNotFound, ErrorResponse{
			Success: false,
			Error:   "Telefone não encontrado no sistema.",
			Code:    "USER_NOT_FOUND",
		})
		return
	}

	// Validar senha (primeiros 4 dígitos do documento)
	if !a.validarSenha(senha, usuario.DocumentoHash, usuario.DocumentoPrimeiros4) {
		a.logger.Warnw("Senha incorreta", "telefone", telefone)
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Success: false,
			Error:   "Senha incorreta. A senha são os 4 primeiros dígitos do seu CPF ou CNPJ.",
			Code:    "INVALID_CREDENTIALS",
		})
		return
	}

	// Buscar boletos do usuário
	boletos, err := a.buscarBoletosPorUsuario(c.Request.Context(), usuario.ID)
	if err != nil {
		a.logger.Errorw("Erro ao buscar boletos", "user_id", usuario.ID, "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Error:   "Erro ao buscar boletos. Tente novamente.",
			Code:    "INTERNAL_ERROR",
		})
		return
	}

	// Montar resposta
	response := ConsultaBoletoResponse{
		Success: true,
		Message: "Boletos encontrados com sucesso",
		Cliente: usuario.Nome,
		Total:   len(boletos),
		Boletos: boletos,
	}

	if len(boletos) == 0 {
		response.Message = "Nenhum boleto encontrado para este cliente"
	}

	c.JSON(http.StatusOK, response)
}

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

type Usuario struct {
	ID                  string
	Nome                string
	Telefone            string
	DocumentoHash       string
	DocumentoPrimeiros4 string // Cache dos primeiros 4 dígitos (em ambiente de produção, não armazenar)
}

// ============================================================================
// QUERIES
// ============================================================================

// buscarUsuarioPorTelefone busca um usuário pelo número de telefone
func (a *App) buscarUsuarioPorTelefone(ctx context.Context, telefone string) (*Usuario, error) {
	query := `
		SELECT 
			u.id,
			COALESCE(up.first_name_encrypted, '') || ' ' || COALESCE(up.last_name_encrypted, '') as nome,
			u.phone_number,
			COALESCE(up.tax_id_hash, '') as tax_id_hash,
			COALESCE(LEFT(up.tax_id_encrypted, 4), '') as primeiros_4
		FROM identity.users u
		LEFT JOIN identity.user_profiles up ON u.id = up.user_id
		WHERE u.phone_number = $1
		  AND u.deleted_at IS NULL
		LIMIT 1
	`

	var usuario Usuario
	err := a.db.QueryRowContext(ctx, query, telefone).Scan(
		&usuario.ID,
		&usuario.Nome,
		&usuario.Telefone,
		&usuario.DocumentoHash,
		&usuario.DocumentoPrimeiros4,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("usuário não encontrado")
	}
	if err != nil {
		return nil, err
	}

	return &usuario, nil
}

// buscarBoletosPorUsuario busca todos os boletos de um usuário
func (a *App) buscarBoletosPorUsuario(ctx context.Context, userID string) ([]BoletoResponse, error) {
	query := `
		SELECT 
			id,
			nosso_numero,
			COALESCE(linha_digitavel, '') as linha_digitavel,
			COALESCE(codigo_barras, '') as codigo_barras,
			COALESCE(qr_code, '') as qr_code,
			COALESCE(qr_code_url, '') as qr_code_url,
			valor,
			valor_pago,
			data_emissao,
			data_vencimento,
			data_pagamento,
			status::text as status,
			pagador_nome,
			COALESCE(url_boleto, '') as url_boleto,
			COALESCE(url_pdf, '') as url_pdf,
			COALESCE(descricao, '') as descricao,
			CURRENT_DATE - data_vencimento as dias_vencido
		FROM payments.boletos
		WHERE user_id = $1
		  AND status NOT IN ('CANCELADO', 'BAIXADO')
		ORDER BY 
			CASE WHEN status = 'PENDENTE' THEN 0 ELSE 1 END,
			data_vencimento ASC
	`

	rows, err := a.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boletos []BoletoResponse
	for rows.Next() {
		var b BoletoResponse
		var valorPago sql.NullFloat64
		var dataPagamento sql.NullString
		var diasVencido int

		err := rows.Scan(
			&b.ID,
			&b.NossoNumero,
			&b.LinhaDigitavel,
			&b.CodigoBarras,
			&b.QRCode,
			&b.QRCodeURL,
			&b.Valor,
			&valorPago,
			&b.DataEmissao,
			&b.DataVencimento,
			&dataPagamento,
			&b.Status,
			&b.PagadorNome,
			&b.URLBoleto,
			&b.URLPDF,
			&b.Descricao,
			&diasVencido,
		)
		if err != nil {
			return nil, err
		}

		if valorPago.Valid {
			b.ValorPago = &valorPago.Float64
		}
		if dataPagamento.Valid {
			b.DataPagamento = &dataPagamento.String
		}

		b.Vencido = diasVencido > 0
		b.DiasVencimento = -diasVencido // Positivo = dias para vencer

		boletos = append(boletos, b)
	}

	return boletos, rows.Err()
}

// validarSenha valida se a senha informada corresponde aos primeiros 4 dígitos do documento
func (a *App) validarSenha(senhaInformada, documentoHash, documentoPrimeiros4 string) bool {
	// Opção 1: Comparar diretamente com os primeiros 4 dígitos armazenados
	// (para ambiente de desenvolvimento/teste)
	if documentoPrimeiros4 != "" && senhaInformada == documentoPrimeiros4 {
		return true
	}

	// Opção 2: Gerar hash da senha + salt e comparar
	// Em produção, você pode usar bcrypt ou similar
	senhaHash := generateHash(senhaInformada)
	return strings.HasPrefix(documentoHash, senhaHash)
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

func normalizarTelefone(telefone string) string {
	var resultado strings.Builder
	for _, c := range telefone {
		if c >= '0' && c <= '9' {
			resultado.WriteRune(c)
		}
	}
	return resultado.String()
}

func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func generateHash(s string) string {
	hash := sha256.Sum256([]byte(s))
	return hex.EncodeToString(hash[:])
}

func generateRequestID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// ============================================================================
// MIDDLEWARES
// ============================================================================

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func LoggingMiddleware(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		logger.Infow("request",
			"request_id", c.GetString("request_id"),
			"method", c.Request.Method,
			"path", path,
			"status", statusCode,
			"latency_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Request-ID")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ============================================================================
// MAIN
// ============================================================================

func main() {
	// Inicializar logger
	logger, _ := zap.NewProduction()
	if os.Getenv("APP_ENV") == "development" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	sugar := logger.Sugar()
	sugar.Infow("Iniciando Boleto Webhook Service",
		"version", Version,
		"build_time", BuildTime,
	)

	// Carregar configuração
	cfg := loadConfig()

	// Criar aplicação
	app, err := NewApp(cfg, sugar)
	if err != nil {
		sugar.Fatalw("Erro ao criar aplicação", "error", err)
	}
	defer app.Close()

	// Configurar Gin
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middlewares
	router.Use(gin.Recovery())
	router.Use(RequestIDMiddleware())
	router.Use(LoggingMiddleware(sugar))
	router.Use(CORSMiddleware())

	// Health checks
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "boleto-webhook",
			"version": Version,
			"time":    time.Now().UTC(),
		})
	})

	router.GET("/ready", func(c *gin.Context) {
		// Verificar conexão com banco
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		dbStatus := "ok"
		if err := app.db.PingContext(ctx); err != nil {
			dbStatus = "error"
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "ready",
			"checks": gin.H{
				"database": dbStatus,
			},
		})
	})

	// Metrics
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API de Webhook para consulta de boletos
	webhook := router.Group("/webhook")
	{
		// POST /webhook/boletos/consultar
		// Consulta boletos por telefone e senha (primeiros 4 dígitos do CPF/CNPJ)
		webhook.POST("/boletos/consultar", app.consultarBoletos)
		
		// GET /webhook/boletos/consultar (para facilitar testes)
		webhook.GET("/boletos/consultar", func(c *gin.Context) {
			c.JSON(http.StatusMethodNotAllowed, ErrorResponse{
				Success: false,
				Error:   "Use o método POST para consultar boletos",
				Code:    "METHOD_NOT_ALLOWED",
			})
		})
	}

	// Documentação da API
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service":     "Boleto Webhook Service",
			"version":     Version,
			"description": "API para consulta de boletos via webhook",
			"endpoints": gin.H{
				"POST /webhook/boletos/consultar": gin.H{
					"description": "Consulta boletos por telefone e senha",
					"body": gin.H{
						"telefone": "Número do telefone (DDD + número)",
						"senha":    "Primeiros 4 dígitos do CPF ou CNPJ",
					},
					"example": gin.H{
						"telefone": "11999998888",
						"senha":    "1234",
					},
				},
			},
		})
	})

	// Criar servidor HTTP
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Canal para shutdown graceful
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Iniciar servidor em goroutine
	go func() {
		sugar.Infow("Servidor iniciado", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("Erro ao iniciar servidor", "error", err)
		}
	}()

	// Aguardar sinal de shutdown
	<-quit
	sugar.Info("Desligando servidor...")

	// Contexto com timeout para shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		sugar.Fatalw("Servidor forçado a desligar", "error", err)
	}

	sugar.Info("Servidor encerrado com sucesso")
}

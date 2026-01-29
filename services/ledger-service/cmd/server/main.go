// ============================================================================
// KAMINOCLONE - LEDGER SERVICE
// Core Financial Engine - Double-Entry Bookkeeping
// ============================================================================

package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

// Build info (injetado no build)
var (
	Version   = "dev"
	BuildTime = "unknown"
)

// Config representa a configuração da aplicação
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

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string

	// Kafka
	KafkaBrokers string
	KafkaGroupID string

	// Vault
	VaultAddr  string
	VaultToken string
}

func loadConfig() *Config {
	return &Config{
		Port: getEnv("APP_PORT", "8080"),
		Env:  getEnv("APP_ENV", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "kamino"),
		DBPassword: getEnv("DB_PASSWORD", "kamino_secure_password"),
		DBName:     getEnv("DB_NAME", "kamino"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		KafkaBrokers: getEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaGroupID: getEnv("KAFKA_GROUP_ID", "ledger-service"),

		VaultAddr:  getEnv("VAULT_ADDR", "http://localhost:8200"),
		VaultToken: getEnv("VAULT_TOKEN", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Inicializar logger
	logger, _ := zap.NewProduction()
	if os.Getenv("APP_ENV") == "development" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	sugar := logger.Sugar()
	sugar.Infow("Starting Ledger Service",
		"version", Version,
		"build_time", BuildTime,
	)

	// Carregar configuração
	cfg := loadConfig()

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
	router.GET("/health", healthHandler)
	router.GET("/ready", readyHandler)

	// Metrics
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1
	v1 := router.Group("/v1")
	{
		// Accounts
		accounts := v1.Group("/accounts")
		{
			accounts.GET("", listAccountsHandler)
			accounts.POST("", createAccountHandler)
			accounts.GET("/:id", getAccountHandler)
			accounts.GET("/:id/balance", getBalanceHandler)
			accounts.GET("/:id/transactions", listTransactionsHandler)
		}

		// Transactions
		transactions := v1.Group("/transactions")
		{
			transactions.POST("", createTransactionHandler)
			transactions.GET("/:id", getTransactionHandler)
			transactions.POST("/:id/reverse", reverseTransactionHandler)
		}

		// Ledger entries
		ledger := v1.Group("/ledger")
		{
			ledger.GET("/entries", listEntriesHandler)
			ledger.GET("/balance-check", balanceCheckHandler)
		}
	}

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
		sugar.Infow("Server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("Server failed to start", "error", err)
		}
	}()

	// Aguardar sinal de shutdown
	<-quit
	sugar.Info("Shutting down server...")

	// Contexto com timeout para shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		sugar.Fatalw("Server forced to shutdown", "error", err)
	}

	sugar.Info("Server exited gracefully")
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
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Request-ID, X-Idempotency-Key")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ============================================================================
// HANDLERS (Placeholder implementations)
// ============================================================================

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"version": Version,
		"time":    time.Now().UTC(),
	})
}

func readyHandler(c *gin.Context) {
	// TODO: Verificar conexões com DB, Redis, Kafka
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
		"checks": gin.H{
			"database": "ok",
			"redis":    "ok",
			"kafka":    "ok",
		},
	})
}

func listAccountsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"accounts": []interface{}{}})
}

func createAccountHandler(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"message": "Account created"})
}

func getAccountHandler(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func getBalanceHandler(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"account_id":        id,
		"balance":           0,
		"available_balance": 0,
		"currency":          "BRL",
	})
}

func listTransactionsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"transactions": []interface{}{}})
}

func createTransactionHandler(c *gin.Context) {
	// Verificar idempotency key
	idempotencyKey := c.GetHeader("X-Idempotency-Key")
	if idempotencyKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Idempotency-Key header is required"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"transaction_id":  generateRequestID(),
		"idempotency_key": idempotencyKey,
		"status":          "PENDING",
	})
}

func getTransactionHandler(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"id": id, "status": "COMPLETED"})
}

func reverseTransactionHandler(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusAccepted, gin.H{
		"original_transaction_id": id,
		"reversal_transaction_id": generateRequestID(),
		"status":                  "PENDING",
	})
}

func listEntriesHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"entries": []interface{}{}})
}

func balanceCheckHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"balanced":     true,
		"total_debits": 0,
		"total_credits": 0,
	})
}

// ============================================================================
// HELPERS
// ============================================================================

func generateRequestID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

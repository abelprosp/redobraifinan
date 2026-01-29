-- ============================================================================
-- KAMINOCLONE - SISTEMA DE ALERTAS EM TEMPO REAL (CLICKHOUSE)
-- Versão: 1.0.0
-- Descrição: Views e queries para alertas automáticos
-- ============================================================================

USE kamino_metrics;

-- ============================================================================
-- TABELA DE THRESHOLDS DE ALERTA
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_thresholds
(
    alert_name LowCardinality(String),
    metric_name LowCardinality(String),
    
    -- Thresholds
    warning_threshold Float64,
    critical_threshold Float64,
    
    -- Configuração
    comparison LowCardinality(String),  -- 'gt', 'lt', 'eq', 'gte', 'lte'
    window_minutes UInt16,
    
    -- Metadados
    description String,
    runbook_url String,
    severity LowCardinality(String),  -- 'warning', 'critical', 'page'
    
    is_enabled UInt8 DEFAULT 1,
    
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (alert_name);

-- Inserir thresholds padrão
INSERT INTO alert_thresholds VALUES
    ('high_error_rate', 'api_error_rate', 0.05, 0.15, 'gt', 5, 'Taxa de erro de APIs acima do normal', '/runbooks/api-errors', 'critical', 1, now(), now()),
    ('high_latency_p95', 'api_latency_p95', 500, 2000, 'gt', 5, 'Latência P95 acima do threshold', '/runbooks/high-latency', 'warning', 1, now(), now()),
    ('low_transaction_volume', 'transactions_per_minute', 100, 50, 'lt', 5, 'Volume de transações abaixo do esperado', '/runbooks/low-volume', 'critical', 1, now(), now()),
    ('high_decline_rate', 'card_decline_rate', 0.15, 0.30, 'gt', 15, 'Taxa de recusa de cartões elevada', '/runbooks/card-declines', 'warning', 1, now(), now()),
    ('high_fraud_score', 'avg_fraud_score', 0.6, 0.8, 'gt', 10, 'Score de fraude médio elevado', '/runbooks/fraud-alerts', 'page', 1, now(), now()),
    ('provider_down', 'provider_success_rate', 0.95, 0.80, 'lt', 3, 'Provider com disponibilidade baixa', '/runbooks/provider-failover', 'page', 1, now(), now());

-- ============================================================================
-- TABELA DE ALERTAS DISPARADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts_fired
(
    alert_id UUID DEFAULT generateUUIDv4(),
    alert_name LowCardinality(String),
    
    -- Status
    severity LowCardinality(String),
    status LowCardinality(String) DEFAULT 'firing',  -- 'firing', 'resolved', 'acknowledged'
    
    -- Valores
    current_value Float64,
    threshold_value Float64,
    
    -- Contexto
    labels Map(String, String),
    annotations Map(String, String),
    
    -- Timestamps
    fired_at DateTime DEFAULT now(),
    resolved_at Nullable(DateTime),
    acknowledged_at Nullable(DateTime),
    acknowledged_by Nullable(String),
    
    -- Fingerprint para deduplicação
    fingerprint String
)
ENGINE = ReplacingMergeTree(fired_at)
PARTITION BY toYYYYMM(fired_at)
ORDER BY (alert_name, fingerprint, fired_at)
TTL fired_at + INTERVAL 90 DAY;

-- ============================================================================
-- VIEWS DE ALERTAS EM TEMPO REAL
-- ============================================================================

-- View: Taxa de erro de APIs (últimos 5 minutos)
CREATE VIEW IF NOT EXISTS alert_api_error_rate AS
SELECT
    provider,
    endpoint,
    sum(error_count) / sum(request_count) AS error_rate,
    sum(request_count) AS total_requests,
    sum(error_count) AS total_errors,
    max(p99_latency_ms) AS max_latency
FROM api_latency_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE
GROUP BY provider, endpoint
HAVING error_rate > 0.05;

-- View: Latência P95 elevada
CREATE VIEW IF NOT EXISTS alert_high_latency AS
SELECT
    provider,
    endpoint,
    avg(p95_latency_ms) AS avg_p95,
    max(p99_latency_ms) AS max_p99,
    sum(request_count) AS total_requests
FROM api_latency_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE
GROUP BY provider, endpoint
HAVING avg_p95 > 500;

-- View: Volume de transações (detecção de anomalia)
CREATE VIEW IF NOT EXISTS alert_transaction_volume AS
WITH 
    baseline AS (
        SELECT
            toHour(minute) AS hour_of_day,
            toDayOfWeek(minute) AS day_of_week,
            avg(transaction_count) AS baseline_avg,
            stddevPop(transaction_count) AS baseline_std
        FROM transactions_per_minute
        WHERE minute >= now() - INTERVAL 30 DAY
          AND minute < now() - INTERVAL 1 HOUR
        GROUP BY hour_of_day, day_of_week
    ),
    current_data AS (
        SELECT
            toStartOfFiveMinutes(minute) AS period,
            sum(transaction_count) AS current_count
        FROM transactions_per_minute
        WHERE minute >= now() - INTERVAL 10 MINUTE
        GROUP BY period
    )
SELECT
    c.period,
    c.current_count,
    b.baseline_avg,
    b.baseline_std,
    (c.current_count - b.baseline_avg) / nullIf(b.baseline_std, 0) AS z_score,
    multiIf(
        c.current_count < b.baseline_avg - 3 * b.baseline_std, 'critical_low',
        c.current_count < b.baseline_avg - 2 * b.baseline_std, 'warning_low',
        c.current_count > b.baseline_avg + 3 * b.baseline_std, 'critical_high',
        c.current_count > b.baseline_avg + 2 * b.baseline_std, 'warning_high',
        'normal'
    ) AS status
FROM current_data c
CROSS JOIN baseline b
WHERE b.hour_of_day = toHour(now())
  AND b.day_of_week = toDayOfWeek(now());

-- View: Taxa de recusa de cartões
CREATE VIEW IF NOT EXISTS alert_card_decline_rate AS
SELECT
    brand,
    card_type,
    sum(declined_count) / sum(transaction_count) AS decline_rate,
    sum(transaction_count) AS total_transactions,
    sum(declined_count) AS total_declined
FROM card_transactions_per_hour
WHERE hour >= now() - INTERVAL 1 HOUR
GROUP BY brand, card_type
HAVING decline_rate > 0.15;

-- View: Score de fraude elevado
CREATE VIEW IF NOT EXISTS alert_fraud_score AS
SELECT
    geolocation_country,
    avg(avg_fraud_score) AS avg_score,
    max(max_fraud_score) AS max_score,
    sum(event_count) AS total_events,
    countIf(decision = 'BLOCK') AS blocked_events
FROM fraud_metrics_per_hour
WHERE hour >= now() - INTERVAL 1 HOUR
GROUP BY geolocation_country
HAVING avg_score > 0.6;

-- View: Disponibilidade de provedores
CREATE VIEW IF NOT EXISTS alert_provider_health AS
SELECT
    provider,
    sum(success_count) / sum(request_count) AS success_rate,
    sum(request_count) AS total_requests,
    avg(avg_latency_ms) AS avg_latency,
    max(max_latency_ms) AS max_latency
FROM api_latency_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE
GROUP BY provider
HAVING success_rate < 0.95;

-- ============================================================================
-- QUERIES PARA SISTEMA DE ALERTAS (PARA PROMETHEUS/GRAFANA)
-- ============================================================================

-- Essas queries podem ser expostas via ClickHouse HTTP interface
-- e consultadas pelo Prometheus via clickhouse_exporter ou Grafana diretamente

-- Métrica: Transações por segundo (últimos 5 min)
-- /metrics/tps
CREATE VIEW IF NOT EXISTS metric_tps AS
SELECT
    sum(transaction_count) / 300 AS tps
FROM transactions_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE;

-- Métrica: Valor total processado (últimos 5 min)
CREATE VIEW IF NOT EXISTS metric_volume AS
SELECT
    sum(total_amount) AS volume_brl
FROM transactions_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE
  AND currency = 'BRL';

-- Métrica: Taxa de sucesso geral de APIs
CREATE VIEW IF NOT EXISTS metric_api_success_rate AS
SELECT
    sum(success_count) / sum(request_count) AS success_rate
FROM api_latency_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE;

-- Métrica: Latência P99 geral
CREATE VIEW IF NOT EXISTS metric_api_latency_p99 AS
SELECT
    max(p99_latency_ms) AS p99_latency
FROM api_latency_per_minute
WHERE minute >= now() - INTERVAL 5 MINUTE;

-- ============================================================================
-- FUNÇÃO PARA VERIFICAÇÃO PERIÓDICA DE ALERTAS
-- Esta função seria chamada por um job externo (ex: cron, Airflow)
-- ============================================================================

-- Query para verificar todos os alertas e gerar notificações
-- Execute via scheduled task:

/*
INSERT INTO alerts_fired (alert_name, severity, current_value, threshold_value, labels, annotations, fingerprint)
SELECT
    'api_error_rate' AS alert_name,
    'critical' AS severity,
    error_rate AS current_value,
    0.05 AS threshold_value,
    map('provider', provider, 'endpoint', endpoint) AS labels,
    map('description', concat('Error rate ', toString(round(error_rate * 100, 2)), '% for ', provider, ' ', endpoint)) AS annotations,
    cityHash64(concat('api_error_rate', provider, endpoint)) AS fingerprint
FROM alert_api_error_rate
WHERE error_rate > 0.05;
*/

-- ============================================================================
-- CONFIGURAÇÃO DE ALERTAS PARA GRAFANA
-- ============================================================================

/*
Alertas recomendados no Grafana:

1. Transaction Volume Drop
   - Query: SELECT sum(transaction_count) FROM transactions_per_minute WHERE minute >= now() - INTERVAL 5 MINUTE
   - Condition: IS BELOW 50 FOR 5 minutes
   - Severity: Critical
   
2. High P95 Latency
   - Query: SELECT max(p95_latency_ms) FROM api_latency_per_minute WHERE minute >= now() - INTERVAL 5 MINUTE GROUP BY provider
   - Condition: IS ABOVE 2000 FOR 3 minutes
   - Severity: Warning
   
3. Provider Down
   - Query: SELECT provider, sum(success_count)/sum(request_count) as rate FROM api_latency_per_minute WHERE minute >= now() - INTERVAL 3 MINUTE GROUP BY provider
   - Condition: IS BELOW 0.80 FOR 2 minutes
   - Severity: Critical (Page)
   
4. Card Decline Spike
   - Query: SELECT sum(declined_count)/sum(transaction_count) FROM card_transactions_per_hour WHERE hour >= now() - INTERVAL 1 HOUR
   - Condition: IS ABOVE 0.25 FOR 15 minutes
   - Severity: Warning
   
5. Fraud Score Anomaly
   - Query: SELECT avg(avg_fraud_score) FROM fraud_metrics_per_hour WHERE hour >= now() - INTERVAL 1 HOUR
   - Condition: IS ABOVE 0.7 FOR 10 minutes
   - Severity: Critical
*/

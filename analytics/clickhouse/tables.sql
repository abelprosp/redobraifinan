-- ============================================================================
-- KAMINOCLONE - CLICKHOUSE ANALYTICS SCHEMA
-- Versão: 1.0.0
-- Descrição: Tabelas OLAP para analytics em tempo real e dashboards
-- ============================================================================

-- ============================================================================
-- DATABASES
-- ============================================================================

CREATE DATABASE IF NOT EXISTS kamino_analytics;
CREATE DATABASE IF NOT EXISTS kamino_metrics;

USE kamino_analytics;

-- ============================================================================
-- TABELAS DE EVENTOS (CONSUMIDAS DO KAFKA)
-- ============================================================================

-- Eventos de transações (consumido do Kafka)
CREATE TABLE IF NOT EXISTS transactions_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_timestamp DateTime64(3),
    
    -- Dados da transação
    transaction_id UUID,
    reference_id String,
    transaction_type LowCardinality(String),
    
    -- Valores
    amount Decimal64(2),
    currency LowCardinality(String),
    
    -- Status
    status LowCardinality(String),
    previous_status Nullable(String),
    
    -- Usuário e conta
    user_id UUID,
    source_account_id UUID,
    destination_account_id Nullable(UUID),
    
    -- Método de pagamento
    payment_method LowCardinality(String),
    direction LowCardinality(String),  -- INBOUND / OUTBOUND
    
    -- Metadados
    metadata String,  -- JSON string
    
    -- Provedor externo
    provider LowCardinality(String),
    provider_latency_ms UInt32,
    
    -- Particionamento
    event_date Date DEFAULT toDate(event_timestamp),
    
    -- Processamento
    kafka_topic LowCardinality(String),
    kafka_partition UInt16,
    kafka_offset UInt64,
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, transaction_type, event_timestamp, transaction_id)
TTL event_date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Tabela Kafka para ingestão de transações
CREATE TABLE IF NOT EXISTS transactions_events_kafka
(
    event_id UUID,
    event_type String,
    event_timestamp DateTime64(3),
    transaction_id UUID,
    reference_id String,
    transaction_type String,
    amount Decimal64(2),
    currency String,
    status String,
    previous_status Nullable(String),
    user_id UUID,
    source_account_id UUID,
    destination_account_id Nullable(UUID),
    payment_method String,
    direction String,
    metadata String,
    provider String,
    provider_latency_ms UInt32
)
ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'transactions.events',
    kafka_group_name = 'clickhouse_transactions_consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 4,
    kafka_max_block_size = 65536;

-- Materialized View para popular tabela de transações
CREATE MATERIALIZED VIEW IF NOT EXISTS transactions_events_mv TO transactions_events AS
SELECT
    event_id,
    event_type,
    event_timestamp,
    transaction_id,
    reference_id,
    transaction_type,
    amount,
    currency,
    status,
    previous_status,
    user_id,
    source_account_id,
    destination_account_id,
    payment_method,
    direction,
    metadata,
    provider,
    provider_latency_ms,
    toDate(event_timestamp) AS event_date,
    'transactions.events' AS kafka_topic,
    _partition AS kafka_partition,
    _offset AS kafka_offset
FROM transactions_events_kafka;

-- ============================================================================
-- EVENTOS DE CARTÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS card_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_timestamp DateTime64(3),
    
    -- Cartão
    card_id UUID,
    user_id UUID,
    card_type LowCardinality(String),
    brand LowCardinality(String),
    pan_last_four FixedString(4),
    
    -- Transação
    authorization_code Nullable(String),
    transaction_type LowCardinality(String),  -- PURCHASE, REFUND, etc
    
    -- Comerciante
    merchant_name Nullable(String),
    merchant_category_code LowCardinality(String),
    merchant_city Nullable(String),
    merchant_country LowCardinality(String),
    
    -- Valores
    amount Decimal64(2),
    currency LowCardinality(String),
    billing_amount Decimal64(2),
    billing_currency LowCardinality(String),
    
    -- Status
    status LowCardinality(String),
    decline_code Nullable(String),
    decline_reason Nullable(String),
    
    -- 3DS
    three_ds_authenticated UInt8,
    
    -- Particionamento
    event_date Date DEFAULT toDate(event_timestamp),
    
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, card_type, event_timestamp, card_id)
TTL event_date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Kafka source para card events
CREATE TABLE IF NOT EXISTS card_events_kafka
(
    event_id UUID,
    event_type String,
    event_timestamp DateTime64(3),
    card_id UUID,
    user_id UUID,
    card_type String,
    brand String,
    pan_last_four String,
    authorization_code Nullable(String),
    transaction_type String,
    merchant_name Nullable(String),
    merchant_category_code String,
    merchant_city Nullable(String),
    merchant_country String,
    amount Decimal64(2),
    currency String,
    billing_amount Decimal64(2),
    billing_currency String,
    status String,
    decline_code Nullable(String),
    decline_reason Nullable(String),
    three_ds_authenticated UInt8
)
ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'cards.events',
    kafka_group_name = 'clickhouse_cards_consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 2;

CREATE MATERIALIZED VIEW IF NOT EXISTS card_events_mv TO card_events AS
SELECT * FROM card_events_kafka;

-- ============================================================================
-- EVENTOS DE API (LATÊNCIA E INTEGRAÇÕES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_events
(
    event_id UUID,
    event_timestamp DateTime64(3),
    
    -- Provider
    provider LowCardinality(String),
    provider_type LowCardinality(String),
    
    -- Requisição
    method LowCardinality(String),
    endpoint String,
    
    -- Resposta
    response_status UInt16,
    success UInt8,
    
    -- Métricas
    latency_ms UInt32,
    retry_count UInt8,
    
    -- Erro
    error_code Nullable(String),
    
    -- Correlation
    correlation_id UUID,
    
    event_date Date DEFAULT toDate(event_timestamp),
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, provider, event_timestamp)
TTL event_date + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ============================================================================
-- EVENTOS DE FRAUDE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_timestamp DateTime64(3),
    
    -- Referência
    transaction_id Nullable(UUID),
    card_id Nullable(UUID),
    user_id UUID,
    
    -- Score e decisão
    fraud_score Decimal32(4),
    risk_level LowCardinality(String),
    decision LowCardinality(String),  -- ALLOW, BLOCK, REVIEW
    
    -- Regras disparadas
    triggered_rules Array(String),
    
    -- Detalhes
    ip_address IPv4,
    device_fingerprint String,
    geolocation_country LowCardinality(String),
    geolocation_city String,
    
    -- Metadados
    metadata String,
    
    event_date Date DEFAULT toDate(event_timestamp),
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, risk_level, event_timestamp)
TTL event_date + INTERVAL 3 YEAR
SETTINGS index_granularity = 8192;

-- ============================================================================
-- EVENTOS DE USUÁRIO/SESSÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_timestamp DateTime64(3),
    
    user_id UUID,
    session_id Nullable(UUID),
    
    -- Ação
    action LowCardinality(String),
    action_result LowCardinality(String),  -- SUCCESS, FAILED
    
    -- Dispositivo
    device_type LowCardinality(String),
    device_os LowCardinality(String),
    app_version Nullable(String),
    
    -- Localização
    ip_address IPv4,
    country LowCardinality(String),
    city String,
    
    -- Metadados
    metadata String,
    
    event_date Date DEFAULT toDate(event_timestamp),
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, event_timestamp, user_id)
TTL event_date + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ============================================================================
-- DATABASE DE MÉTRICAS
-- ============================================================================

USE kamino_metrics;

-- ============================================================================
-- MÉTRICAS AGREGADAS - TRANSAÇÕES POR MINUTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions_per_minute
(
    minute DateTime,
    
    transaction_type LowCardinality(String),
    payment_method LowCardinality(String),
    currency LowCardinality(String),
    status LowCardinality(String),
    
    -- Métricas
    transaction_count UInt64,
    total_amount Decimal128(2),
    avg_amount Decimal64(2),
    min_amount Decimal64(2),
    max_amount Decimal64(2),
    
    -- Usuários únicos
    unique_users UInt64,
    
    -- Latência do provedor
    avg_provider_latency_ms Float32,
    p50_provider_latency_ms Float32,
    p95_provider_latency_ms Float32,
    p99_provider_latency_ms Float32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(minute)
ORDER BY (minute, transaction_type, payment_method, currency, status)
TTL minute + INTERVAL 90 DAY;

-- Materialized View para agregar por minuto
CREATE MATERIALIZED VIEW IF NOT EXISTS transactions_per_minute_mv TO transactions_per_minute AS
SELECT
    toStartOfMinute(event_timestamp) AS minute,
    transaction_type,
    payment_method,
    currency,
    status,
    count() AS transaction_count,
    sum(amount) AS total_amount,
    avg(amount) AS avg_amount,
    min(amount) AS min_amount,
    max(amount) AS max_amount,
    uniqExact(user_id) AS unique_users,
    avg(provider_latency_ms) AS avg_provider_latency_ms,
    quantile(0.5)(provider_latency_ms) AS p50_provider_latency_ms,
    quantile(0.95)(provider_latency_ms) AS p95_provider_latency_ms,
    quantile(0.99)(provider_latency_ms) AS p99_provider_latency_ms
FROM kamino_analytics.transactions_events
WHERE event_type = 'TransactionCompleted'
GROUP BY minute, transaction_type, payment_method, currency, status;

-- ============================================================================
-- MÉTRICAS AGREGADAS - CARTÕES POR HORA
-- ============================================================================

CREATE TABLE IF NOT EXISTS card_transactions_per_hour
(
    hour DateTime,
    
    card_type LowCardinality(String),
    brand LowCardinality(String),
    merchant_category_code LowCardinality(String),
    merchant_country LowCardinality(String),
    status LowCardinality(String),
    
    -- Métricas
    transaction_count UInt64,
    total_amount Decimal128(2),
    
    -- Por status
    approved_count UInt64,
    declined_count UInt64,
    
    -- 3DS
    three_ds_count UInt64,
    
    -- Usuários e cartões únicos
    unique_users UInt64,
    unique_cards UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, card_type, brand, merchant_category_code, status)
TTL hour + INTERVAL 180 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS card_transactions_per_hour_mv TO card_transactions_per_hour AS
SELECT
    toStartOfHour(event_timestamp) AS hour,
    card_type,
    brand,
    merchant_category_code,
    merchant_country,
    status,
    count() AS transaction_count,
    sum(amount) AS total_amount,
    countIf(status = 'APPROVED') AS approved_count,
    countIf(status = 'DECLINED') AS declined_count,
    countIf(three_ds_authenticated = 1) AS three_ds_count,
    uniqExact(user_id) AS unique_users,
    uniqExact(card_id) AS unique_cards
FROM kamino_analytics.card_events
WHERE event_type = 'CardTransactionProcessed'
GROUP BY hour, card_type, brand, merchant_category_code, merchant_country, status;

-- ============================================================================
-- MÉTRICAS DE LATÊNCIA DE APIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_latency_per_minute
(
    minute DateTime,
    
    provider LowCardinality(String),
    endpoint String,
    method LowCardinality(String),
    
    -- Contadores
    request_count UInt64,
    success_count UInt64,
    error_count UInt64,
    
    -- Taxa de sucesso
    success_rate Float32,
    
    -- Latência
    avg_latency_ms Float32,
    p50_latency_ms Float32,
    p95_latency_ms Float32,
    p99_latency_ms Float32,
    max_latency_ms Float32,
    
    -- Erros por código
    error_codes Map(String, UInt64)
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(minute)
ORDER BY (minute, provider, endpoint)
TTL minute + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS api_latency_per_minute_mv TO api_latency_per_minute AS
SELECT
    toStartOfMinute(event_timestamp) AS minute,
    provider,
    endpoint,
    method,
    count() AS request_count,
    countIf(success = 1) AS success_count,
    countIf(success = 0) AS error_count,
    countIf(success = 1) / count() AS success_rate,
    avg(latency_ms) AS avg_latency_ms,
    quantile(0.5)(latency_ms) AS p50_latency_ms,
    quantile(0.95)(latency_ms) AS p95_latency_ms,
    quantile(0.99)(latency_ms) AS p99_latency_ms,
    max(latency_ms) AS max_latency_ms,
    sumMap(map(ifNull(error_code, 'none'), 1)) AS error_codes
FROM kamino_analytics.api_events
GROUP BY minute, provider, endpoint, method;

-- ============================================================================
-- MÉTRICAS DE FRAUDE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fraud_metrics_per_hour
(
    hour DateTime,
    
    risk_level LowCardinality(String),
    decision LowCardinality(String),
    geolocation_country LowCardinality(String),
    
    -- Contadores
    event_count UInt64,
    
    -- Scores
    avg_fraud_score Float32,
    max_fraud_score Float32,
    
    -- Regras mais disparadas
    top_triggered_rules Array(String),
    
    -- Usuários únicos
    unique_users UInt64,
    
    -- Valores bloqueados
    blocked_amount Decimal128(2)
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, risk_level, decision, geolocation_country)
TTL hour + INTERVAL 365 DAY;

-- ============================================================================
-- TABELAS DE SNAPSHOTS DIÁRIOS
-- ============================================================================

USE kamino_analytics;

-- Snapshot diário de usuários ativos
CREATE TABLE IF NOT EXISTS daily_active_users
(
    date Date,
    
    -- Métricas
    total_users UInt64,
    new_users UInt64,
    active_users UInt64,  -- Fizeram alguma transação
    churned_users UInt64,  -- Não fazem transação há 30+ dias
    
    -- Por tipo de ação
    users_with_deposits UInt64,
    users_with_withdrawals UInt64,
    users_with_card_transactions UInt64,
    users_with_pix UInt64,
    
    -- Valores
    total_deposit_volume Decimal128(2),
    total_withdrawal_volume Decimal128(2),
    avg_transaction_value Decimal64(2)
)
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY date;

-- Snapshot diário de cartões
CREATE TABLE IF NOT EXISTS daily_card_metrics
(
    date Date,
    card_type LowCardinality(String),
    brand LowCardinality(String),
    
    -- Cartões
    total_active_cards UInt64,
    new_cards_issued UInt64,
    cards_blocked UInt64,
    cards_cancelled UInt64,
    
    -- Transações
    total_transactions UInt64,
    total_volume Decimal128(2),
    avg_transaction_value Decimal64(2),
    
    -- Aprovação
    approval_rate Float32,
    
    -- Por categoria de comerciante (top 10)
    top_mcc_codes Array(Tuple(String, UInt64, Decimal64(2)))
)
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, card_type, brand);

-- ============================================================================
-- QUERIES ANALÍTICAS DE EXEMPLO
-- ============================================================================

-- Query: Volume de transações nos últimos 60 minutos
-- SELECT 
--     minute,
--     sum(transaction_count) as total_transactions,
--     sum(total_amount) as total_volume
-- FROM kamino_metrics.transactions_per_minute
-- WHERE minute >= now() - INTERVAL 60 MINUTE
-- GROUP BY minute
-- ORDER BY minute;

-- Query: Taxa de aprovação de cartões por bandeira (últimas 24h)
-- SELECT 
--     brand,
--     sum(approved_count) / sum(transaction_count) as approval_rate,
--     sum(transaction_count) as total_transactions
-- FROM kamino_metrics.card_transactions_per_hour
-- WHERE hour >= now() - INTERVAL 24 HOUR
-- GROUP BY brand;

-- Query: Latência P95 por provedor (últimos 30 min)
-- SELECT 
--     provider,
--     avg(p95_latency_ms) as avg_p95_latency,
--     max(p99_latency_ms) as max_p99_latency,
--     sum(error_count) / sum(request_count) as error_rate
-- FROM kamino_metrics.api_latency_per_minute
-- WHERE minute >= now() - INTERVAL 30 MINUTE
-- GROUP BY provider;

-- Query: Detecção de anomalia - Volume abaixo do esperado
-- WITH 
--     baseline AS (
--         SELECT 
--             toHour(minute) as hour_of_day,
--             toDayOfWeek(minute) as day_of_week,
--             avg(transaction_count) as avg_count,
--             stddevPop(transaction_count) as std_count
--         FROM kamino_metrics.transactions_per_minute
--         WHERE minute >= now() - INTERVAL 30 DAY
--         GROUP BY hour_of_day, day_of_week
--     ),
--     current AS (
--         SELECT 
--             sum(transaction_count) as current_count
--         FROM kamino_metrics.transactions_per_minute
--         WHERE minute >= now() - INTERVAL 5 MINUTE
--     )
-- SELECT 
--     current_count,
--     avg_count,
--     std_count,
--     (current_count - avg_count) / std_count as z_score
-- FROM current, baseline
-- WHERE hour_of_day = toHour(now())
--   AND day_of_week = toDayOfWeek(now());

-- ============================================================================
-- KAMINOCLONE - SCHEMA DO BANCO DE DADOS POSTGRESQL
-- Versão: 1.0.0
-- Autor: Arquitetura KaminoClone
-- Descrição: Schema empresarial para sistema financeiro de alta performance
-- ============================================================================

-- ============================================================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- Busca por similaridade
CREATE EXTENSION IF NOT EXISTS "btree_gist";        -- Exclusão de ranges
CREATE EXTENSION IF NOT EXISTS "timescaledb";       -- Dados temporais

-- ============================================================================
-- SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS core;           -- Ledger e transações
CREATE SCHEMA IF NOT EXISTS identity;       -- Usuários e KYC
CREATE SCHEMA IF NOT EXISTS payments;       -- Processamento de pagamentos
CREATE SCHEMA IF NOT EXISTS cards;          -- Gestão de cartões
CREATE SCHEMA IF NOT EXISTS integrations;   -- Logs de APIs externas
CREATE SCHEMA IF NOT EXISTS event_sourcing; -- Outbox e eventos
CREATE SCHEMA IF NOT EXISTS audit;          -- Trilha de auditoria

-- ============================================================================
-- TIPOS ENUM CUSTOMIZADOS
-- ============================================================================

-- Identity
CREATE TYPE identity.verification_status AS ENUM (
    'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED'
);

CREATE TYPE identity.document_type AS ENUM (
    'CPF', 'CNPJ', 'RG', 'CNH', 'PASSPORT', 'PROOF_OF_ADDRESS', 
    'SELFIE', 'SELFIE_WITH_DOCUMENT', 'INCOME_PROOF'
);

CREATE TYPE identity.user_type AS ENUM ('INDIVIDUAL', 'BUSINESS');

CREATE TYPE identity.risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Core/Ledger
CREATE TYPE core.account_type AS ENUM (
    'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
);

CREATE TYPE core.account_status AS ENUM (
    'ACTIVE', 'FROZEN', 'CLOSED', 'PENDING_ACTIVATION'
);

CREATE TYPE core.transaction_status AS ENUM (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED'
);

CREATE TYPE core.entry_type AS ENUM ('DEBIT', 'CREDIT');

-- Payments
CREATE TYPE payments.payment_method AS ENUM (
    'PIX', 'TED', 'DOC', 'BOLETO', 'CARD_DEBIT', 'CARD_CREDIT', 
    'INTERNAL_TRANSFER', 'WIRE_TRANSFER'
);

CREATE TYPE payments.payment_status AS ENUM (
    'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 
    'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);

CREATE TYPE payments.payment_direction AS ENUM ('INBOUND', 'OUTBOUND');

-- Cards
CREATE TYPE cards.card_type AS ENUM ('VIRTUAL', 'PHYSICAL');
CREATE TYPE cards.card_status AS ENUM (
    'PENDING_ACTIVATION', 'ACTIVE', 'BLOCKED', 'CANCELLED', 
    'EXPIRED', 'LOST', 'STOLEN'
);
CREATE TYPE cards.card_brand AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX');

-- ============================================================================
-- SCHEMA: IDENTITY (USUÁRIOS E KYC)
-- ============================================================================

-- Tabela principal de usuários
CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,  -- ID do sistema externo/parceiro
    
    -- Dados básicos
    user_type identity.user_type NOT NULL DEFAULT 'INDIVIDUAL',
    email VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_country_code VARCHAR(5),
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Segurança
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_updated_at TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret_encrypted TEXT,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Status
    status identity.verification_status DEFAULT 'PENDING',
    risk_level identity.risk_level DEFAULT 'LOW',
    risk_score DECIMAL(5,2) DEFAULT 0,
    
    -- Limites
    daily_transaction_limit DECIMAL(18,2) DEFAULT 10000.00,
    monthly_transaction_limit DECIMAL(18,2) DEFAULT 100000.00,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email) WHERE deleted_at IS NULL,
    CONSTRAINT users_phone_unique UNIQUE (phone_country_code, phone_number) 
        WHERE deleted_at IS NULL AND phone_number IS NOT NULL
);

-- Índices para busca
CREATE INDEX idx_users_email_trgm ON identity.users USING gin (email gin_trgm_ops);
CREATE INDEX idx_users_status ON identity.users(status);
CREATE INDEX idx_users_created_at ON identity.users(created_at);
CREATE INDEX idx_users_risk_level ON identity.users(risk_level) WHERE risk_level IN ('HIGH', 'CRITICAL');

-- Dados pessoais (PII - criptografados)
CREATE TABLE identity.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    
    -- Dados pessoais (criptografados em nível de aplicação)
    first_name_encrypted TEXT NOT NULL,
    last_name_encrypted TEXT NOT NULL,
    date_of_birth_encrypted TEXT,
    nationality VARCHAR(3),
    
    -- Documentos principais (criptografados)
    tax_id_encrypted TEXT,  -- CPF/CNPJ
    tax_id_hash VARCHAR(64) NOT NULL,  -- Hash para busca
    
    -- Endereço
    address_encrypted JSONB,  -- Objeto completo criptografado
    address_country VARCHAR(3),
    address_state VARCHAR(50),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(20),
    
    -- PEP (Pessoa Politicamente Exposta)
    is_pep BOOLEAN DEFAULT FALSE,
    pep_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_profiles_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_user_profiles_tax_id_hash ON identity.user_profiles(tax_id_hash);

-- Documentos para KYC
CREATE TABLE identity.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    
    document_type identity.document_type NOT NULL,
    document_number_hash VARCHAR(64),  -- Hash para verificação de duplicidade
    
    -- Armazenamento
    file_storage_key TEXT NOT NULL,  -- S3/GCS key
    file_hash VARCHAR(64) NOT NULL,
    file_mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    
    -- Verificação
    verification_status identity.verification_status DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    rejection_reason TEXT,
    
    -- OCR/Extração
    extracted_data JSONB,
    confidence_score DECIMAL(5,4),
    
    -- Validade
    issue_date DATE,
    expiry_date DATE,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT documents_unique_type UNIQUE (user_id, document_type) 
        WHERE verification_status = 'APPROVED'
);

CREATE INDEX idx_documents_user_id ON identity.documents(user_id);
CREATE INDEX idx_documents_status ON identity.documents(verification_status);
CREATE INDEX idx_documents_expiry ON identity.documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Verificações de biometria
CREATE TABLE identity.biometric_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    
    -- Tipo de verificação
    verification_type VARCHAR(50) NOT NULL,  -- 'FACIAL', 'LIVENESS', 'VOICE'
    provider VARCHAR(50) NOT NULL,  -- 'FACETEC', 'IPROOV', 'JUMIO'
    
    -- Resultados
    status identity.verification_status DEFAULT 'PENDING',
    match_score DECIMAL(5,4),
    liveness_score DECIMAL(5,4),
    
    -- Dados do provider
    provider_reference_id VARCHAR(255),
    provider_response JSONB,
    
    -- Artefatos
    selfie_storage_key TEXT,
    selfie_hash VARCHAR(64),
    
    -- Metadados da sessão
    session_metadata JSONB,  -- IP, device, geolocation
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_biometric_user_id ON identity.biometric_verifications(user_id);
CREATE INDEX idx_biometric_status ON identity.biometric_verifications(status);

-- Sessões de usuário
CREATE TABLE identity.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    
    -- Token
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(64) UNIQUE,
    
    -- Metadados do dispositivo
    device_id VARCHAR(255),
    device_fingerprint VARCHAR(64),
    device_type VARCHAR(50),
    device_os VARCHAR(100),
    app_version VARCHAR(20),
    
    -- Geolocalização
    ip_address INET,
    country_code VARCHAR(3),
    city VARCHAR(100),
    
    -- Validade
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON identity.sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON identity.sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON identity.sessions(expires_at);
CREATE INDEX idx_sessions_active ON identity.sessions(is_active, user_id) WHERE is_active = TRUE;

-- ============================================================================
-- SCHEMA: CORE (LEDGER - DOUBLE-ENTRY BOOKKEEPING)
-- ============================================================================

-- Plano de contas (Chart of Accounts)
CREATE TABLE core.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(20) NOT NULL UNIQUE,  -- Ex: '1.1.01.001'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    account_type core.account_type NOT NULL,
    parent_id UUID REFERENCES core.chart_of_accounts(id),
    
    -- Hierarquia
    level INT NOT NULL DEFAULT 1,
    path LTREE,  -- Requer extensão ltree
    
    -- Configurações
    is_synthetic BOOLEAN DEFAULT FALSE,  -- Conta sintética (agregadora)
    allows_manual_entries BOOLEAN DEFAULT TRUE,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chart_code ON core.chart_of_accounts(code);
CREATE INDEX idx_chart_type ON core.chart_of_accounts(account_type);
CREATE INDEX idx_chart_parent ON core.chart_of_accounts(parent_id);

-- Contas de usuário (Wallets/Accounts)
CREATE TABLE core.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES identity.users(id),
    chart_account_id UUID NOT NULL REFERENCES core.chart_of_accounts(id),
    
    -- Identificação
    account_number VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    
    -- Saldos (atualizados por trigger)
    balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    available_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    blocked_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Configurações
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status core.account_status NOT NULL DEFAULT 'PENDING_ACTIVATION',
    
    -- Limites específicos da conta
    daily_limit DECIMAL(18,2),
    transaction_limit DECIMAL(18,2),
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT accounts_balance_positive CHECK (balance >= 0 OR chart_account_id IN (
        SELECT id FROM core.chart_of_accounts WHERE account_type IN ('LIABILITY', 'EXPENSE')
    )),
    CONSTRAINT accounts_available_balance CHECK (available_balance <= balance)
);

CREATE INDEX idx_accounts_user_id ON core.accounts(user_id);
CREATE INDEX idx_accounts_number ON core.accounts(account_number);
CREATE INDEX idx_accounts_status ON core.accounts(status);

-- Transações do ledger (imutáveis)
CREATE TABLE core.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência externa
    reference_id VARCHAR(100) NOT NULL UNIQUE,  -- Idempotency key
    external_reference VARCHAR(255),  -- ID do sistema externo
    
    -- Tipo e descrição
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    
    -- Valor total
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    
    -- Status
    status core.transaction_status NOT NULL DEFAULT 'PENDING',
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(50)[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Reversão
    reversed_by UUID REFERENCES core.transactions(id),
    reversal_of UUID REFERENCES core.transactions(id),
    
    -- Particionamento por tempo
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE
) PARTITION BY RANGE (partition_date);

-- Criar partições por mês
CREATE TABLE core.transactions_2024_01 PARTITION OF core.transactions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE core.transactions_2024_02 PARTITION OF core.transactions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... criar partições para cada mês

CREATE INDEX idx_transactions_reference ON core.transactions(reference_id);
CREATE INDEX idx_transactions_status ON core.transactions(status);
CREATE INDEX idx_transactions_created ON core.transactions(created_at);
CREATE INDEX idx_transactions_type ON core.transactions(transaction_type);

-- Lançamentos contábeis (Double-Entry)
CREATE TABLE core.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    transaction_id UUID NOT NULL REFERENCES core.transactions(id),
    account_id UUID NOT NULL REFERENCES core.accounts(id),
    
    -- Lançamento
    entry_type core.entry_type NOT NULL,
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    
    -- Saldos no momento do lançamento
    balance_before DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,
    
    -- Sequência para ordenação
    sequence_number BIGSERIAL,
    
    -- Particionamento
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (partition_date);

-- Criar partições
CREATE TABLE core.ledger_entries_2024_01 PARTITION OF core.ledger_entries
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE INDEX idx_ledger_transaction ON core.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON core.ledger_entries(account_id);
CREATE INDEX idx_ledger_sequence ON core.ledger_entries(sequence_number);

-- View para verificar balanço (débito = crédito)
CREATE VIEW core.transaction_balance_check AS
SELECT 
    t.id as transaction_id,
    t.reference_id,
    SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END) - 
    SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END) as difference
FROM core.transactions t
JOIN core.ledger_entries le ON t.id = le.transaction_id
GROUP BY t.id, t.reference_id
HAVING SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END) != 
       SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END);

-- Bloqueios de saldo (reservas)
CREATE TABLE core.balance_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    account_id UUID NOT NULL REFERENCES core.accounts(id),
    
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    reason VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'RELEASED', 'CAPTURED', 'EXPIRED')),
    
    -- Validade
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Resolução
    released_at TIMESTAMPTZ,
    released_reason VARCHAR(255),
    captured_transaction_id UUID REFERENCES core.transactions(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar holds duplicados
    CONSTRAINT balance_holds_unique_ref UNIQUE (account_id, reference_id)
);

CREATE INDEX idx_holds_account ON core.balance_holds(account_id);
CREATE INDEX idx_holds_status ON core.balance_holds(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_holds_expires ON core.balance_holds(expires_at) WHERE status = 'ACTIVE';

-- ============================================================================
-- SCHEMA: PAYMENTS (PROCESSAMENTO DE PAGAMENTOS)
-- ============================================================================

-- Intenções de pagamento
CREATE TABLE payments.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Idempotência
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    
    -- Origem
    user_id UUID NOT NULL REFERENCES identity.users(id),
    source_account_id UUID NOT NULL REFERENCES core.accounts(id),
    
    -- Destino
    destination_type VARCHAR(50) NOT NULL,  -- 'INTERNAL', 'BANK_ACCOUNT', 'PIX_KEY'
    destination_account_id UUID REFERENCES core.accounts(id),
    destination_bank_details JSONB,
    destination_pix_key VARCHAR(100),
    
    -- Valor
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    
    -- Taxas
    fee_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) GENERATED ALWAYS AS (amount + fee_amount) STORED,
    
    -- Método e direção
    payment_method payments.payment_method NOT NULL,
    direction payments.payment_direction NOT NULL,
    
    -- Status
    status payments.payment_status NOT NULL DEFAULT 'CREATED',
    
    -- Descrição
    description TEXT,
    customer_reference VARCHAR(255),
    
    -- Agendamento
    scheduled_for TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_config JSONB,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Transação do ledger
    ledger_transaction_id UUID REFERENCES core.transactions(id)
);

CREATE INDEX idx_payment_intents_user ON payments.payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payments.payment_intents(status);
CREATE INDEX idx_payment_intents_scheduled ON payments.payment_intents(scheduled_for) 
    WHERE scheduled_for IS NOT NULL AND status = 'APPROVED';
CREATE INDEX idx_payment_intents_created ON payments.payment_intents(created_at);

-- Histórico de status do pagamento
CREATE TABLE payments.payment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID NOT NULL REFERENCES payments.payment_intents(id),
    
    from_status payments.payment_status,
    to_status payments.payment_status NOT NULL,
    
    reason VARCHAR(255),
    actor_type VARCHAR(50),  -- 'SYSTEM', 'USER', 'ADMIN', 'EXTERNAL'
    actor_id UUID,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_history_intent ON payments.payment_status_history(payment_intent_id);

-- Transações de cartão
CREATE TABLE payments.card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    card_id UUID NOT NULL,  -- Referência para cards.cards
    user_id UUID NOT NULL REFERENCES identity.users(id),
    
    -- Identificadores externos
    authorization_code VARCHAR(50),
    network_reference VARCHAR(100),
    merchant_reference VARCHAR(100),
    
    -- Comerciante
    merchant_name VARCHAR(255),
    merchant_category_code VARCHAR(10),
    merchant_city VARCHAR(100),
    merchant_country VARCHAR(3),
    
    -- Valores
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    billing_amount DECIMAL(18,2),
    billing_currency VARCHAR(3),
    exchange_rate DECIMAL(18,8),
    
    -- Tipo e status
    transaction_type VARCHAR(50) NOT NULL,  -- 'PURCHASE', 'REFUND', 'REVERSAL', 'WITHDRAWAL'
    status VARCHAR(50) NOT NULL,  -- 'AUTHORIZED', 'CAPTURED', 'DECLINED', 'REVERSED'
    
    -- Motivo de recusa
    decline_code VARCHAR(20),
    decline_reason VARCHAR(255),
    
    -- 3DS
    three_ds_authenticated BOOLEAN,
    three_ds_version VARCHAR(10),
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Particionamento
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE
) PARTITION BY RANGE (partition_date);

CREATE INDEX idx_card_txn_card ON payments.card_transactions(card_id);
CREATE INDEX idx_card_txn_user ON payments.card_transactions(user_id);
CREATE INDEX idx_card_txn_auth_code ON payments.card_transactions(authorization_code);
CREATE INDEX idx_card_txn_created ON payments.card_transactions(created_at);

-- Reconciliação bancária
CREATE TABLE payments.bank_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência interna
    payment_intent_id UUID REFERENCES payments.payment_intents(id),
    
    -- Dados do banco
    bank_code VARCHAR(10) NOT NULL,
    bank_statement_id VARCHAR(100),
    bank_transaction_id VARCHAR(100) UNIQUE,
    
    -- Valores
    expected_amount DECIMAL(18,2),
    actual_amount DECIMAL(18,2) NOT NULL,
    difference DECIMAL(18,2) GENERATED ALWAYS AS (actual_amount - COALESCE(expected_amount, actual_amount)) STORED,
    
    -- Datas
    bank_date DATE NOT NULL,
    value_date DATE,
    
    -- Status
    reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        -- 'PENDING', 'MATCHED', 'UNMATCHED', 'PARTIAL', 'DISPUTED'
    
    -- Descrição do banco
    bank_description TEXT,
    
    -- Metadados
    raw_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID
);

CREATE INDEX idx_reconciliation_payment ON payments.bank_reconciliation(payment_intent_id);
CREATE INDEX idx_reconciliation_status ON payments.bank_reconciliation(reconciliation_status);
CREATE INDEX idx_reconciliation_bank_date ON payments.bank_reconciliation(bank_date);

-- ============================================================================
-- BOLETOS (COBRANÇA BANCÁRIA)
-- ============================================================================

-- Status do boleto
CREATE TYPE payments.boleto_status AS ENUM (
    'PENDENTE',         -- Aguardando pagamento
    'REGISTRADO',       -- Registrado no banco
    'LIQUIDADO',        -- Pago
    'VENCIDO',          -- Vencido sem pagamento
    'BAIXADO',          -- Baixado manualmente
    'PROTESTADO',       -- Enviado para protesto
    'NEGATIVADO',       -- Enviado para negativação
    'CANCELADO'         -- Cancelado
);

-- Tabela de boletos
CREATE TABLE payments.boletos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento com usuário/cliente
    user_id UUID NOT NULL REFERENCES identity.users(id),
    payment_intent_id UUID REFERENCES payments.payment_intents(id),
    
    -- Identificadores do boleto
    nosso_numero VARCHAR(20) NOT NULL,           -- Número interno do banco
    seu_numero VARCHAR(50),                       -- Número de controle interno
    linha_digitavel VARCHAR(60),                 -- Linha digitável
    codigo_barras VARCHAR(50),                   -- Código de barras
    
    -- PIX Híbrido (Boleto + PIX)
    tx_id VARCHAR(100),                          -- Identificador PIX
    qr_code TEXT,                                -- QR Code PIX
    qr_code_url VARCHAR(500),                    -- URL do QR Code
    
    -- Valores
    valor DECIMAL(18,2) NOT NULL CHECK (valor > 0),
    valor_pago DECIMAL(18,2),
    valor_juros DECIMAL(18,2) DEFAULT 0,
    valor_multa DECIMAL(18,2) DEFAULT 0,
    valor_desconto DECIMAL(18,2) DEFAULT 0,
    
    -- Datas
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    data_liquidacao TIMESTAMPTZ,
    
    -- Status
    status payments.boleto_status NOT NULL DEFAULT 'PENDENTE',
    
    -- Dados do pagador (snapshot no momento da emissão)
    pagador_nome VARCHAR(255) NOT NULL,
    pagador_documento VARCHAR(20) NOT NULL,      -- CPF ou CNPJ
    pagador_telefone VARCHAR(20),
    pagador_email VARCHAR(255),
    pagador_endereco JSONB,
    
    -- Dados do banco/cooperativa
    banco_codigo VARCHAR(10) NOT NULL,           -- Ex: '748' para Sicredi
    cooperativa VARCHAR(10),
    posto VARCHAR(10),
    codigo_beneficiario VARCHAR(20),
    
    -- URLs
    url_boleto VARCHAR(500),                     -- URL para visualizar/baixar o PDF
    url_pdf VARCHAR(500),                        -- Link direto do PDF
    
    -- Descrição e referência
    descricao TEXT,
    referencia_externa VARCHAR(255),             -- ID do sistema externo
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT boletos_nosso_numero_banco_unique UNIQUE (banco_codigo, nosso_numero)
);

-- Índices para boletos
CREATE INDEX idx_boletos_user_id ON payments.boletos(user_id);
CREATE INDEX idx_boletos_status ON payments.boletos(status);
CREATE INDEX idx_boletos_vencimento ON payments.boletos(data_vencimento);
CREATE INDEX idx_boletos_nosso_numero ON payments.boletos(nosso_numero);
CREATE INDEX idx_boletos_pagador_documento ON payments.boletos(pagador_documento);
CREATE INDEX idx_boletos_pagador_telefone ON payments.boletos(pagador_telefone);
CREATE INDEX idx_boletos_created ON payments.boletos(created_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_boletos_updated_at
    BEFORE UPDATE ON payments.boletos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger de auditoria
CREATE TRIGGER audit_boletos
    AFTER INSERT OR UPDATE OR DELETE ON payments.boletos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- View para consulta de boletos por telefone (usada pelo webhook)
CREATE VIEW payments.boletos_por_telefone AS
SELECT 
    b.id,
    b.nosso_numero,
    b.linha_digitavel,
    b.codigo_barras,
    b.qr_code,
    b.qr_code_url,
    b.valor,
    b.valor_pago,
    b.data_emissao,
    b.data_vencimento,
    b.data_pagamento,
    b.status,
    b.pagador_nome,
    b.pagador_documento,
    b.pagador_telefone,
    b.url_boleto,
    b.url_pdf,
    b.descricao,
    b.created_at,
    u.id as user_id,
    u.phone_number,
    up.tax_id_hash
FROM payments.boletos b
JOIN identity.users u ON b.user_id = u.id
LEFT JOIN identity.user_profiles up ON u.id = up.user_id;

-- ============================================================================
-- SCHEMA: CARDS (GESTÃO DE CARTÕES)
-- ============================================================================

-- Cartões virtuais e físicos
CREATE TABLE cards.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES identity.users(id),
    account_id UUID NOT NULL REFERENCES core.accounts(id),
    
    -- Identificação
    card_type cards.card_type NOT NULL,
    brand cards.card_brand NOT NULL,
    
    -- Dados do cartão (tokenizados)
    pan_token VARCHAR(100) NOT NULL UNIQUE,  -- Token do PAN real
    pan_last_four VARCHAR(4) NOT NULL,
    pan_hash VARCHAR(64) NOT NULL,  -- Para busca
    
    expiry_month SMALLINT NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year SMALLINT NOT NULL,
    
    -- CVV tokenizado (armazenado em HSM)
    cvv_token VARCHAR(100),
    
    -- Nome no cartão
    cardholder_name VARCHAR(100) NOT NULL,
    
    -- Status
    status cards.card_status NOT NULL DEFAULT 'PENDING_ACTIVATION',
    
    -- Configurações de uso
    is_contactless_enabled BOOLEAN DEFAULT TRUE,
    is_ecommerce_enabled BOOLEAN DEFAULT TRUE,
    is_international_enabled BOOLEAN DEFAULT FALSE,
    is_atm_enabled BOOLEAN DEFAULT FALSE,
    
    -- Limites
    daily_limit DECIMAL(18,2) NOT NULL,
    monthly_limit DECIMAL(18,2) NOT NULL,
    transaction_limit DECIMAL(18,2) NOT NULL,
    
    -- Limites utilizados (atualizado por trigger)
    daily_used DECIMAL(18,2) DEFAULT 0,
    monthly_used DECIMAL(18,2) DEFAULT 0,
    
    -- Endereço de cobrança
    billing_address JSONB,
    
    -- Para cartões físicos
    shipping_address JSONB,
    shipped_at TIMESTAMPTZ,
    tracking_number VARCHAR(100),
    
    -- PIN (hash para verificação, real no HSM)
    pin_set BOOLEAN DEFAULT FALSE,
    pin_failures INT DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT cards_expiry_future CHECK (
        make_date(expiry_year, expiry_month, 1) > CURRENT_DATE
    )
);

CREATE INDEX idx_cards_user ON cards.cards(user_id);
CREATE INDEX idx_cards_account ON cards.cards(account_id);
CREATE INDEX idx_cards_pan_hash ON cards.cards(pan_hash);
CREATE INDEX idx_cards_status ON cards.cards(status);

-- Regras de controle de gastos
CREATE TABLE cards.spending_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    card_id UUID NOT NULL REFERENCES cards.cards(id) ON DELETE CASCADE,
    
    -- Tipo de regra
    rule_type VARCHAR(50) NOT NULL,  -- 'MCC_BLOCK', 'MCC_ALLOW', 'MERCHANT_BLOCK', 'TIME_RESTRICTION'
    
    -- Configuração da regra
    config JSONB NOT NULL,
    -- Exemplos:
    -- MCC_BLOCK: {"mcc_codes": ["7995", "6211"]}  -- Jogos, corretoras
    -- TIME_RESTRICTION: {"allowed_hours": {"start": "09:00", "end": "18:00"}, "days": [1,2,3,4,5]}
    -- MERCHANT_BLOCK: {"merchant_ids": ["xxx"], "merchant_names": ["*CASINO*"]}
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Período de validade
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_spending_rules_card ON cards.spending_rules(card_id);
CREATE INDEX idx_spending_rules_active ON cards.spending_rules(card_id, is_active) WHERE is_active = TRUE;

-- Log de ações em cartões
CREATE TABLE cards.card_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    card_id UUID NOT NULL REFERENCES cards.cards(id),
    
    action VARCHAR(50) NOT NULL,
    -- 'CREATED', 'ACTIVATED', 'BLOCKED', 'UNBLOCKED', 'LIMIT_CHANGED', 
    -- 'PIN_SET', 'PIN_FAILED', 'SETTINGS_CHANGED', 'CANCELLED'
    
    previous_state JSONB,
    new_state JSONB,
    
    -- Ator
    actor_type VARCHAR(50) NOT NULL,  -- 'USER', 'SYSTEM', 'ADMIN', 'FRAUD'
    actor_id UUID,
    
    -- Metadados da requisição
    ip_address INET,
    user_agent TEXT,
    
    reason VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_audit_card ON cards.card_audit_log(card_id);
CREATE INDEX idx_card_audit_action ON cards.card_audit_log(action);
CREATE INDEX idx_card_audit_created ON cards.card_audit_log(created_at);

-- ============================================================================
-- SCHEMA: INTEGRATIONS (LOGS DE APIs EXTERNAS)
-- ============================================================================

-- Provedores de integração
CREATE TABLE integrations.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(50) NOT NULL UNIQUE,  -- 'STRIPE', 'PLAID', 'BANCO_DO_BRASIL'
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,  -- 'CARD_PROCESSOR', 'BANK', 'KYC', 'OPEN_BANKING'
    
    -- Configuração
    base_url VARCHAR(500),
    api_version VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Configurações de retry
    max_retries INT DEFAULT 3,
    timeout_ms INT DEFAULT 30000,
    
    -- Health
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de requisições a APIs externas
CREATE TABLE integrations.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    provider_id UUID NOT NULL REFERENCES integrations.providers(id),
    
    -- Identificação
    correlation_id UUID NOT NULL,  -- Para rastrear fluxo completo
    request_id VARCHAR(100),
    
    -- Requisição
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    request_headers JSONB,  -- Headers sanitizados
    request_body JSONB,  -- Body sanitizado
    
    -- Resposta
    response_status INT,
    response_headers JSONB,
    response_body JSONB,  -- Body sanitizado
    
    -- Métricas
    latency_ms INT,
    retry_count INT DEFAULT 0,
    
    -- Status
    success BOOLEAN,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Particionamento
    created_at TIMESTAMPTZ DEFAULT NOW(),
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE
) PARTITION BY RANGE (partition_date);

CREATE INDEX idx_api_logs_provider ON integrations.api_logs(provider_id);
CREATE INDEX idx_api_logs_correlation ON integrations.api_logs(correlation_id);
CREATE INDEX idx_api_logs_created ON integrations.api_logs(created_at);

-- Webhooks recebidos
CREATE TABLE integrations.webhooks_received (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    provider_id UUID NOT NULL REFERENCES integrations.providers(id),
    
    -- Identificação
    webhook_id VARCHAR(255),  -- ID do webhook do provedor
    event_type VARCHAR(100) NOT NULL,
    
    -- Payload
    headers JSONB,
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    
    -- Validação
    signature_valid BOOLEAN,
    
    -- Processamento
    processing_status VARCHAR(50) DEFAULT 'PENDING',
        -- 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED'
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Idempotência
    idempotency_key VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar processamento duplicado
    CONSTRAINT webhooks_unique_event UNIQUE (provider_id, webhook_id)
);

CREATE INDEX idx_webhooks_provider ON integrations.webhooks_received(provider_id);
CREATE INDEX idx_webhooks_status ON integrations.webhooks_received(processing_status);
CREATE INDEX idx_webhooks_event ON integrations.webhooks_received(event_type);
CREATE INDEX idx_webhooks_created ON integrations.webhooks_received(created_at);

-- Fila de webhooks para reprocessamento
CREATE TABLE integrations.webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    webhook_id UUID NOT NULL REFERENCES integrations.webhooks_received(id),
    
    next_retry_at TIMESTAMPTZ NOT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 5,
    
    last_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_retry_next ON integrations.webhook_retry_queue(next_retry_at) 
    WHERE retry_count < max_retries;

-- ============================================================================
-- SCHEMA: EVENT_SOURCING (OUTBOX E EVENTOS)
-- ============================================================================

-- Tabela Outbox para garantia de entrega
CREATE TABLE event_sourcing.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Agregado
    aggregate_type VARCHAR(100) NOT NULL,  -- 'Payment', 'Card', 'Account'
    aggregate_id UUID NOT NULL,
    
    -- Evento
    event_type VARCHAR(100) NOT NULL,  -- 'PaymentCreated', 'CardActivated'
    event_version INT DEFAULT 1,
    
    -- Payload
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Tópico Kafka
    topic VARCHAR(255) NOT NULL,
    partition_key VARCHAR(255),
    
    -- Status de publicação
    status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED')),
    
    -- Retry
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON event_sourcing.outbox_events(status, created_at) 
    WHERE status = 'PENDING';
CREATE INDEX idx_outbox_retry ON event_sourcing.outbox_events(next_retry_at) 
    WHERE status = 'FAILED' AND retry_count < max_retries;
CREATE INDEX idx_outbox_aggregate ON event_sourcing.outbox_events(aggregate_type, aggregate_id);

-- Event Store (para event sourcing completo)
CREATE TABLE event_sourcing.event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Agregado
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    
    -- Evento
    event_type VARCHAR(100) NOT NULL,
    event_version INT NOT NULL,
    
    -- Versão do agregado (para concorrência otimista)
    aggregate_version BIGINT NOT NULL,
    
    -- Payload
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir ordem e unicidade
    CONSTRAINT event_store_version_unique 
        UNIQUE (aggregate_type, aggregate_id, aggregate_version)
);

CREATE INDEX idx_event_store_aggregate ON event_sourcing.event_store(aggregate_type, aggregate_id);
CREATE INDEX idx_event_store_type ON event_sourcing.event_store(event_type);
CREATE INDEX idx_event_store_created ON event_sourcing.event_store(created_at);

-- ============================================================================
-- SCHEMA: AUDIT (TRILHA DE AUDITORIA)
-- ============================================================================

-- Log de auditoria geral
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tabela afetada
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    
    -- Operação
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Dados
    old_data JSONB,
    new_data JSONB,
    changed_fields VARCHAR(255)[],
    
    -- Ator
    actor_type VARCHAR(50),  -- 'USER', 'SYSTEM', 'ADMIN', 'API'
    actor_id UUID,
    
    -- Contexto
    correlation_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Particionamento
    partition_date DATE NOT NULL DEFAULT CURRENT_DATE
) PARTITION BY RANGE (partition_date);

CREATE INDEX idx_audit_table ON audit.audit_log(schema_name, table_name);
CREATE INDEX idx_audit_record ON audit.audit_log(record_id);
CREATE INDEX idx_audit_actor ON audit.audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit.audit_log(created_at);

-- ============================================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas relevantes
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON identity.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON core.accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cards_updated_at
    BEFORE UPDATE ON cards.cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar saldo da conta após lançamento
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE core.accounts
    SET 
        balance = balance + CASE 
            WHEN NEW.entry_type = 'CREDIT' THEN NEW.amount 
            ELSE -NEW.amount 
        END,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ledger_balance
    AFTER INSERT ON core.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Função para validar double-entry (débito = crédito)
CREATE OR REPLACE FUNCTION validate_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debits DECIMAL(18,2);
    total_credits DECIMAL(18,2);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0)
    INTO total_debits, total_credits
    FROM core.ledger_entries
    WHERE transaction_id = NEW.id;
    
    IF total_debits != total_credits THEN
        RAISE EXCEPTION 'Transaction % is unbalanced: debits=%, credits=%', 
            NEW.id, total_debits, total_credits;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função de auditoria genérica
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields VARCHAR(255)[];
    key TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        new_data = to_jsonb(NEW);
        INSERT INTO audit.audit_log (
            schema_name, table_name, record_id, operation, new_data
        ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, TG_OP, new_data
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        
        -- Identificar campos alterados
        SELECT ARRAY_AGG(key)
        INTO changed_fields
        FROM jsonb_each(old_data) AS o(key, value)
        WHERE old_data->key IS DISTINCT FROM new_data->key;
        
        INSERT INTO audit.audit_log (
            schema_name, table_name, record_id, operation, 
            old_data, new_data, changed_fields
        ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, TG_OP,
            old_data, new_data, changed_fields
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        INSERT INTO audit.audit_log (
            schema_name, table_name, record_id, operation, old_data
        ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD.id, TG_OP, old_data
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoria em tabelas críticas
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON identity.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_accounts
    AFTER INSERT OR UPDATE OR DELETE ON core.accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON core.transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_cards
    AFTER INSERT OR UPDATE OR DELETE ON cards.cards
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View de saldo consolidado por usuário
CREATE VIEW core.user_balances AS
SELECT 
    u.id as user_id,
    u.email,
    a.currency,
    COUNT(a.id) as account_count,
    SUM(a.balance) as total_balance,
    SUM(a.available_balance) as total_available,
    SUM(a.blocked_balance) as total_blocked
FROM identity.users u
JOIN core.accounts a ON u.id = a.user_id
WHERE a.status = 'ACTIVE'
GROUP BY u.id, u.email, a.currency;

-- View de transações recentes com detalhes
CREATE VIEW core.recent_transactions AS
SELECT 
    t.id,
    t.reference_id,
    t.transaction_type,
    t.amount,
    t.currency,
    t.status,
    t.description,
    t.created_at,
    jsonb_agg(
        jsonb_build_object(
            'account_id', le.account_id,
            'account_number', a.account_number,
            'entry_type', le.entry_type,
            'amount', le.amount
        )
    ) as entries
FROM core.transactions t
JOIN core.ledger_entries le ON t.id = le.transaction_id
JOIN core.accounts a ON le.account_id = a.id
WHERE t.created_at > NOW() - INTERVAL '24 hours'
GROUP BY t.id;

-- View de cartões ativos com limites
CREATE VIEW cards.active_cards_summary AS
SELECT 
    c.id,
    c.user_id,
    c.card_type,
    c.brand,
    c.pan_last_four,
    c.status,
    c.daily_limit,
    c.daily_used,
    (c.daily_limit - c.daily_used) as daily_remaining,
    c.monthly_limit,
    c.monthly_used,
    (c.monthly_limit - c.monthly_used) as monthly_remaining
FROM cards.cards c
WHERE c.status = 'ACTIVE';

-- ============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards.cards ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY users_isolation ON identity.users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY accounts_isolation ON core.accounts
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY cards_isolation ON cards.cards
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON SCHEMA core IS 'Core financeiro: ledger, contas e transações';
COMMENT ON SCHEMA identity IS 'Gestão de identidade, KYC e autenticação';
COMMENT ON SCHEMA payments IS 'Processamento de pagamentos e reconciliação';
COMMENT ON SCHEMA cards IS 'Gestão de cartões virtuais e físicos';
COMMENT ON SCHEMA integrations IS 'Logs e configurações de integrações externas';
COMMENT ON SCHEMA event_sourcing IS 'Event sourcing e outbox pattern';
COMMENT ON SCHEMA audit IS 'Trilha de auditoria completa';

COMMENT ON TABLE core.transactions IS 'Transações imutáveis do ledger - double-entry bookkeeping';
COMMENT ON TABLE core.ledger_entries IS 'Lançamentos contábeis individuais de débito/crédito';
COMMENT ON TABLE cards.cards IS 'Cartões virtuais e físicos dos usuários - PAN tokenizado';

-- FIM DO SCHEMA

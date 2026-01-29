// ============================================================================
// SICOOB ADAPTER - Integração com API Sicoob
// Portal: https://developers.sicoob.com.br/portal/
// ============================================================================

package sicoob

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

type Config struct {
	// Credenciais OAuth2
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`

	// Dados da cooperativa
	NumeroContrato  string `json:"numero_contrato"`
	CooperativaCode string `json:"cooperativa_code"` // Código da cooperativa (4 dígitos)

	// Ambiente
	Environment string `json:"environment"` // "sandbox" ou "production"

	// Certificado mTLS (produção)
	CertPath string `json:"cert_path"`
	KeyPath  string `json:"key_path"`

	// Timeout
	Timeout time.Duration `json:"timeout"`
}

// URLs base por ambiente
const (
	SandboxAuthURL       = "https://sandbox.sicoob.com.br/sicoob/sandbox/oauth/token"
	SandboxAPIURL        = "https://sandbox.sicoob.com.br/sicoob/sandbox"
	ProductionAuthURL    = "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token"
	ProductionAPIURL     = "https://api.sicoob.com.br"
)

// ============================================================================
// ESTRUTURAS DE DADOS
// ============================================================================

// Token OAuth2
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// Pagador/Beneficiário
type Pessoa struct {
	TipoPessoa    string `json:"tipoPessoa"` // FISICA ou JURIDICA
	CpfCnpj       string `json:"cpfCnpj"`
	Nome          string `json:"nome"`
	Endereco      string `json:"endereco,omitempty"`
	Bairro        string `json:"bairro,omitempty"`
	Cidade        string `json:"cidade,omitempty"`
	Uf            string `json:"uf,omitempty"`
	Cep           string `json:"cep,omitempty"`
	Email         string `json:"email,omitempty"`
	Telefone      string `json:"telefone,omitempty"`
}

// Boleto
type Boleto struct {
	// Identificadores
	NumeroContrato     string `json:"numeroContrato"`
	ModalidadePartilha int    `json:"modalidadePartilha,omitempty"` // 1-Sem partilha, 2-Com partilha
	NossoNumero        int64  `json:"nossoNumero,omitempty"`
	SeuNumero          string `json:"seuNumero,omitempty"`
	
	// Valores e Datas
	Valor             float64 `json:"valor"`
	DataVencimento    string  `json:"dataVencimento"` // YYYY-MM-DD
	DataEmissao       string  `json:"dataEmissao,omitempty"`
	DataLimitePagamento string `json:"dataLimitePagamento,omitempty"`
	
	// Espécie e tipo
	EspecieDocumento  string `json:"especieDocumento,omitempty"` // DM, NP, RC, etc
	TipoCobranca      int    `json:"tipoCobranca,omitempty"` // 1-Simples, 2-Vinculada, 3-Descontada
	
	// Juros e Multa
	TipoJurosMora     int     `json:"tipoJurosMora,omitempty"` // 0-Isento, 1-Valor fixo, 2-Percentual
	ValorJurosMora    float64 `json:"valorJurosMora,omitempty"`
	TipoMulta         int     `json:"tipoMulta,omitempty"` // 0-Isento, 1-Valor fixo, 2-Percentual
	ValorMulta        float64 `json:"valorMulta,omitempty"`
	DataMulta         string  `json:"dataMulta,omitempty"`
	
	// Descontos
	TipoDesconto1     int     `json:"tipoDesconto1,omitempty"`
	ValorDesconto1    float64 `json:"valorDesconto1,omitempty"`
	DataDesconto1     string  `json:"dataDesconto1,omitempty"`
	
	// Pagador
	Pagador           Pessoa  `json:"pagador"`
	
	// Mensagens
	Mensagem1         string `json:"mensagem1,omitempty"`
	Mensagem2         string `json:"mensagem2,omitempty"`
	Mensagem3         string `json:"mensagem3,omitempty"`
	Mensagem4         string `json:"mensagem4,omitempty"`
	Mensagem5         string `json:"mensagem5,omitempty"`
	
	// PIX (Boleto Híbrido)
	GerarPix          bool   `json:"gerarPix,omitempty"`
	
	// Resposta
	LinhaDigitavel    string `json:"linhaDigitavel,omitempty"`
	CodigoBarras      string `json:"codigoBarras,omitempty"`
	QrCode            string `json:"qrCode,omitempty"`
	TxId              string `json:"txId,omitempty"`
	Situacao          string `json:"situacao,omitempty"`
}

// Resposta de criação de boleto
type BoletoResponse struct {
	NossoNumero    int64  `json:"nossoNumero"`
	LinhaDigitavel string `json:"linhaDigitavel"`
	CodigoBarras   string `json:"codigoBarras"`
	QrCode         string `json:"qrCode,omitempty"`
	TxId           string `json:"txId,omitempty"`
}

// Consulta de boletos
type ConsultaBoletoRequest struct {
	NumeroContrato string `json:"numeroContrato"`
	NossoNumero    int64  `json:"nossoNumero,omitempty"`
	DataInicio     string `json:"dataInicio,omitempty"`
	DataFim        string `json:"dataFim,omitempty"`
	Situacao       string `json:"situacao,omitempty"` // EM_ABERTO, BAIXADO, LIQUIDADO
}

// PIX Cobrança
type PixCobranca struct {
	Calendario    PixCalendario `json:"calendario"`
	Devedor       Pessoa        `json:"devedor,omitempty"`
	Valor         PixValor      `json:"valor"`
	Chave         string        `json:"chave"`
	SolicitacaoPagador string   `json:"solicitacaoPagador,omitempty"`
	InfoAdicionais []PixInfo    `json:"infoAdicionais,omitempty"`
}

type PixCalendario struct {
	Criacao   string `json:"criacao,omitempty"`
	Expiracao int    `json:"expiracao,omitempty"` // segundos
}

type PixValor struct {
	Original string `json:"original"`
}

type PixInfo struct {
	Nome  string `json:"nome"`
	Valor string `json:"valor"`
}

type PixCobrancaResponse struct {
	TxId        string `json:"txid"`
	Location    string `json:"location"`
	QrCode      string `json:"pixCopiaECola"`
	ImagemQrCode string `json:"imagemQrcode,omitempty"`
}

// Erro da API
type APIError struct {
	Codigo    string `json:"codigo"`
	Mensagem  string `json:"mensagem"`
	Detalhes  string `json:"detalhes,omitempty"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Codigo, e.Mensagem, e.Detalhes)
}

// ============================================================================
// CLIENTE SICOOB
// ============================================================================

type Client struct {
	config      Config
	httpClient  *http.Client
	token       *TokenResponse
	tokenExpiry time.Time
	tokenMutex  sync.RWMutex
}

// NewClient cria um novo cliente Sicoob
func NewClient(config Config) (*Client, error) {
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}

	// Carregar certificado mTLS para produção
	if config.Environment == "production" && config.CertPath != "" && config.KeyPath != "" {
		cert, err := tls.LoadX509KeyPair(config.CertPath, config.KeyPath)
		if err != nil {
			return nil, fmt.Errorf("erro ao carregar certificado: %w", err)
		}
		transport.TLSClientConfig.Certificates = []tls.Certificate{cert}
	}

	client := &Client{
		config: config,
		httpClient: &http.Client{
			Timeout:   config.Timeout,
			Transport: transport,
		},
	}

	return client, nil
}

// ============================================================================
// AUTENTICAÇÃO OAUTH2
// ============================================================================

func (c *Client) getAuthURL() string {
	if c.config.Environment == "production" {
		return ProductionAuthURL
	}
	return SandboxAuthURL
}

func (c *Client) getAPIURL() string {
	if c.config.Environment == "production" {
		return ProductionAPIURL
	}
	return SandboxAPIURL
}

// Authenticate obtém token de acesso
func (c *Client) Authenticate() error {
	c.tokenMutex.Lock()
	defer c.tokenMutex.Unlock()

	// Verificar se token ainda é válido
	if c.token != nil && time.Now().Before(c.tokenExpiry) {
		return nil
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", c.config.ClientID)
	data.Set("client_secret", c.config.ClientSecret)
	data.Set("scope", "cobranca_boletos_consultar cobranca_boletos_incluir cobranca_boletos_alterar cobranca_pagadores_consultar cob.read cob.write pix.read pix.write")

	req, err := http.NewRequest("POST", c.getAuthURL(), strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("erro ao criar request de autenticação: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro na autenticação: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("falha na autenticação: status %d, body: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return fmt.Errorf("erro ao decodificar token: %w", err)
	}

	c.token = &tokenResp
	c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)

	return nil
}

// getAccessToken retorna token válido
func (c *Client) getAccessToken() (string, error) {
	c.tokenMutex.RLock()
	if c.token != nil && time.Now().Before(c.tokenExpiry) {
		token := c.token.AccessToken
		c.tokenMutex.RUnlock()
		return token, nil
	}
	c.tokenMutex.RUnlock()

	if err := c.Authenticate(); err != nil {
		return "", err
	}

	c.tokenMutex.RLock()
	defer c.tokenMutex.RUnlock()
	return c.token.AccessToken, nil
}

// doRequest executa request autenticada
func (c *Client) doRequest(method, endpoint string, body interface{}) ([]byte, error) {
	token, err := c.getAccessToken()
	if err != nil {
		return nil, err
	}

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("erro ao serializar body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	url := c.getAPIURL() + endpoint
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-sicoob-clientid", c.config.ClientID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		var apiErr APIError
		if json.Unmarshal(respBody, &apiErr) == nil && apiErr.Mensagem != "" {
			return nil, &apiErr
		}
		return nil, fmt.Errorf("erro API: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// ============================================================================
// OPERAÇÕES DE BOLETO
// ============================================================================

// CriarBoleto emite um novo boleto
func (c *Client) CriarBoleto(boleto *Boleto) (*BoletoResponse, error) {
	boleto.NumeroContrato = c.config.NumeroContrato

	body, err := c.doRequest("POST", "/cobranca-bancaria/v2/boletos", boleto)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar boleto: %w", err)
	}

	var resp BoletoResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	return &resp, nil
}

// ConsultarBoleto busca um boleto pelo nosso número
func (c *Client) ConsultarBoleto(nossoNumero int64) (*Boleto, error) {
	endpoint := fmt.Sprintf("/cobranca-bancaria/v2/boletos?numeroContrato=%s&nossoNumero=%d",
		c.config.NumeroContrato, nossoNumero)

	body, err := c.doRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar boleto: %w", err)
	}

	var boletos struct {
		Resultado []Boleto `json:"resultado"`
	}
	if err := json.Unmarshal(body, &boletos); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	if len(boletos.Resultado) == 0 {
		return nil, fmt.Errorf("boleto não encontrado")
	}

	return &boletos.Resultado[0], nil
}

// ListarBoletos lista boletos por período
func (c *Client) ListarBoletos(dataInicio, dataFim string, situacao string) ([]Boleto, error) {
	endpoint := fmt.Sprintf("/cobranca-bancaria/v2/boletos?numeroContrato=%s&dataInicio=%s&dataFim=%s",
		c.config.NumeroContrato, dataInicio, dataFim)

	if situacao != "" {
		endpoint += "&situacao=" + situacao
	}

	body, err := c.doRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar boletos: %w", err)
	}

	var boletos struct {
		Resultado []Boleto `json:"resultado"`
	}
	if err := json.Unmarshal(body, &boletos); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	return boletos.Resultado, nil
}

// BaixarBoleto realiza baixa do boleto
func (c *Client) BaixarBoleto(nossoNumero int64) error {
	endpoint := fmt.Sprintf("/cobranca-bancaria/v2/boletos/%d/baixar", nossoNumero)

	payload := map[string]string{
		"numeroContrato": c.config.NumeroContrato,
	}

	_, err := c.doRequest("PATCH", endpoint, payload)
	if err != nil {
		return fmt.Errorf("erro ao baixar boleto: %w", err)
	}

	return nil
}

// AlterarVencimento altera data de vencimento do boleto
func (c *Client) AlterarVencimento(nossoNumero int64, novaData string) error {
	endpoint := fmt.Sprintf("/cobranca-bancaria/v2/boletos/%d/prorrogacoes", nossoNumero)

	payload := map[string]interface{}{
		"numeroContrato": c.config.NumeroContrato,
		"dataVencimento": novaData,
	}

	_, err := c.doRequest("PATCH", endpoint, payload)
	if err != nil {
		return fmt.Errorf("erro ao alterar vencimento: %w", err)
	}

	return nil
}

// ============================================================================
// OPERAÇÕES PIX
// ============================================================================

// CriarCobrancaPix cria uma cobrança PIX imediata
func (c *Client) CriarCobrancaPix(cobranca *PixCobranca) (*PixCobrancaResponse, error) {
	body, err := c.doRequest("POST", "/pix/api/v2/cob", cobranca)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cobrança PIX: %w", err)
	}

	var resp PixCobrancaResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	return &resp, nil
}

// ConsultarCobrancaPix consulta uma cobrança PIX pelo txid
func (c *Client) ConsultarCobrancaPix(txId string) (*PixCobrancaResponse, error) {
	endpoint := fmt.Sprintf("/pix/api/v2/cob/%s", txId)

	body, err := c.doRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar cobrança PIX: %w", err)
	}

	var resp PixCobrancaResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	return &resp, nil
}

// ============================================================================
// WEBHOOKS
// ============================================================================

type WebhookConfig struct {
	URL string `json:"webhookUrl"`
}

// ConfigurarWebhook configura URL de webhook para notificações
func (c *Client) ConfigurarWebhook(chave string, webhookURL string) error {
	endpoint := fmt.Sprintf("/pix/api/v2/webhook/%s", chave)

	payload := WebhookConfig{
		URL: webhookURL,
	}

	_, err := c.doRequest("PUT", endpoint, payload)
	if err != nil {
		return fmt.Errorf("erro ao configurar webhook: %w", err)
	}

	return nil
}

// ============================================================================
// SEGUNDA VIA E PDF
// ============================================================================

// GerarSegundaVia gera segunda via do boleto em PDF
func (c *Client) GerarSegundaVia(nossoNumero int64) ([]byte, error) {
	endpoint := fmt.Sprintf("/cobranca-bancaria/v2/boletos/%d/segunda-via?numeroContrato=%s",
		nossoNumero, c.config.NumeroContrato)

	body, err := c.doRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao gerar segunda via: %w", err)
	}

	return body, nil
}

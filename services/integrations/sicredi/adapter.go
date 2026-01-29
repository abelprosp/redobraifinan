// ============================================================================
// KAMINOCLONE - SICREDI BANK ADAPTER
// Integração completa com API de Cobrança do Sicredi (Boleto + PIX Híbrido)
// ============================================================================

package sicredi

import (
	"bytes"
	"context"
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
// CONFIGURAÇÃO E CONSTANTES
// ============================================================================

const (
	// URLs de Produção
	ProdAuthURL    = "https://api-parceiro.sicredi.com.br/auth/openapi/token"
	ProdBaseURL    = "https://api-parceiro.sicredi.com.br/cobranca/boleto/v1"
	
	// URLs de Sandbox/Homologação
	SandboxAuthURL = "https://api-parceiro.sicredi.com.br/sb/auth/openapi/token"
	SandboxBaseURL = "https://api-parceiro.sicredi.com.br/sb/cobranca/boleto/v1"
	
	// Contexto de autenticação
	AuthContext = "COBRANCA"
	AuthScope   = "cobranca"
)

// TipoCobranca define o tipo de boleto
type TipoCobranca string

const (
	TipoCobrancaNormal  TipoCobranca = "NORMAL"  // Boleto tradicional
	TipoCobrancaHibrido TipoCobranca = "HIBRIDO" // Boleto + PIX QRCode
)

// TipoPessoa define o tipo de pessoa
type TipoPessoa string

const (
	TipoPessoaFisica   TipoPessoa = "PESSOA_FISICA"
	TipoPessoaJuridica TipoPessoa = "PESSOA_JURIDICA"
)

// EspecieDocumento define a espécie do documento
type EspecieDocumento string

const (
	EspecieDuplicataMercantil    EspecieDocumento = "DUPLICATA_MERCANTIL_INDICACAO"
	EspecieDuplicataRural        EspecieDocumento = "DUPLICATA_RURAL"
	EspecieNotaPromissoria       EspecieDocumento = "NOTA_PROMISSORIA"
	EspecieNotaPromissoriaRural  EspecieDocumento = "NOTA_PROMISSORIA_RURAL"
	EspecieNotaSeguros           EspecieDocumento = "NOTA_SEGUROS"
	EspecieRecibo                EspecieDocumento = "RECIBO"
	EspecieLetraCambio           EspecieDocumento = "LETRA_CAMBIO"
	EspecieNotaDebito            EspecieDocumento = "NOTA_DEBITO"
	EspecieDuplicataServico      EspecieDocumento = "DUPLICATA_SERVICO_INDICACAO"
	EspecieOutros                EspecieDocumento = "OUTROS"
	EspecieBoletoProposta        EspecieDocumento = "BOLETO_PROPOSTA"
	EspecieCartaoCredito         EspecieDocumento = "CARTAO_CREDITO"
)

// TipoDesconto define o tipo de desconto
type TipoDesconto string

const (
	TipoDescontoValor      TipoDesconto = "VALOR"
	TipoDescontoPercentual TipoDesconto = "PERCENTUAL"
)

// TipoJuros define o tipo de juros
type TipoJuros string

const (
	TipoJurosValor      TipoJuros = "VALOR"
	TipoJurosPercentual TipoJuros = "PERCENTUAL"
)

// ============================================================================
// ESTRUTURAS DE CONFIGURAÇÃO
// ============================================================================

// SicrediConfig configuração do adapter Sicredi
type SicrediConfig struct {
	// Credenciais do Portal do Desenvolvedor
	APIKey string `json:"api_key"` // x-api-key (Access Token do Portal)
	
	// Credenciais do Beneficiário
	Username string `json:"username"` // Código Beneficiário + Código Cooperativa
	Password string `json:"password"` // Código de Acesso gerado no Internet Banking
	
	// Dados do Beneficiário
	Cooperativa       string `json:"cooperativa"`        // 4 dígitos
	Posto             string `json:"posto"`              // 2 dígitos (agência)
	CodigoBeneficiario string `json:"codigo_beneficiario"` // 5 dígitos
	
	// Ambiente
	UseSandbox bool `json:"use_sandbox"`
	
	// Timeouts
	Timeout    time.Duration `json:"timeout"`
	MaxRetries int           `json:"max_retries"`
}

// ============================================================================
// ESTRUTURAS DE AUTENTICAÇÃO
// ============================================================================

// AuthResponse resposta da autenticação OAuth2
type AuthResponse struct {
	AccessToken      string `json:"access_token"`
	TokenType        string `json:"token_type"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int    `json:"expires_in"`         // segundos
	RefreshExpiresIn int    `json:"refresh_expires_in"` // segundos
	Scope            string `json:"scope"`
}

// TokenInfo informações do token em uso
type TokenInfo struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	RefreshAt    time.Time
}

// ============================================================================
// ESTRUTURAS DE BOLETO
// ============================================================================

// Pagador dados do pagador do boleto
type Pagador struct {
	TipoPessoa TipoPessoa `json:"tipoPessoa"`
	Documento  string     `json:"documento"` // CPF ou CNPJ
	Nome       string     `json:"nome"`
	Endereco   string     `json:"endereco,omitempty"`
	Cidade     string     `json:"cidade,omitempty"`
	UF         string     `json:"uf,omitempty"`
	CEP        string     `json:"cep,omitempty"`
	Telefone   string     `json:"telefone,omitempty"`
	Email      string     `json:"email,omitempty"`
}

// BeneficiarioFinal dados do beneficiário final (avalista)
type BeneficiarioFinal struct {
	TipoPessoa     TipoPessoa `json:"tipoPessoa"`
	Documento      string     `json:"documento"`
	Nome           string     `json:"nome"`
	Logradouro     string     `json:"logradouro,omitempty"`
	Complemento    string     `json:"complemento,omitempty"`
	NumeroEndereco string     `json:"numeroEndereco,omitempty"`
	Cidade         string     `json:"cidade,omitempty"`
	UF             string     `json:"uf,omitempty"`
	CEP            string     `json:"cep,omitempty"`
	Telefone       string     `json:"telefone,omitempty"`
	Email          string     `json:"email,omitempty"`
}

// CriarBoletoRequest requisição para criar boleto
type CriarBoletoRequest struct {
	TipoCobranca       TipoCobranca       `json:"tipoCobranca"`
	CodigoBeneficiario string             `json:"codigoBeneficiario"`
	Pagador            Pagador            `json:"pagador"`
	BeneficiarioFinal  *BeneficiarioFinal `json:"beneficiarioFinal,omitempty"`
	EspecieDocumento   EspecieDocumento   `json:"especieDocumento"`
	NossoNumero        string             `json:"nossoNumero,omitempty"` // Opcional, Sicredi gera se não informado
	SeuNumero          string             `json:"seuNumero"`
	DataVencimento     string             `json:"dataVencimento"` // YYYY-MM-DD
	Valor              float64            `json:"valor"`
	
	// Protesto/Negativação
	DiasProtestoAuto      int `json:"diasProtestoAuto,omitempty"`
	DiasNegativacaoAuto   int `json:"diasNegativacaoAuto,omitempty"`
	ValidadeAposVencimento int `json:"validadeAposVencimento,omitempty"` // Para boleto híbrido
	
	// Descontos
	TipoDesconto       TipoDesconto `json:"tipoDesconto,omitempty"`
	ValorDesconto1     float64      `json:"valorDesconto1,omitempty"`
	DataDesconto1      string       `json:"dataDesconto1,omitempty"`
	ValorDesconto2     float64      `json:"valorDesconto2,omitempty"`
	DataDesconto2      string       `json:"dataDesconto2,omitempty"`
	ValorDesconto3     float64      `json:"valorDesconto3,omitempty"`
	DataDesconto3      string       `json:"dataDesconto3,omitempty"`
	DescontoAntecipado float64      `json:"descontoAntecipado,omitempty"`
	
	// Juros e Multa
	TipoJuros TipoJuros `json:"tipoJuros,omitempty"`
	Juros     float64   `json:"juros,omitempty"`
	Multa     float64   `json:"multa,omitempty"`
	
	// Mensagens
	Informativos []string `json:"informativos,omitempty"` // Até 5, 80 chars cada
	Mensagens    []string `json:"mensagens,omitempty"`    // Até 4, 80 chars cada
}

// CriarBoletoResponse resposta da criação de boleto
type CriarBoletoResponse struct {
	TxID          string `json:"txid,omitempty"`     // Identificador PIX (híbrido)
	QRCode        string `json:"qrCode,omitempty"`   // QR Code PIX (híbrido)
	LinhaDigitavel string `json:"linhaDigitavel"`
	CodigoBarras  string `json:"codigoBarras"`
	Cooperativa   string `json:"cooperativa"`
	Posto         string `json:"posto"`
	NossoNumero   string `json:"nossoNumero"`
}

// ConsultaBoletoResponse resposta da consulta de boleto
type ConsultaBoletoResponse struct {
	LinhaDigitavel string  `json:"linhaDigitavel"`
	CodigoBarras   string  `json:"codigoBarras"`
	Carteira       string  `json:"carteira"`
	SeuNumero      string  `json:"seuNumero"`
	NossoNumero    string  `json:"nossoNumero"`
	Pagador        struct {
		Codigo    string `json:"codigo"`
		Documento string `json:"documento"`
		Nome      string `json:"nome"`
	} `json:"pagador"`
	BeneficiarioFinal *struct {
		Codigo    string `json:"codigo"`
		Documento string `json:"documento"`
		Nome      string `json:"nome"`
	} `json:"beneficiarioFinal,omitempty"`
	DataEmissao             string  `json:"dataEmissao"`
	DataVencimento          string  `json:"dataVencimento"`
	ValorNominal            float64 `json:"valorNominal"`
	Situacao                string  `json:"situacao"`
	TxID                    string  `json:"txId,omitempty"`
	CodigoQRCode            string  `json:"codigoQrCode,omitempty"`
	Multa                   float64 `json:"multa"`
	Abatimento              float64 `json:"abatimento"`
	TipoJuros               string  `json:"tipoJuros"`
	Juros                   float64 `json:"juros"`
	DiasProtesto            int     `json:"diasProtesto"`
	ValidadeAposVencimento  int     `json:"validadeAposVencimento"`
	DiasNegativacao         int     `json:"diasNegativacao"`
	TipoDesconto            string  `json:"tipoDesconto"`
	DescontoAntecipacao     float64 `json:"descontoAntecipacao"`
	Descontos               []struct {
		NumeroOrdem    int     `json:"numeroOrdem"`
		ValorDesconto  float64 `json:"valorDesconto"`
		DataLimite     string  `json:"dataLimite"`
	} `json:"descontos"`
	DadosLiquidacao *struct {
		Data       string  `json:"data"`
		Valor      float64 `json:"valor"`
		Multa      float64 `json:"multa"`
		Abatimento float64 `json:"abatimento"`
		Juros      float64 `json:"juros"`
		Desconto   float64 `json:"desconto"`
	} `json:"dadosLiquidacao,omitempty"`
}

// ComandoInstrucaoResponse resposta de comandos de instrução
type ComandoInstrucaoResponse struct {
	TransactionID       string `json:"transactionId"`
	DataMovimento       string `json:"dataMovimento"`
	CodigoBeneficiario  string `json:"codigoBeneficiario"`
	NossoNumero         string `json:"nossoNumero"`
	Cooperativa         string `json:"cooperativa"`
	Posto               string `json:"posto"`
	StatusComando       string `json:"statusComando"`
	DataHoraRegistro    string `json:"dataHoraRegistro"`
	TipoMensagem        string `json:"tipoMensagem"`
}

// BoletoLiquidado boleto retornado na consulta de liquidados
type BoletoLiquidado struct {
	Cooperativa                  string  `json:"cooperativa"`
	CodigoBeneficiario           string  `json:"codigoBeneficiario"`
	CooperativaPostoBeneficiario string  `json:"cooperativaPostoBeneficiario"`
	NossoNumero                  string  `json:"nossoNumero"`
	SeuNumero                    string  `json:"seuNumero"`
	TipoCarteira                 string  `json:"tipoCarteira"`
	DataPagamento                string  `json:"dataPagamento"`
	Valor                        float64 `json:"valor"`
	ValorLiquidado               float64 `json:"valorLiquidado"`
	JurosLiquido                 float64 `json:"jurosLiquido"`
	DescontoLiquido              float64 `json:"descontoLiquido"`
	MultaLiquida                 float64 `json:"multaLiquida"`
	AbatimentoLiquido            float64 `json:"abatimentoLiquido"`
	TipoLiquidacao               string  `json:"tipoLiquidacao"`
}

// ConsultaLiquidadosResponse resposta da consulta de liquidados
type ConsultaLiquidadosResponse struct {
	Items   []BoletoLiquidado `json:"items"`
	HasNext bool              `json:"hasNext"`
}

// ErrorResponse resposta de erro da API
type ErrorResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// ============================================================================
// ADAPTER SICREDI
// ============================================================================

// SicrediAdapter implementação do adapter para o Sicredi
type SicrediAdapter struct {
	config     SicrediConfig
	httpClient *http.Client
	token      *TokenInfo
	tokenMu    sync.RWMutex
	
	// URLs baseadas no ambiente
	authURL string
	baseURL string
}

// NewSicrediAdapter cria uma nova instância do adapter Sicredi
func NewSicrediAdapter(config SicrediConfig) *SicrediAdapter {
	adapter := &SicrediAdapter{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
	
	// Definir URLs baseadas no ambiente
	if config.UseSandbox {
		adapter.authURL = SandboxAuthURL
		adapter.baseURL = SandboxBaseURL
	} else {
		adapter.authURL = ProdAuthURL
		adapter.baseURL = ProdBaseURL
	}
	
	return adapter
}

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

// Authenticate realiza autenticação OAuth2 e obtém tokens
func (s *SicrediAdapter) Authenticate(ctx context.Context) error {
	// Preparar dados do form
	data := url.Values{}
	data.Set("grant_type", "password")
	data.Set("username", s.config.Username)
	data.Set("password", s.config.Password)
	data.Set("scope", AuthScope)
	
	// Criar requisição
	req, err := http.NewRequestWithContext(ctx, "POST", s.authURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição de autenticação: %w", err)
	}
	
	// Headers obrigatórios
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("x-api-key", s.config.APIKey)
	req.Header.Set("context", AuthContext)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro na requisição de autenticação: %w", err)
	}
	defer resp.Body.Close()
	
	// Ler resposta
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("erro ao ler resposta: %w", err)
	}
	
	// Verificar status
	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		json.Unmarshal(body, &errResp)
		return fmt.Errorf("autenticação falhou (status %d): %s", resp.StatusCode, errResp.Message)
	}
	
	// Parse da resposta
	var authResp AuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	// Atualizar token
	s.tokenMu.Lock()
	s.token = &TokenInfo{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(authResp.ExpiresIn) * time.Second),
		RefreshAt:    time.Now().Add(time.Duration(authResp.RefreshExpiresIn) * time.Second),
	}
	s.tokenMu.Unlock()
	
	return nil
}

// RefreshAuthentication renova o token usando refresh_token
func (s *SicrediAdapter) RefreshAuthentication(ctx context.Context) error {
	s.tokenMu.RLock()
	refreshToken := s.token.RefreshToken
	s.tokenMu.RUnlock()
	
	// Preparar dados do form
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	
	// Criar requisição
	req, err := http.NewRequestWithContext(ctx, "POST", s.authURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição de refresh: %w", err)
	}
	
	// Headers obrigatórios
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("x-api-key", s.config.APIKey)
	req.Header.Set("context", AuthContext)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro na requisição de refresh: %w", err)
	}
	defer resp.Body.Close()
	
	// Verificar status
	if resp.StatusCode != http.StatusOK {
		// Refresh expirou, fazer autenticação completa
		return s.Authenticate(ctx)
	}
	
	// Parse da resposta
	body, _ := io.ReadAll(resp.Body)
	var authResp AuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	// Atualizar token
	s.tokenMu.Lock()
	s.token = &TokenInfo{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(authResp.ExpiresIn) * time.Second),
		RefreshAt:    time.Now().Add(time.Duration(authResp.RefreshExpiresIn) * time.Second),
	}
	s.tokenMu.Unlock()
	
	return nil
}

// ensureValidToken garante que temos um token válido
func (s *SicrediAdapter) ensureValidToken(ctx context.Context) error {
	s.tokenMu.RLock()
	token := s.token
	s.tokenMu.RUnlock()
	
	// Sem token - autenticar
	if token == nil {
		return s.Authenticate(ctx)
	}
	
	// Token expirado - refresh ou reautenticar
	if time.Now().After(token.ExpiresAt.Add(-30 * time.Second)) {
		if time.Now().Before(token.RefreshAt.Add(-30 * time.Second)) {
			return s.RefreshAuthentication(ctx)
		}
		return s.Authenticate(ctx)
	}
	
	return nil
}

// ============================================================================
// MÉTODOS DE BOLETO
// ============================================================================

// CriarBoleto cria um novo boleto (tradicional ou híbrido com PIX)
func (s *SicrediAdapter) CriarBoleto(ctx context.Context, boleto CriarBoletoRequest) (*CriarBoletoResponse, error) {
	// Garantir token válido
	if err := s.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("erro de autenticação: %w", err)
	}
	
	// Preparar body
	body, err := json.Marshal(boleto)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar boleto: %w", err)
	}
	
	// Criar requisição
	url := s.baseURL + "/boletos"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}
	
	// Headers
	s.setCommonHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("cooperativa", s.config.Cooperativa)
	req.Header.Set("posto", s.config.Posto)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %w", err)
	}
	defer resp.Body.Close()
	
	// Ler resposta
	respBody, _ := io.ReadAll(resp.Body)
	
	// Verificar status
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusAccepted {
		var errResp ErrorResponse
		json.Unmarshal(respBody, &errResp)
		return nil, fmt.Errorf("erro ao criar boleto (status %d): %s", resp.StatusCode, errResp.Message)
	}
	
	// Parse da resposta
	var result CriarBoletoResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	return &result, nil
}

// ConsultarBoleto consulta um boleto pelo nosso número
func (s *SicrediAdapter) ConsultarBoleto(ctx context.Context, nossoNumero string) (*ConsultaBoletoResponse, error) {
	// Garantir token válido
	if err := s.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("erro de autenticação: %w", err)
	}
	
	// Criar requisição
	url := fmt.Sprintf("%s/boletos?codigoBeneficiario=%s&nossoNumero=%s",
		s.baseURL, s.config.CodigoBeneficiario, nossoNumero)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}
	
	// Headers
	s.setCommonHeaders(req)
	req.Header.Set("cooperativa", s.config.Cooperativa)
	req.Header.Set("posto", s.config.Posto)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %w", err)
	}
	defer resp.Body.Close()
	
	// Ler resposta
	respBody, _ := io.ReadAll(resp.Body)
	
	// Verificar status
	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		json.Unmarshal(respBody, &errResp)
		return nil, fmt.Errorf("erro ao consultar boleto (status %d): %s", resp.StatusCode, errResp.Message)
	}
	
	// Parse da resposta
	var result ConsultaBoletoResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	return &result, nil
}

// ImprimirBoleto obtém o PDF do boleto
func (s *SicrediAdapter) ImprimirBoleto(ctx context.Context, linhaDigitavel string) ([]byte, error) {
	// Garantir token válido
	if err := s.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("erro de autenticação: %w", err)
	}
	
	// Criar requisição
	url := fmt.Sprintf("%s/boletos/pdf?linhaDigitavel=%s", s.baseURL, linhaDigitavel)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}
	
	// Headers
	s.setCommonHeaders(req)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %w", err)
	}
	defer resp.Body.Close()
	
	// Verificar status
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("erro ao imprimir boleto (status %d): %s", resp.StatusCode, string(body))
	}
	
	// Retornar bytes do PDF
	return io.ReadAll(resp.Body)
}

// ============================================================================
// COMANDOS DE INSTRUÇÃO
// ============================================================================

// BaixarBoleto solicita baixa de um boleto
func (s *SicrediAdapter) BaixarBoleto(ctx context.Context, nossoNumero string) (*ComandoInstrucaoResponse, error) {
	return s.executarComandoInstrucao(ctx, nossoNumero, "baixa", nil)
}

// AlterarVencimento altera a data de vencimento de um boleto
func (s *SicrediAdapter) AlterarVencimento(ctx context.Context, nossoNumero string, novaData string) (*ComandoInstrucaoResponse, error) {
	body := map[string]string{"dataVencimento": novaData}
	return s.executarComandoInstrucao(ctx, nossoNumero, "data-vencimento", body)
}

// AlterarDesconto altera os valores de desconto de um boleto
func (s *SicrediAdapter) AlterarDesconto(ctx context.Context, nossoNumero string, desconto1, desconto2, desconto3 float64) (*ComandoInstrucaoResponse, error) {
	body := map[string]float64{}
	if desconto1 > 0 {
		body["valorDesconto1"] = desconto1
	}
	if desconto2 > 0 {
		body["valorDesconto2"] = desconto2
	}
	if desconto3 > 0 {
		body["valorDesconto3"] = desconto3
	}
	return s.executarComandoInstrucao(ctx, nossoNumero, "desconto", body)
}

// AlterarDataDesconto altera as datas de desconto de um boleto
func (s *SicrediAdapter) AlterarDataDesconto(ctx context.Context, nossoNumero string, data1, data2, data3 string) (*ComandoInstrucaoResponse, error) {
	body := map[string]string{}
	if data1 != "" {
		body["data1"] = data1
	}
	if data2 != "" {
		body["data2"] = data2
	}
	if data3 != "" {
		body["data3"] = data3
	}
	return s.executarComandoInstrucao(ctx, nossoNumero, "data-desconto", body)
}

// AlterarJuros altera o valor/percentual de juros de um boleto
func (s *SicrediAdapter) AlterarJuros(ctx context.Context, nossoNumero string, valorOuPercentual float64) (*ComandoInstrucaoResponse, error) {
	body := map[string]float64{"valorOuPercentual": valorOuPercentual}
	return s.executarComandoInstrucao(ctx, nossoNumero, "juros", body)
}

// AlterarSeuNumero altera o "seu número" de um boleto
func (s *SicrediAdapter) AlterarSeuNumero(ctx context.Context, nossoNumero string, novoSeuNumero string) (*ComandoInstrucaoResponse, error) {
	body := map[string]string{"seuNumero": novoSeuNumero}
	return s.executarComandoInstrucao(ctx, nossoNumero, "seu-numero", body)
}

// executarComandoInstrucao executa um comando de instrução genérico
func (s *SicrediAdapter) executarComandoInstrucao(ctx context.Context, nossoNumero, comando string, body interface{}) (*ComandoInstrucaoResponse, error) {
	// Garantir token válido
	if err := s.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("erro de autenticação: %w", err)
	}
	
	// Preparar body
	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("erro ao serializar body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	} else {
		bodyReader = strings.NewReader("{}")
	}
	
	// Criar requisição
	url := fmt.Sprintf("%s/boletos/%s/%s", s.baseURL, nossoNumero, comando)
	
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}
	
	// Headers
	s.setCommonHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("cooperativa", s.config.Cooperativa)
	req.Header.Set("posto", s.config.Posto)
	req.Header.Set("codigoBeneficiario", s.config.CodigoBeneficiario)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %w", err)
	}
	defer resp.Body.Close()
	
	// Ler resposta
	respBody, _ := io.ReadAll(resp.Body)
	
	// Verificar status
	if resp.StatusCode != http.StatusAccepted {
		var errResp ErrorResponse
		json.Unmarshal(respBody, &errResp)
		return nil, fmt.Errorf("erro no comando %s (status %d): %s", comando, resp.StatusCode, errResp.Message)
	}
	
	// Parse da resposta
	var result ComandoInstrucaoResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	return &result, nil
}

// ============================================================================
// CONSULTAS
// ============================================================================

// ConsultarLiquidadosPorDia consulta boletos liquidados em uma data específica
func (s *SicrediAdapter) ConsultarLiquidadosPorDia(ctx context.Context, data string, pagina int) (*ConsultaLiquidadosResponse, error) {
	// Garantir token válido
	if err := s.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("erro de autenticação: %w", err)
	}
	
	// Criar requisição
	url := fmt.Sprintf("%s/boletos/liquidados/dia?codigoBeneficiario=%s&dia=%s",
		s.baseURL, s.config.CodigoBeneficiario, data)
	
	if pagina > 0 {
		url += fmt.Sprintf("&pagina=%d", pagina)
	}
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %w", err)
	}
	
	// Headers
	s.setCommonHeaders(req)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("cooperativa", s.config.Cooperativa)
	req.Header.Set("posto", s.config.Posto)
	
	// Executar requisição
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro na requisição: %w", err)
	}
	defer resp.Body.Close()
	
	// Ler resposta
	respBody, _ := io.ReadAll(resp.Body)
	
	// Verificar status
	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		json.Unmarshal(respBody, &errResp)
		return nil, fmt.Errorf("erro ao consultar liquidados (status %d): %s", resp.StatusCode, errResp.Message)
	}
	
	// Parse da resposta
	var result ConsultaLiquidadosResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("erro ao parsear resposta: %w", err)
	}
	
	return &result, nil
}

// ============================================================================
// HELPERS
// ============================================================================

// setCommonHeaders define os headers comuns para todas as requisições
func (s *SicrediAdapter) setCommonHeaders(req *http.Request) {
	s.tokenMu.RLock()
	token := s.token
	s.tokenMu.RUnlock()
	
	req.Header.Set("x-api-key", s.config.APIKey)
	if token != nil {
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	}
}

// HealthCheck verifica se a API está acessível
func (s *SicrediAdapter) HealthCheck(ctx context.Context) error {
	return s.ensureValidToken(ctx)
}

// GetProviderName retorna o nome do provedor
func (s *SicrediAdapter) GetProviderName() string {
	return "SICREDI"
}

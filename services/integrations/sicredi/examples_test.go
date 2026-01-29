// ============================================================================
// KAMINOCLONE - SICREDI ADAPTER - EXEMPLOS DE USO
// ============================================================================

package sicredi_test

import (
	"context"
	"fmt"
	"log"
	"time"
	
	"kaminoclone/services/integrations/sicredi"
)

// ExampleCriarBoletoTradicional demonstra criação de boleto tradicional
func ExampleCriarBoletoTradicional() {
	// Configuração do adapter
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key-do-portal",          // x-api-key do Portal do Desenvolvedor
		Username:           "123456789",                       // CodigoBeneficiario + CodigoCooperativa
		Password:           "codigo-acesso-internet-banking",  // Gerado no Internet Banking
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true, // true para homologação
		Timeout:            30 * time.Second,
		MaxRetries:         3,
	}
	
	// Criar adapter
	adapter := sicredi.NewSicrediAdapter(config)
	
	// Autenticar
	ctx := context.Background()
	if err := adapter.Authenticate(ctx); err != nil {
		log.Fatalf("Erro na autenticação: %v", err)
	}
	
	// Criar boleto tradicional
	boleto := sicredi.CriarBoletoRequest{
		TipoCobranca:       sicredi.TipoCobrancaNormal,
		CodigoBeneficiario: "12345",
		Pagador: sicredi.Pagador{
			TipoPessoa: sicredi.TipoPessoaFisica,
			Documento:  "12345678909", // CPF
			Nome:       "JOÃO DA SILVA",
			Endereco:   "RUA DAS FLORES, 123",
			Cidade:     "PORTO ALEGRE",
			UF:         "RS",
			CEP:        "91250000",
		},
		EspecieDocumento: sicredi.EspecieDuplicataMercantil,
		SeuNumero:        "NF-001234",
		DataVencimento:   "2026-02-28",
		Valor:            150.00,
		TipoJuros:        sicredi.TipoJurosValor,
		Juros:            1.00, // R$ 1,00 por dia
		Multa:            2.00, // 2%
		Informativos: []string{
			"Referente a compra realizada em 28/01/2026",
			"Pedido número 001234",
		},
	}
	
	// Executar criação
	resp, err := adapter.CriarBoleto(ctx, boleto)
	if err != nil {
		log.Fatalf("Erro ao criar boleto: %v", err)
	}
	
	fmt.Printf("Boleto criado com sucesso!\n")
	fmt.Printf("Nosso Número: %s\n", resp.NossoNumero)
	fmt.Printf("Linha Digitável: %s\n", resp.LinhaDigitavel)
	fmt.Printf("Código de Barras: %s\n", resp.CodigoBarras)
}

// ExampleCriarBoletoHibrido demonstra criação de boleto híbrido (com PIX)
func ExampleCriarBoletoHibrido() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key-do-portal",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	
	if err := adapter.Authenticate(ctx); err != nil {
		log.Fatalf("Erro na autenticação: %v", err)
	}
	
	// Boleto híbrido (com QR Code PIX)
	boleto := sicredi.CriarBoletoRequest{
		TipoCobranca:       sicredi.TipoCobrancaHibrido, // PIX habilitado
		CodigoBeneficiario: "12345",
		Pagador: sicredi.Pagador{
			TipoPessoa: sicredi.TipoPessoaJuridica,
			Documento:  "12345678000199", // CNPJ
			Nome:       "EMPRESA LTDA",
			Endereco:   "AV COMERCIAL, 500",
			Cidade:     "SAO PAULO",
			UF:         "SP",
			CEP:        "01310100",
			Email:      "financeiro@empresa.com.br",
		},
		BeneficiarioFinal: &sicredi.BeneficiarioFinal{
			TipoPessoa: sicredi.TipoPessoaFisica,
			Documento:  "98765432100",
			Nome:       "MARIA OLIVEIRA",
		},
		EspecieDocumento:       sicredi.EspecieDuplicataServico,
		SeuNumero:              "SERV-2026-001",
		DataVencimento:         "2026-03-15",
		Valor:                  2500.00,
		ValidadeAposVencimento: 30, // QRCode válido por 30 dias após vencimento
		
		// Descontos progressivos
		TipoDesconto:   sicredi.TipoDescontoValor,
		ValorDesconto1: 100.00,
		DataDesconto1:  "2026-02-28",
		ValorDesconto2: 50.00,
		DataDesconto2:  "2026-03-07",
		
		// Juros e multa
		TipoJuros: sicredi.TipoJurosPercentual,
		Juros:     0.033, // 0.033% ao dia = 1% ao mês
		Multa:     2.00,  // 2%
		
		Mensagens: []string{
			"Após o vencimento, cobrar multa de 2%",
			"e juros de 1% ao mês",
		},
	}
	
	resp, err := adapter.CriarBoleto(ctx, boleto)
	if err != nil {
		log.Fatalf("Erro ao criar boleto: %v", err)
	}
	
	fmt.Printf("Boleto Híbrido criado!\n")
	fmt.Printf("Nosso Número: %s\n", resp.NossoNumero)
	fmt.Printf("Linha Digitável: %s\n", resp.LinhaDigitavel)
	fmt.Printf("TX ID (PIX): %s\n", resp.TxID)
	fmt.Printf("QR Code (PIX Copia e Cola): %s\n", resp.QRCode)
}

// ExampleConsultarBoleto demonstra consulta de boleto
func ExampleConsultarBoleto() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	adapter.Authenticate(ctx)
	
	// Consultar boleto pelo nosso número
	boleto, err := adapter.ConsultarBoleto(ctx, "211001234")
	if err != nil {
		log.Fatalf("Erro ao consultar: %v", err)
	}
	
	fmt.Printf("Situação: %s\n", boleto.Situacao)
	fmt.Printf("Valor Nominal: R$ %.2f\n", boleto.ValorNominal)
	fmt.Printf("Vencimento: %s\n", boleto.DataVencimento)
	fmt.Printf("Pagador: %s\n", boleto.Pagador.Nome)
	
	if boleto.DadosLiquidacao != nil {
		fmt.Printf("\n=== LIQUIDADO ===\n")
		fmt.Printf("Data: %s\n", boleto.DadosLiquidacao.Data)
		fmt.Printf("Valor Pago: R$ %.2f\n", boleto.DadosLiquidacao.Valor)
	}
}

// ExampleBaixarBoleto demonstra baixa de boleto
func ExampleBaixarBoleto() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	adapter.Authenticate(ctx)
	
	// Solicitar baixa
	resp, err := adapter.BaixarBoleto(ctx, "211001234")
	if err != nil {
		log.Fatalf("Erro ao baixar boleto: %v", err)
	}
	
	fmt.Printf("Baixa solicitada com sucesso!\n")
	fmt.Printf("Transaction ID: %s\n", resp.TransactionID)
	fmt.Printf("Status: %s\n", resp.StatusComando)
}

// ExampleAlterarVencimento demonstra alteração de vencimento
func ExampleAlterarVencimento() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	adapter.Authenticate(ctx)
	
	// Alterar vencimento
	resp, err := adapter.AlterarVencimento(ctx, "211001234", "2026-03-30")
	if err != nil {
		log.Fatalf("Erro ao alterar vencimento: %v", err)
	}
	
	fmt.Printf("Vencimento alterado!\n")
	fmt.Printf("Status: %s\n", resp.StatusComando)
}

// ExampleConsultarLiquidados demonstra consulta de boletos liquidados
func ExampleConsultarLiquidados() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	adapter.Authenticate(ctx)
	
	// Consultar liquidados do dia
	pagina := 0
	for {
		resp, err := adapter.ConsultarLiquidadosPorDia(ctx, "28/01/2026", pagina)
		if err != nil {
			log.Fatalf("Erro ao consultar liquidados: %v", err)
		}
		
		for _, boleto := range resp.Items {
			fmt.Printf("Nosso Número: %s\n", boleto.NossoNumero)
			fmt.Printf("Valor: R$ %.2f\n", boleto.Valor)
			fmt.Printf("Valor Liquidado: R$ %.2f\n", boleto.ValorLiquidado)
			fmt.Printf("Tipo Liquidação: %s\n", boleto.TipoLiquidacao)
			fmt.Println("---")
		}
		
		if !resp.HasNext {
			break
		}
		pagina++
	}
}

// ExampleImprimirBoleto demonstra download do PDF do boleto
func ExampleImprimirBoleto() {
	config := sicredi.SicrediConfig{
		APIKey:             "seu-api-key",
		Username:           "123456789",
		Password:           "codigo-acesso",
		Cooperativa:        "0100",
		Posto:              "02",
		CodigoBeneficiario: "12345",
		UseSandbox:         true,
		Timeout:            30 * time.Second,
	}
	
	adapter := sicredi.NewSicrediAdapter(config)
	ctx := context.Background()
	adapter.Authenticate(ctx)
	
	// Obter PDF
	linhaDigitavel := "74891125110061420512803153351030188640000009990"
	pdfBytes, err := adapter.ImprimirBoleto(ctx, linhaDigitavel)
	if err != nil {
		log.Fatalf("Erro ao imprimir boleto: %v", err)
	}
	
	fmt.Printf("PDF gerado com %d bytes\n", len(pdfBytes))
	
	// Salvar em arquivo
	// os.WriteFile("boleto.pdf", pdfBytes, 0644)
}

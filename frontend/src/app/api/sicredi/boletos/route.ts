import { NextRequest, NextResponse } from "next/server"

// Simulação da integração com Sicredi
// Em produção, usar o adapter Go via chamada HTTP ou gRPC

interface SicrediBoletoRequest {
  tipoCobranca: "NORMAL" | "HIBRIDO"
  pagador: {
    tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA"
    documento: string
    nome: string
    endereco?: string
    cidade?: string
    uf?: string
    cep?: string
    email?: string
  }
  especieDocumento: string
  seuNumero: string
  dataVencimento: string
  valor: number
  juros?: number
  multa?: number
  mensagens?: string[]
}

// POST - Criar boleto via Sicredi
export async function POST(request: NextRequest) {
  try {
    const body: SicrediBoletoRequest = await request.json()

    // Validações
    if (!body.pagador || !body.valor || !body.dataVencimento) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      )
    }

    // Simular chamada ao Sicredi
    // Em produção: chamar o backend Go com o adapter Sicredi
    const mockResponse = {
      txid: body.tipoCobranca === "HIBRIDO" ? `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}` : null,
      qrCode: body.tipoCobranca === "HIBRIDO"
        ? "00020126930014br.gov.bcb.pix2571pix-qrcodeh.sicredi.com.br/qr/v2/cobv/example520400005303986540599.905802BR5921EMPRESA TESTE6008BRASILIA62070503***63047A1B"
        : null,
      linhaDigitavel: "74891.12511 00614.205128 03153.351030 1 88640000" + String(Math.floor(body.valor * 100)).padStart(6, "0"),
      codigoBarras: "748918864000000" + String(Math.floor(body.valor * 100)).padStart(6, "0") + "112510061420512031533510",
      cooperativa: process.env.SICREDI_COOPERATIVA || "0100",
      posto: process.env.SICREDI_POSTO || "02",
      nossoNumero: "21100" + String(Math.floor(Math.random() * 10000)).padStart(4, "0"),
    }

    return NextResponse.json(
      {
        success: true,
        message: "Boleto criado com sucesso via Sicredi",
        data: mockResponse,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar boleto Sicredi:", error)
    return NextResponse.json(
      { error: "Erro ao comunicar com Sicredi" },
      { status: 500 }
    )
  }
}

// GET - Consultar boleto via Sicredi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nossoNumero = searchParams.get("nossoNumero")

    if (!nossoNumero) {
      return NextResponse.json(
        { error: "Nosso número é obrigatório" },
        { status: 400 }
      )
    }

    // Simular consulta ao Sicredi
    const mockBoleto = {
      linhaDigitavel: "74891.12511 00614.205128 03153.351030 1 88640000009990",
      codigoBarras: "74891886400000099901125100614205120315335103",
      carteira: "SIMPLES",
      seuNumero: "REF-001",
      nossoNumero,
      pagador: {
        codigo: "12345",
        documento: "12345678909",
        nome: "CLIENTE TESTE",
      },
      dataEmissao: "2026-01-20",
      dataVencimento: "2026-02-05",
      valorNominal: 99.90,
      situacao: "EM CARTEIRA PIX",
      txId: "f69d2a0076fb4ea2bddd7babd1200525",
      codigoQrCode: "00020126930014br.gov.bcb.pix...",
    }

    return NextResponse.json({
      success: true,
      data: mockBoleto,
    })
  } catch (error) {
    console.error("Erro ao consultar boleto Sicredi:", error)
    return NextResponse.json(
      { error: "Erro ao comunicar com Sicredi" },
      { status: 500 }
    )
  }
}

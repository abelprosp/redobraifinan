import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// WEBHOOK PÚBLICO PARA CONSULTA DE BOLETOS
// Autenticação: telefone + 4 primeiros dígitos do CPF/CNPJ
// ============================================================================

interface ConsultaBoletoRequest {
  telefone: string
  senha: string
}

interface BoletoResponse {
  id: string
  nossoNumero: string | null
  linhaDigitavel: string | null
  codigoBarras: string | null
  qrCode: string | null
  txId: string | null
  valor: number
  valorPago: number | null
  dataEmissao: string
  dataVencimento: string
  dataPagamento: string | null
  status: string
  pagadorNome: string
  descricao: string | null
  vencido: boolean
  diasVencimento: number
}

// ============================================================================
// POST - Consultar boletos por telefone e senha
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body: ConsultaBoletoRequest = await request.json()

    // Validar campos obrigatórios
    if (!body.telefone || !body.senha) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos. Informe telefone e senha.",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      )
    }

    // Normalizar telefone (remover caracteres não numéricos)
    const telefone = body.telefone.replace(/\D/g, "")
    if (telefone.length < 10 || telefone.length > 11) {
      return NextResponse.json(
        {
          success: false,
          error: "Telefone inválido. Informe DDD + número (10 ou 11 dígitos).",
          code: "INVALID_PHONE",
        },
        { status: 400 }
      )
    }

    // Validar senha (deve ter exatamente 4 dígitos)
    const senha = body.senha.trim()
    if (senha.length !== 4 || !/^\d+$/.test(senha)) {
      return NextResponse.json(
        {
          success: false,
          error: "Senha inválida. Informe os 4 primeiros dígitos do seu CPF ou CNPJ.",
          code: "INVALID_PASSWORD",
        },
        { status: 400 }
      )
    }

    // Buscar cliente pelo telefone (celular ou telefone fixo)
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { telefone: { contains: telefone } },
          { celular: { contains: telefone } },
          // Também tentar com formatação
          { telefone: telefone },
          { celular: telefone },
        ],
        status: "ATIVO",
      },
    })

    if (!cliente) {
      // Log de tentativa falha
      console.log(`[WEBHOOK] Telefone não encontrado: ${telefone}`)
      
      return NextResponse.json(
        {
          success: false,
          error: "Telefone não encontrado no sistema.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      )
    }

    // Validar senha (primeiros 4 dígitos do documento)
    const documentoLimpo = cliente.documento.replace(/\D/g, "")
    const primeiros4Digitos = documentoLimpo.substring(0, 4)

    if (senha !== primeiros4Digitos) {
      // Log de tentativa falha
      console.log(`[WEBHOOK] Senha incorreta para cliente ${cliente.id}`)
      
      return NextResponse.json(
        {
          success: false,
          error: "Senha incorreta. A senha são os 4 primeiros dígitos do seu CPF ou CNPJ.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      )
    }

    // Buscar boletos do cliente
    const boletos = await prisma.boleto.findMany({
      where: {
        clienteId: cliente.id,
        status: {
          notIn: ["CANCELADO", "BAIXADO"],
        },
      },
      orderBy: [
        { status: "asc" }, // PENDENTE primeiro
        { dataVencimento: "asc" },
      ],
    })

    // Calcular dias de vencimento e formatar resposta
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const boletosResponse: BoletoResponse[] = boletos.map((boleto) => {
      const vencimento = new Date(boleto.dataVencimento)
      vencimento.setHours(0, 0, 0, 0)
      
      const diffTime = vencimento.getTime() - hoje.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        id: boleto.id,
        nossoNumero: boleto.nossoNumero,
        linhaDigitavel: boleto.linhaDigitavel,
        codigoBarras: boleto.codigoBarras,
        qrCode: boleto.qrCode,
        txId: boleto.txId,
        valor: Number(boleto.valor),
        valorPago: boleto.valorPago ? Number(boleto.valorPago) : null,
        dataEmissao: boleto.dataEmissao.toISOString().split("T")[0],
        dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
        dataPagamento: boleto.dataPagamento?.toISOString().split("T")[0] || null,
        status: boleto.status.toLowerCase(),
        pagadorNome: cliente.nome,
        descricao: boleto.mensagem1 || boleto.seuNumero || null,
        vencido: diffDays < 0,
        diasVencimento: diffDays,
      }
    })

    // Log de sucesso
    console.log(`[WEBHOOK] Consulta realizada - Cliente: ${cliente.id}, Boletos: ${boletos.length}`)

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: boletos.length > 0 
        ? "Boletos encontrados com sucesso" 
        : "Nenhum boleto encontrado para este cliente",
      cliente: cliente.nome,
      total: boletos.length,
      boletos: boletosResponse,
    })
  } catch (error) {
    console.error("[WEBHOOK] Erro ao consultar boletos:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar boletos. Tente novamente.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Informações sobre o endpoint
// ============================================================================
export async function GET() {
  return NextResponse.json({
    service: "Webhook de Consulta de Boletos",
    version: "1.0.0",
    description: "API pública para consulta de boletos por telefone e senha",
    usage: {
      method: "POST",
      endpoint: "/api/webhook/boletos/consultar",
      body: {
        telefone: "Número do telefone (DDD + número)",
        senha: "Primeiros 4 dígitos do CPF ou CNPJ",
      },
      example: {
        telefone: "11999998888",
        senha: "1234",
      },
    },
  })
}

// ============================================================================
// OPTIONS - CORS preflight
// ============================================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  })
}

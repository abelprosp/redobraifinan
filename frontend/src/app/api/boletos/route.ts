import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// GET - Listar boletos
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return unauthorized()
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json(
        { error: "Empresa não configurada" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const clienteId = searchParams.get("clienteId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    // Construir filtro
    const where: Prisma.BoletoWhereInput = {
      companyId,
    }

    if (status && status !== "todos") {
      where.status = status.toUpperCase() as any
    }

    if (clienteId) {
      where.clienteId = clienteId
    }

    if (search) {
      where.OR = [
        { nossoNumero: { contains: search, mode: "insensitive" } },
        { seuNumero: { contains: search, mode: "insensitive" } },
        { cliente: { nome: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Buscar boletos com paginação
    const [boletos, total] = await Promise.all([
      prisma.boleto.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              documento: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.boleto.count({ where }),
    ])

    // Formatar resposta
    const data = boletos.map((boleto) => ({
      id: boleto.id,
      nossoNumero: boleto.nossoNumero,
      seuNumero: boleto.seuNumero,
      cliente: boleto.cliente.nome,
      clienteDoc: boleto.cliente.documento,
      clienteEmail: boleto.cliente.email,
      valor: Number(boleto.valor),
      valorPago: boleto.valorPago ? Number(boleto.valorPago) : null,
      dataEmissao: boleto.dataEmissao.toISOString().split("T")[0],
      dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
      dataPagamento: boleto.dataPagamento?.toISOString().split("T")[0] || null,
      status: boleto.status.toLowerCase(),
      tipo: boleto.tipoCobranca,
      linhaDigitavel: boleto.linhaDigitavel,
      qrCode: boleto.qrCode,
      txId: boleto.txId,
    }))

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erro ao listar boletos:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Criar novo boleto
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return unauthorized()
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json(
        { error: "Empresa não configurada" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validações básicas
    if ((!body.clienteId && !body.clienteDocumento) || !body.valor || !body.dataVencimento) {
      return NextResponse.json(
        { error: "Campos obrigatórios: clienteId ou clienteDocumento, valor, dataVencimento" },
        { status: 400 }
      )
    }

    // Buscar cliente por ID ou documento
    let cliente
    if (body.clienteId) {
      cliente = await prisma.cliente.findFirst({
        where: { 
          id: body.clienteId,
          companyId: companyId,
        },
      })
    } else if (body.clienteDocumento) {
      const docLimpo = body.clienteDocumento.replace(/\D/g, "")
      cliente = await prisma.cliente.findFirst({
        where: { 
          documento: docLimpo,
          companyId: companyId,
        },
      })
    }

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      )
    }

    // Gerar nosso número
    const count = await prisma.boleto.count({ where: { companyId } })
    const ano = new Date().getFullYear().toString().slice(-2)
    const seq = String(count + 1).padStart(6, "0")
    const nossoNumero = `${ano}2${seq}1`

    // Criar boleto
    const boleto = await prisma.boleto.create({
      data: {
        companyId,
        clienteId: cliente.id,
        nossoNumero,
        seuNumero: body.seuNumero || null,
        tipoCobranca: body.tipo || "HIBRIDO",
        especieDocumento: body.especieDocumento || "DUPLICATA_SERVICO_INDICACAO",
        valor: body.valor,
        dataVencimento: new Date(body.dataVencimento),
        tipoJuros: body.tipoJuros || "PERCENTUAL",
        juros: body.juros || 0.033,
        multa: body.multa || 2,
        desconto1: body.desconto1 || null,
        dataDesconto1: body.dataDesconto1 ? new Date(body.dataDesconto1) : null,
        mensagem1: body.mensagem1 || null,
        mensagem2: body.mensagem2 || null,
        status: "PENDENTE",
        linhaDigitavel: `74891.12511 00614.205128 ${nossoNumero.slice(0, 5)}.351030 1 ${String(Math.floor(body.valor * 100)).padStart(10, "0")}`,
        codigoBarras: `7489188640${String(Math.floor(body.valor * 100)).padStart(10, "0")}1125100614205120`,
        txId: body.tipo === "HIBRIDO" ? `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}` : null,
        qrCode: body.tipo === "HIBRIDO" ? `00020126930014br.gov.bcb.pix2571pix.sicredi.com.br/${nossoNumero}520400005303986${String(Math.floor(body.valor * 100)).padStart(10, "0")}5802BR` : null,
      },
      include: {
        cliente: {
          select: {
            nome: true,
            documento: true,
          },
        },
      },
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "boleto",
        entityId: boleto.id,
        newData: {
          nossoNumero: boleto.nossoNumero,
          valor: Number(boleto.valor),
          cliente: boleto.cliente.nome,
        },
      },
    })

    return NextResponse.json(
      {
        message: "Boleto criado com sucesso",
        data: {
          id: boleto.id,
          nossoNumero: boleto.nossoNumero,
          cliente: boleto.cliente.nome,
          clienteDoc: boleto.cliente.documento,
          valor: Number(boleto.valor),
          dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
          status: boleto.status.toLowerCase(),
          tipo: boleto.tipoCobranca,
          linhaDigitavel: boleto.linhaDigitavel,
          codigoBarras: boleto.codigoBarras,
          qrCode: boleto.qrCode,
          txId: boleto.txId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar boleto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

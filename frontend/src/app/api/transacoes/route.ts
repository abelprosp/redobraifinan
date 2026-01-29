import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// GET - Listar transações
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return unauthorized()
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não configurada" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")
    const status = searchParams.get("status")
    const contaId = searchParams.get("contaId")
    const clienteId = searchParams.get("clienteId")
    const dataInicio = searchParams.get("dataInicio")
    const dataFim = searchParams.get("dataFim")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Prisma.TransacaoWhereInput = { companyId }

    if (tipo && tipo !== "todos") {
      where.tipo = tipo.toUpperCase() as any
    }

    if (status && status !== "todos") {
      where.status = status.toUpperCase() as any
    }

    if (contaId) {
      where.OR = [
        { contaOrigemId: contaId },
        { contaDestinoId: contaId },
      ]
    }

    if (clienteId) {
      where.clienteId = clienteId
    }

    if (dataInicio || dataFim) {
      where.dataTransacao = {}
      if (dataInicio) where.dataTransacao.gte = new Date(dataInicio)
      if (dataFim) where.dataTransacao.lte = new Date(dataFim)
    }

    const [transacoes, total] = await Promise.all([
      prisma.transacao.findMany({
        where,
        include: {
          cliente: { select: { nome: true } },
          contaOrigem: { select: { nome: true } },
          contaDestino: { select: { nome: true } },
          boleto: { select: { nossoNumero: true } },
        },
        orderBy: { dataTransacao: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transacao.count({ where }),
    ])

    // Calcular totais
    const totais = await prisma.transacao.groupBy({
      by: ["tipo"],
      where: { ...where, status: "CONCLUIDA" },
      _sum: { valor: true },
    })

    const totalEntradas = totais.find(t => t.tipo === "ENTRADA")?._sum.valor || 0
    const totalSaidas = totais.find(t => t.tipo === "SAIDA")?._sum.valor || 0

    const data = transacoes.map((t) => ({
      id: t.id,
      tipo: t.tipo.toLowerCase(),
      status: t.status.toLowerCase(),
      valor: Number(t.valor),
      descricao: t.descricao,
      cliente: t.cliente?.nome || null,
      contaOrigem: t.contaOrigem?.nome || null,
      contaDestino: t.contaDestino?.nome || null,
      boleto: t.boleto?.nossoNumero || null,
      formaPagamento: t.formaPagamento,
      dataTransacao: t.dataTransacao.toISOString().split("T")[0],
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({
      data,
      totais: {
        entradas: Number(totalEntradas),
        saidas: Number(totalSaidas),
        saldo: Number(totalEntradas) - Number(totalSaidas),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erro ao listar transações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ============================================================================
// POST - Criar nova transação
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return unauthorized()
    }

    const companyId = session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não configurada" }, { status: 400 })
    }

    const body = await request.json()

    if (!body.tipo || !body.valor) {
      return NextResponse.json(
        { error: "Campos obrigatórios: tipo, valor" },
        { status: 400 }
      )
    }

    // Criar transação
    const transacao = await prisma.transacao.create({
      data: {
        companyId,
        tipo: body.tipo.toUpperCase(),
        status: "CONCLUIDA",
        valor: body.valor,
        descricao: body.descricao || null,
        clienteId: body.clienteId || null,
        contaOrigemId: body.contaOrigemId || null,
        contaDestinoId: body.contaDestinoId || null,
        formaPagamento: body.formaPagamento || null,
        dataTransacao: body.dataTransacao ? new Date(body.dataTransacao) : new Date(),
      },
    })

    // Atualizar saldo das contas
    if (body.contaOrigemId && body.tipo === "SAIDA") {
      await prisma.conta.update({
        where: { id: body.contaOrigemId },
        data: { saldo: { decrement: body.valor } },
      })
    }

    if (body.contaDestinoId && body.tipo === "ENTRADA") {
      await prisma.conta.update({
        where: { id: body.contaDestinoId },
        data: { saldo: { increment: body.valor } },
      })
    }

    if (body.tipo === "TRANSFERENCIA" && body.contaOrigemId && body.contaDestinoId) {
      await prisma.conta.update({
        where: { id: body.contaOrigemId },
        data: { saldo: { decrement: body.valor } },
      })
      await prisma.conta.update({
        where: { id: body.contaDestinoId },
        data: { saldo: { increment: body.valor } },
      })
    }

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "transacao",
        entityId: transacao.id,
        newData: { tipo: transacao.tipo, valor: Number(transacao.valor) },
      },
    })

    return NextResponse.json(
      {
        message: "Transação criada com sucesso",
        data: {
          id: transacao.id,
          tipo: transacao.tipo.toLowerCase(),
          valor: Number(transacao.valor),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar transação:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// GET - Estatísticas do Dashboard
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

    // Datas para cálculos
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0)
    const em3Dias = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Buscar dados em paralelo
    const [
      totalClientes,
      clientesAtivos,
      boletosMesAtual,
      boletosPagosMesAtual,
      boletosMesAnterior,
      boletosPagosMesAnterior,
      boletosVencendo,
      transacoesRecentes,
      receitaMesAtual,
      receitaMesAnterior,
    ] = await Promise.all([
      prisma.cliente.count({ where: { companyId } }),
      prisma.cliente.count({ where: { companyId, status: "ATIVO" } }),
      prisma.boleto.count({
        where: {
          companyId,
          createdAt: { gte: inicioMes },
        },
      }),
      prisma.boleto.count({
        where: {
          companyId,
          status: "PAGO",
          dataPagamento: { gte: inicioMes },
        },
      }),
      prisma.boleto.count({
        where: {
          companyId,
          createdAt: {
            gte: inicioMesAnterior,
            lte: fimMesAnterior,
          },
        },
      }),
      prisma.boleto.count({
        where: {
          companyId,
          status: "PAGO",
          dataPagamento: {
            gte: inicioMesAnterior,
            lte: fimMesAnterior,
          },
        },
      }),
      prisma.boleto.findMany({
        where: {
          companyId,
          status: "PENDENTE",
          dataVencimento: {
            gte: now,
            lte: em3Dias,
          },
        },
        include: {
          cliente: {
            select: { nome: true },
          },
        },
        orderBy: { dataVencimento: "asc" },
        take: 5,
      }),
      prisma.boleto.findMany({
        where: {
          companyId,
          status: "PAGO",
        },
        include: {
          cliente: {
            select: { nome: true },
          },
        },
        orderBy: { dataPagamento: "desc" },
        take: 5,
      }),
      prisma.boleto.aggregate({
        where: {
          companyId,
          status: "PAGO",
          dataPagamento: { gte: inicioMes },
        },
        _sum: { valorPago: true },
      }),
      prisma.boleto.aggregate({
        where: {
          companyId,
          status: "PAGO",
          dataPagamento: {
            gte: inicioMesAnterior,
            lte: fimMesAnterior,
          },
        },
        _sum: { valorPago: true },
      }),
    ])

    // Calcular variações
    const receitaAtual = Number(receitaMesAtual._sum.valorPago) || 0
    const receitaAnterior = Number(receitaMesAnterior._sum.valorPago) || 0
    const variacaoReceita = receitaAnterior > 0
      ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
      : receitaAtual > 0 ? 100 : 0

    const variacaoBoletos = boletosMesAnterior > 0
      ? ((boletosMesAtual - boletosMesAnterior) / boletosMesAnterior) * 100
      : boletosMesAtual > 0 ? 100 : 0

    const variacaoPagos = boletosPagosMesAnterior > 0
      ? ((boletosPagosMesAtual - boletosPagosMesAnterior) / boletosPagosMesAnterior) * 100
      : boletosPagosMesAtual > 0 ? 100 : 0

    return NextResponse.json({
      data: {
        stats: {
          receita: {
            valor: receitaAtual,
            variacao: Number(variacaoReceita.toFixed(1)),
          },
          clientes: {
            total: totalClientes,
            ativos: clientesAtivos,
            variacao: 0,
          },
          boletosEmitidos: {
            valor: boletosMesAtual,
            variacao: Number(variacaoBoletos.toFixed(1)),
          },
          boletosRecebidos: {
            valor: boletosPagosMesAtual,
            variacao: Number(variacaoPagos.toFixed(1)),
          },
        },
        boletosVencendo: boletosVencendo.map((b) => ({
          id: b.id,
          cliente: b.cliente.nome,
          valor: Number(b.valor),
          vencimento: b.dataVencimento.toISOString().split("T")[0],
          diasRestantes: Math.ceil(
            (b.dataVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
        transacoesRecentes: transacoesRecentes.map((b) => ({
          id: b.id,
          cliente: b.cliente.nome,
          tipo: b.tipoCobranca === "HIBRIDO" ? "PIX" : "Boleto",
          valor: Number(b.valorPago || b.valor),
          status: "completed",
          data: b.dataPagamento?.toISOString().split("T")[0],
        })),
      },
    })
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

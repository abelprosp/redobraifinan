import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// GET - Receita mensal (últimos 6 meses)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId") || "default"
    const meses = parseInt(searchParams.get("meses") || "6")

    const now = new Date()
    const dados: { mes: string; receita: number; boletos: number }[] = []

    // Buscar dados dos últimos N meses
    for (let i = meses - 1; i >= 0; i--) {
      const inicioMes = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const fimMes = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const [receita, totalBoletos] = await Promise.all([
        prisma.boleto.aggregate({
          where: {
            companyId,
            status: "PAGO",
            dataPagamento: {
              gte: inicioMes,
              lte: fimMes,
            },
          },
          _sum: { valorPago: true },
        }),
        prisma.boleto.count({
          where: {
            companyId,
            status: "PAGO",
            dataPagamento: {
              gte: inicioMes,
              lte: fimMes,
            },
          },
        }),
      ])

      const nomesMeses = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
      ]

      dados.push({
        mes: nomesMeses[inicioMes.getMonth()],
        receita: Number(receita._sum.valorPago) || 0,
        boletos: totalBoletos,
      })
    }

    return NextResponse.json({
      data: dados,
    })
  } catch (error) {
    console.error("Erro ao buscar receita mensal:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

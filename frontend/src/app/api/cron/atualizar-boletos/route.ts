import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// CRON JOB - ATUALIZAR STATUS DOS BOLETOS
// Executado diariamente às 8h (configurado no vercel.json)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autorização (Vercel Cron ou secret)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    // Vercel Cron envia um header especial
    const isVercelCron = request.headers.get("x-vercel-cron") === "1"
    
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // 1. Marcar boletos vencidos
    const boletosVencidos = await prisma.boleto.updateMany({
      where: {
        status: "PENDENTE",
        dataVencimento: {
          lt: hoje,
        },
      },
      data: {
        status: "VENCIDO",
      },
    })

    // 2. Buscar boletos para verificar pagamento (opcional - integração com banco)
    // Aqui você pode adicionar lógica para consultar o banco e atualizar status

    // 3. Log de execução
    console.log(`[CRON] Boletos atualizados: ${boletosVencidos.count} marcados como vencidos`)

    return NextResponse.json({
      success: true,
      message: "Boletos atualizados com sucesso",
      stats: {
        vencidos: boletosVencidos.count,
        dataExecucao: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[CRON] Erro ao atualizar boletos:", error)
    
    return NextResponse.json(
      { error: "Erro ao atualizar boletos" },
      { status: 500 }
    )
  }
}

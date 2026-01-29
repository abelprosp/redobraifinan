import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Ativar/Desativar integração
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { provider } = params
    const body = await request.json()
    const { active } = body

    // Buscar integração
    const integracao = await prisma.integracaoBancaria.findUnique({
      where: {
        companyId_provider: {
          companyId: session.user.companyId,
          provider: provider,
        },
      },
    })

    if (!integracao) {
      return NextResponse.json(
        { error: "Integração não encontrada" },
        { status: 404 }
      )
    }

    // Se ativando, verificar se tem credenciais
    if (active === true) {
      const hasCredentials = !!(
        integracao.clientId || 
        integracao.apiKey || 
        (integracao.username && integracao.password)
      )

      if (!hasCredentials) {
        return NextResponse.json(
          { error: "Configure as credenciais antes de ativar" },
          { status: 400 }
        )
      }

      // Verificar última conexão
      if (integracao.lastConnectionStatus === "error") {
        return NextResponse.json(
          { error: "Teste a conexão antes de ativar. Último teste falhou." },
          { status: 400 }
        )
      }
    }

    // Atualizar status
    const updated = await prisma.integracaoBancaria.update({
      where: { id: integracao.id },
      data: {
        isActive: active === true,
      },
    })

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: active ? "ACTIVATE" : "DEACTIVATE",
        entity: "integracao_bancaria",
        entityId: integracao.id,
        oldData: { isActive: integracao.isActive },
        newData: { isActive: updated.isActive },
      },
    })

    return NextResponse.json({
      success: true,
      isActive: updated.isActive,
      message: updated.isActive ? "Integração ativada" : "Integração desativada",
    })
  } catch (error) {
    console.error("Erro ao toggle integração:", error)
    return NextResponse.json(
      { error: "Erro ao alterar status da integração" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Buscar integração específica
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { provider } = params

    const integracao = await prisma.integracaoBancaria.findUnique({
      where: {
        companyId_provider: {
          companyId: session.user.companyId,
          provider: provider,
        },
      },
    })

    if (!integracao) {
      // Retornar objeto vazio para nova integração
      return NextResponse.json({
        provider,
        nome: provider.charAt(0).toUpperCase() + provider.slice(1),
        isActive: false,
        environment: "sandbox",
        hasCredentials: false,
      })
    }

    // Retornar sem dados sensíveis completos (apenas indicadores)
    return NextResponse.json({
      id: integracao.id,
      provider: integracao.provider,
      nome: integracao.nome,
      isActive: integracao.isActive,
      environment: integracao.environment,
      cooperativa: integracao.cooperativa,
      agencia: integracao.agencia,
      conta: integracao.conta,
      posto: integracao.posto,
      codigoBeneficiario: integracao.codigoBeneficiario,
      numeroContrato: integracao.numeroContrato,
      chavePix: integracao.chavePix,
      webhookUrl: integracao.webhookUrl,
      lastConnectionAt: integracao.lastConnectionAt,
      lastConnectionStatus: integracao.lastConnectionStatus,
      lastError: integracao.lastError,
      createdAt: integracao.createdAt,
      updatedAt: integracao.updatedAt,
      // Indicadores de credenciais (sem expor valores)
      hasClientId: !!integracao.clientId,
      hasClientSecret: !!integracao.clientSecret,
      hasApiKey: !!integracao.apiKey,
      hasUsername: !!integracao.username,
      hasPassword: !!integracao.password,
      hasCredentials: !!(
        integracao.clientId || 
        integracao.apiKey || 
        (integracao.username && integracao.password)
      ),
    })
  } catch (error) {
    console.error("Erro ao buscar integração:", error)
    return NextResponse.json(
      { error: "Erro ao buscar integração" },
      { status: 500 }
    )
  }
}

// DELETE - Remover integração
export async function DELETE(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { provider } = params

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

    await prisma.integracaoBancaria.delete({
      where: { id: integracao.id },
    })

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "integracao_bancaria",
        entityId: integracao.id,
        oldData: { provider },
      },
    })

    return NextResponse.json({ message: "Integração removida" })
  } catch (error) {
    console.error("Erro ao remover integração:", error)
    return NextResponse.json(
      { error: "Erro ao remover integração" },
      { status: 500 }
    )
  }
}

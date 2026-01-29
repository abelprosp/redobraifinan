import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Listar integrações da empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const integracoes = await prisma.integracaoBancaria.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        provider: true,
        nome: true,
        isActive: true,
        environment: true,
        cooperativa: true,
        agencia: true,
        conta: true,
        posto: true,
        codigoBeneficiario: true,
        numeroContrato: true,
        chavePix: true,
        webhookUrl: true,
        lastConnectionAt: true,
        lastConnectionStatus: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        // NÃO retornar dados sensíveis
        // clientId, clientSecret, apiKey, password, etc
      },
      orderBy: {
        provider: "asc",
      },
    })

    // Adicionar indicador de credenciais configuradas
    const integracoesComStatus = integracoes.map((int) => ({
      ...int,
      hasCredentials: true, // Será verificado abaixo
    }))

    // Verificar quais têm credenciais (sem expor os valores)
    for (const integracao of integracoesComStatus) {
      const full = await prisma.integracaoBancaria.findUnique({
        where: { id: integracao.id },
        select: {
          clientId: true,
          clientSecret: true,
          apiKey: true,
          username: true,
          password: true,
        },
      })
      
      integracao.hasCredentials = !!(
        full?.clientId || 
        full?.apiKey || 
        (full?.username && full?.password)
      )
    }

    return NextResponse.json(integracoesComStatus)
  } catch (error) {
    console.error("Erro ao listar integrações:", error)
    return NextResponse.json(
      { error: "Erro ao listar integrações" },
      { status: 500 }
    )
  }
}

// POST - Criar/Atualizar integração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    
    const {
      provider,
      nome,
      environment,
      clientId,
      clientSecret,
      apiKey,
      username,
      password,
      cooperativa,
      agencia,
      conta,
      posto,
      codigoBeneficiario,
      numeroContrato,
      chavePix,
      certPath,
      keyPath,
      webhookUrl,
    } = body

    if (!provider) {
      return NextResponse.json(
        { error: "Provider é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const existing = await prisma.integracaoBancaria.findUnique({
      where: {
        companyId_provider: {
          companyId: session.user.companyId,
          provider: provider,
        },
      },
    })

    let integracao

    if (existing) {
      // Atualizar existente
      const updateData: any = {
        nome: nome || existing.nome,
        environment: environment || existing.environment,
        cooperativa: cooperativa ?? existing.cooperativa,
        agencia: agencia ?? existing.agencia,
        conta: conta ?? existing.conta,
        posto: posto ?? existing.posto,
        codigoBeneficiario: codigoBeneficiario ?? existing.codigoBeneficiario,
        numeroContrato: numeroContrato ?? existing.numeroContrato,
        chavePix: chavePix ?? existing.chavePix,
        certPath: certPath ?? existing.certPath,
        keyPath: keyPath ?? existing.keyPath,
        webhookUrl: webhookUrl ?? existing.webhookUrl,
      }

      // Só atualizar credenciais se foram fornecidas
      if (clientId) updateData.clientId = clientId
      if (clientSecret) updateData.clientSecret = clientSecret
      if (apiKey) updateData.apiKey = apiKey
      if (username) updateData.username = username
      if (password) updateData.password = password

      integracao = await prisma.integracaoBancaria.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      // Criar nova
      integracao = await prisma.integracaoBancaria.create({
        data: {
          companyId: session.user.companyId,
          provider,
          nome: nome || provider.charAt(0).toUpperCase() + provider.slice(1),
          environment: environment || "sandbox",
          clientId,
          clientSecret,
          apiKey,
          username,
          password,
          cooperativa,
          agencia,
          conta,
          posto,
          codigoBeneficiario,
          numeroContrato,
          chavePix,
          certPath,
          keyPath,
          webhookUrl,
          isActive: false,
        },
      })
    }

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: existing ? "UPDATE" : "CREATE",
        entity: "integracao_bancaria",
        entityId: integracao.id,
        newData: {
          provider,
          environment,
          cooperativa,
          hasCredentials: !!(clientId || apiKey || username),
        },
      },
    })

    // Retornar sem dados sensíveis
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
      hasCredentials: !!(clientId || clientSecret || apiKey || username),
      message: existing ? "Integração atualizada" : "Integração criada",
    })
  } catch (error) {
    console.error("Erro ao salvar integração:", error)
    return NextResponse.json(
      { error: "Erro ao salvar integração" },
      { status: 500 }
    )
  }
}

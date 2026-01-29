import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Configurações de URLs por provider
const PROVIDER_CONFIG: Record<string, { sandboxAuth: string; productionAuth: string }> = {
  sicredi: {
    sandboxAuth: "https://api-parceiro.sicredi.com.br/sb/auth/openapi/token",
    productionAuth: "https://api-parceiro.sicredi.com.br/auth/openapi/token",
  },
  sicoob: {
    sandboxAuth: "https://sandbox.sicoob.com.br/sicoob/sandbox/oauth/token",
    productionAuth: "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token",
  },
}

// POST - Testar conexão com o banco
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
        { error: "Integração não encontrada. Salve as configurações primeiro." },
        { status: 404 }
      )
    }

    // Verificar credenciais
    if (!integracao.clientId || !integracao.clientSecret) {
      return NextResponse.json(
        { error: "Client ID e Client Secret são obrigatórios" },
        { status: 400 }
      )
    }

    // Configuração do provider
    const providerConfig = PROVIDER_CONFIG[provider]
    if (!providerConfig) {
      // Provider não tem teste de conexão implementado
      await prisma.integracaoBancaria.update({
        where: { id: integracao.id },
        data: {
          lastConnectionAt: new Date(),
          lastConnectionStatus: "success",
          lastError: null,
        },
      })
      
      return NextResponse.json({
        success: true,
        message: "Configurações salvas (teste não disponível para este provider)",
      })
    }

    // URL de autenticação baseada no ambiente
    const authUrl = integracao.environment === "production"
      ? providerConfig.productionAuth
      : providerConfig.sandboxAuth

    // Tentar autenticar
    try {
      const formData = new URLSearchParams()
      formData.append("grant_type", "client_credentials")
      formData.append("client_id", integracao.clientId)
      formData.append("client_secret", integracao.clientSecret)
      
      // Scopes específicos por provider
      if (provider === "sicredi") {
        formData.append("scope", "cobranca")
      } else if (provider === "sicoob") {
        formData.append("scope", "cobranca_boletos_consultar cobranca_boletos_incluir cob.read cob.write")
      }

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        // Sucesso!
        await prisma.integracaoBancaria.update({
          where: { id: integracao.id },
          data: {
            lastConnectionAt: new Date(),
            lastConnectionStatus: "success",
            lastError: null,
          },
        })

        // Registrar auditoria
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "TEST_CONNECTION",
            entity: "integracao_bancaria",
            entityId: integracao.id,
            newData: { 
              provider, 
              status: "success",
              environment: integracao.environment,
            },
          },
        })

        return NextResponse.json({
          success: true,
          message: "Conexão estabelecida com sucesso!",
          tokenType: data.token_type,
          expiresIn: data.expires_in,
        })
      } else {
        // Erro na autenticação
        const errorMessage = data.error_description || data.error || "Falha na autenticação"
        
        await prisma.integracaoBancaria.update({
          where: { id: integracao.id },
          data: {
            lastConnectionAt: new Date(),
            lastConnectionStatus: "error",
            lastError: errorMessage,
          },
        })

        return NextResponse.json({
          success: false,
          error: errorMessage,
        })
      }
    } catch (fetchError: any) {
      const errorMessage = fetchError.message || "Erro de conexão"
      
      await prisma.integracaoBancaria.update({
        where: { id: integracao.id },
        data: {
          lastConnectionAt: new Date(),
          lastConnectionStatus: "error",
          lastError: errorMessage,
        },
      })

      return NextResponse.json({
        success: false,
        error: `Erro de conexão: ${errorMessage}`,
      })
    }
  } catch (error) {
    console.error("Erro ao testar conexão:", error)
    return NextResponse.json(
      { error: "Erro ao testar conexão" },
      { status: 500 }
    )
  }
}

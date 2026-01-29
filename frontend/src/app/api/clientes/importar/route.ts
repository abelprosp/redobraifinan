import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// POST - Importar/Atualizar cliente (upsert por documento)
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

    // Validações
    if (!body.nome || !body.documento) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, documento" },
        { status: 400 }
      )
    }

    const documentoLimpo = body.documento.replace(/\D/g, "")
    const tipoPessoa = documentoLimpo.length <= 11 ? "PF" : "PJ"
    const acao = body.acao || "upsert" // criar, atualizar, upsert

    // Verificar se cliente já existe
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        companyId,
        documento: documentoLimpo,
      },
    })

    let cliente
    let atualizado = false

    if (clienteExistente && (acao === "atualizar" || acao === "upsert")) {
      // Atualizar cliente existente
      cliente = await prisma.cliente.update({
        where: { id: clienteExistente.id },
        data: {
          nome: body.nome,
          nomeFantasia: body.nomeFantasia || clienteExistente.nomeFantasia,
          email: body.email || clienteExistente.email,
          telefone: body.telefone || clienteExistente.telefone,
          celular: body.celular || clienteExistente.celular,
          endereco: body.endereco || clienteExistente.endereco,
          numero: body.numero || clienteExistente.numero,
          bairro: body.bairro || clienteExistente.bairro,
          cidade: body.cidade || clienteExistente.cidade,
          uf: body.uf || body.estado || clienteExistente.uf,
          cep: body.cep?.replace(/\D/g, "") || clienteExistente.cep,
          tipoTributacao: body.tipoTributacao || clienteExistente.tipoTributacao,
          observacoes: body.observacoes || clienteExistente.observacoes,
        },
      })
      atualizado = true

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "cliente",
          entityId: cliente.id,
          oldData: {
            nome: clienteExistente.nome,
            email: clienteExistente.email,
          },
          newData: {
            nome: cliente.nome,
            email: cliente.email,
            importacao: true,
          },
        },
      })
    } else if (clienteExistente && acao === "criar") {
      // Não criar duplicata
      return NextResponse.json(
        { error: "Cliente com este documento já existe" },
        { status: 409 }
      )
    } else {
      // Criar novo cliente
      cliente = await prisma.cliente.create({
        data: {
          companyId,
          tipoPessoa: body.tipo || tipoPessoa,
          documento: documentoLimpo,
          nome: body.nome,
          nomeFantasia: body.nomeFantasia || null,
          email: body.email || null,
          telefone: body.telefone || null,
          celular: body.celular || null,
          endereco: body.endereco || null,
          numero: body.numero || null,
          complemento: body.complemento || null,
          bairro: body.bairro || null,
          cidade: body.cidade || null,
          uf: body.uf || body.estado || null,
          cep: body.cep?.replace(/\D/g, "") || null,
          status: "ATIVO",
          observacoes: body.observacoes || null,
          tipoTributacao: body.tipoTributacao || "SEM_RETENCAO",
        },
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entity: "cliente",
          entityId: cliente.id,
          newData: {
            nome: cliente.nome,
            documento: cliente.documento,
            importacao: true,
          },
        },
      })
    }

    return NextResponse.json(
      {
        message: atualizado ? "Cliente atualizado com sucesso" : "Cliente criado com sucesso",
        atualizado,
        data: {
          id: cliente.id,
          nome: cliente.nome,
          documento: cliente.documento,
          tipo: cliente.tipoPessoa,
          status: cliente.status.toLowerCase(),
          createdAt: cliente.createdAt.toISOString(),
        },
      },
      { status: atualizado ? 200 : 201 }
    )
  } catch (error) {
    console.error("Erro ao importar cliente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

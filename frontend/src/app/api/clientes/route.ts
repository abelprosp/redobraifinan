import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// GET - Listar clientes
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
    const tipo = searchParams.get("tipo")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    // Construir filtro
    const where: Prisma.ClienteWhereInput = {
      companyId,
    }

    if (status && status !== "todos") {
      where.status = status.toUpperCase() as any
    }

    if (tipo && tipo !== "todos") {
      where.tipoPessoa = tipo as any
    }

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { documento: { contains: search } },
      ]
    }

    // Buscar clientes com paginação e contagem de boletos
    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          _count: {
            select: {
              boletos: true,
            },
          },
          boletos: {
            where: { status: "PENDENTE" },
            select: { valor: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ])

    // Formatar resposta
    const data = clientes.map((cliente) => {
      const saldoPendente = cliente.boletos.reduce(
        (acc, b) => acc + Number(b.valor),
        0
      )

      return {
        id: cliente.id,
        nome: cliente.nome,
        nomeFantasia: cliente.nomeFantasia,
        email: cliente.email,
        telefone: cliente.telefone,
        documento: cliente.documento,
        tipo: cliente.tipoPessoa,
        status: cliente.status.toLowerCase(),
        saldo: saldoPendente,
        totalBoletos: cliente._count.boletos,
        endereco: cliente.endereco
          ? `${cliente.endereco}, ${cliente.numero || ""} - ${cliente.cidade}/${cliente.uf}`
          : null,
        dataCadastro: cliente.createdAt.toISOString().split("T")[0],
      }
    })

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
    console.error("Erro ao listar clientes:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Criar novo cliente
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

    // Verificar se documento já existe para esta empresa
    const existe = await prisma.cliente.findFirst({
      where: {
        companyId,
        documento: body.documento.replace(/\D/g, ""),
      },
    })

    if (existe) {
      return NextResponse.json(
        { error: "Cliente com este documento já existe" },
        { status: 409 }
      )
    }

    // Determinar tipo de pessoa pelo tamanho do documento
    const documentoLimpo = body.documento.replace(/\D/g, "")
    const tipoPessoa = documentoLimpo.length <= 11 ? "PF" : "PJ"

    // Criar cliente
    const cliente = await prisma.cliente.create({
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
        },
      },
    })

    return NextResponse.json(
      {
        message: "Cliente criado com sucesso",
        data: {
          id: cliente.id,
          nome: cliente.nome,
          documento: cliente.documento,
          tipo: cliente.tipoPessoa,
          status: cliente.status.toLowerCase(),
          createdAt: cliente.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

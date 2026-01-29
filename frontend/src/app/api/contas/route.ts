import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// GET - Listar contas
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

    const contas = await prisma.conta.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    })

    // Calcular saldo total
    const saldoTotal = contas.reduce((acc, c) => acc + Number(c.saldo), 0)

    const data = contas.map((conta) => ({
      id: conta.id,
      nome: conta.nome,
      descricao: conta.descricao,
      tipo: conta.tipo,
      saldo: Number(conta.saldo),
      banco: conta.banco,
      agencia: conta.agencia,
      numeroConta: conta.numeroConta,
      isActive: conta.isActive,
      createdAt: conta.createdAt.toISOString().split("T")[0],
    }))

    return NextResponse.json({
      data,
      saldoTotal,
    })
  } catch (error) {
    console.error("Erro ao listar contas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// ============================================================================
// POST - Criar nova conta
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

    if (!body.nome || !body.tipo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, tipo" },
        { status: 400 }
      )
    }

    const conta = await prisma.conta.create({
      data: {
        companyId,
        nome: body.nome,
        descricao: body.descricao || null,
        tipo: body.tipo,
        saldo: body.saldoInicial || 0,
        banco: body.banco || null,
        agencia: body.agencia || null,
        numeroConta: body.numeroConta || null,
        isActive: true,
      },
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "conta",
        entityId: conta.id,
        newData: { nome: conta.nome, tipo: conta.tipo },
      },
    })

    return NextResponse.json(
      {
        message: "Conta criada com sucesso",
        data: {
          id: conta.id,
          nome: conta.nome,
          tipo: conta.tipo,
          saldo: Number(conta.saldo),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar conta:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// GET - Buscar cliente por ID
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            boletos: true,
            transacoes: true,
          },
        },
        boletos: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            nossoNumero: true,
            valor: true,
            dataVencimento: true,
            status: true,
          },
        },
      },
    })

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        id: cliente.id,
        nome: cliente.nome,
        nomeFantasia: cliente.nomeFantasia,
        documento: cliente.documento,
        tipo: cliente.tipoPessoa,
        email: cliente.email,
        telefone: cliente.telefone,
        celular: cliente.celular,
        endereco: {
          logradouro: cliente.endereco,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          uf: cliente.uf,
          cep: cliente.cep,
        },
        status: cliente.status.toLowerCase(),
        observacoes: cliente.observacoes,
        totalBoletos: cliente._count.boletos,
        totalTransacoes: cliente._count.transacoes,
        ultimosBoletos: cliente.boletos.map((b) => ({
          id: b.id,
          nossoNumero: b.nossoNumero,
          valor: Number(b.valor),
          dataVencimento: b.dataVencimento.toISOString().split("T")[0],
          status: b.status.toLowerCase(),
        })),
        createdAt: cliente.createdAt.toISOString(),
        updatedAt: cliente.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Atualizar cliente
// ============================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Verificar se cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
    })

    if (!clienteExistente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      )
    }

    // Construir dados de atualização
    const updateData: any = {}

    if (body.nome) updateData.nome = body.nome
    if (body.nomeFantasia !== undefined) updateData.nomeFantasia = body.nomeFantasia
    if (body.email !== undefined) updateData.email = body.email
    if (body.telefone !== undefined) updateData.telefone = body.telefone
    if (body.celular !== undefined) updateData.celular = body.celular
    if (body.endereco !== undefined) updateData.endereco = body.endereco
    if (body.numero !== undefined) updateData.numero = body.numero
    if (body.complemento !== undefined) updateData.complemento = body.complemento
    if (body.bairro !== undefined) updateData.bairro = body.bairro
    if (body.cidade !== undefined) updateData.cidade = body.cidade
    if (body.uf !== undefined) updateData.uf = body.uf
    if (body.cep !== undefined) updateData.cep = body.cep?.replace(/\D/g, "")
    if (body.observacoes !== undefined) updateData.observacoes = body.observacoes

    // Tratar mudança de status
    if (body.status) {
      updateData.status = body.status.toUpperCase()
    }

    // Atualizar cliente
    const cliente = await prisma.cliente.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: "Cliente atualizado com sucesso",
      data: {
        id: cliente.id,
        nome: cliente.nome,
        status: cliente.status.toLowerCase(),
        updatedAt: cliente.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Excluir cliente
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: { boletos: true },
        },
      },
    })

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se tem boletos vinculados
    if (cliente._count.boletos > 0) {
      // Soft delete - apenas desativar
      await prisma.cliente.update({
        where: { id },
        data: { status: "INATIVO" },
      })

      return NextResponse.json({
        message: "Cliente desativado (possui boletos vinculados)",
        data: { id, status: "inativo" },
      })
    }

    // Hard delete se não tiver boletos
    await prisma.cliente.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Cliente excluído com sucesso",
      data: { id },
    })
  } catch (error) {
    console.error("Erro ao excluir cliente:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

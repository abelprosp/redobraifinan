import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// GET - Buscar boleto por ID
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const boleto = await prisma.boleto.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            documento: true,
            email: true,
            telefone: true,
            endereco: true,
            cidade: true,
            uf: true,
            cep: true,
          },
        },
      },
    })

    if (!boleto) {
      return NextResponse.json(
        { error: "Boleto não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: {
        id: boleto.id,
        nossoNumero: boleto.nossoNumero,
        seuNumero: boleto.seuNumero,
        cliente: boleto.cliente,
        valor: Number(boleto.valor),
        valorPago: boleto.valorPago ? Number(boleto.valorPago) : null,
        dataEmissao: boleto.dataEmissao.toISOString().split("T")[0],
        dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
        dataPagamento: boleto.dataPagamento?.toISOString().split("T")[0] || null,
        status: boleto.status.toLowerCase(),
        tipo: boleto.tipoCobranca,
        especieDocumento: boleto.especieDocumento,
        linhaDigitavel: boleto.linhaDigitavel,
        codigoBarras: boleto.codigoBarras,
        qrCode: boleto.qrCode,
        txId: boleto.txId,
        juros: boleto.juros ? Number(boleto.juros) : null,
        multa: boleto.multa ? Number(boleto.multa) : null,
        mensagem1: boleto.mensagem1,
        mensagem2: boleto.mensagem2,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar boleto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Atualizar boleto (baixa, cancelar, alterar vencimento)
// ============================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Verificar se boleto existe
    const boletoExistente = await prisma.boleto.findUnique({
      where: { id },
    })

    if (!boletoExistente) {
      return NextResponse.json(
        { error: "Boleto não encontrado" },
        { status: 404 }
      )
    }

    // Tratar ações específicas
    let updateData: any = {}

    switch (body.action) {
      case "baixar":
        if (boletoExistente.status !== "PENDENTE") {
          return NextResponse.json(
            { error: "Apenas boletos pendentes podem ser baixados" },
            { status: 400 }
          )
        }
        updateData.status = "BAIXADO"
        break

      case "cancelar":
        if (boletoExistente.status === "PAGO") {
          return NextResponse.json(
            { error: "Boletos pagos não podem ser cancelados" },
            { status: 400 }
          )
        }
        updateData.status = "CANCELADO"
        break

      case "alterar-vencimento":
        if (!body.dataVencimento) {
          return NextResponse.json(
            { error: "Nova data de vencimento é obrigatória" },
            { status: 400 }
          )
        }
        updateData.dataVencimento = new Date(body.dataVencimento)
        break

      case "registrar-pagamento":
        updateData.status = "PAGO"
        updateData.valorPago = body.valorPago || boletoExistente.valor
        updateData.dataPagamento = body.dataPagamento ? new Date(body.dataPagamento) : new Date()
        break

      default:
        // Atualização genérica
        if (body.dataVencimento) updateData.dataVencimento = new Date(body.dataVencimento)
        if (body.valor) updateData.valor = body.valor
        if (body.juros !== undefined) updateData.juros = body.juros
        if (body.multa !== undefined) updateData.multa = body.multa
    }

    // Atualizar boleto
    const boleto = await prisma.boleto.update({
      where: { id },
      data: updateData,
      include: {
        cliente: {
          select: {
            nome: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: `Boleto ${body.action || "atualizado"} com sucesso`,
      data: {
        id: boleto.id,
        nossoNumero: boleto.nossoNumero,
        status: boleto.status.toLowerCase(),
        updatedAt: boleto.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Erro ao atualizar boleto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Cancelar boleto
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verificar se boleto existe
    const boleto = await prisma.boleto.findUnique({
      where: { id },
    })

    if (!boleto) {
      return NextResponse.json(
        { error: "Boleto não encontrado" },
        { status: 404 }
      )
    }

    if (boleto.status === "PAGO") {
      return NextResponse.json(
        { error: "Boletos pagos não podem ser cancelados" },
        { status: 400 }
      )
    }

    // Atualizar status para cancelado (soft delete)
    await prisma.boleto.update({
      where: { id },
      data: { status: "CANCELADO" },
    })

    return NextResponse.json({
      message: "Boleto cancelado com sucesso",
      data: { id, status: "cancelado" },
    })
  } catch (error) {
    console.error("Erro ao cancelar boleto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

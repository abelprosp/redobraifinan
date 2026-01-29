import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getSession, unauthorized } from "@/lib/auth-utils"

// ============================================================================
// POST - Importar/Atualizar boleto (upsert por documento + seuNumero)
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

    // Validações básicas
    if (!body.clienteDocumento || !body.valor || !body.dataVencimento) {
      return NextResponse.json(
        { error: "Campos obrigatórios: clienteDocumento, valor, dataVencimento" },
        { status: 400 }
      )
    }

    // Buscar cliente por documento
    const docLimpo = body.clienteDocumento.replace(/\D/g, "")
    const cliente = await prisma.cliente.findFirst({
      where: { 
        documento: docLimpo,
        companyId: companyId,
      },
    })

    if (!cliente) {
      return NextResponse.json(
        { error: `Cliente com documento ${body.clienteDocumento} não encontrado` },
        { status: 404 }
      )
    }

    const acao = body.acao || "upsert" // criar, atualizar, upsert
    const seuNumero = body.seuNumero || null

    // Verificar se já existe um boleto com este seuNumero para este cliente
    let boletoExistente = null
    if (seuNumero) {
      boletoExistente = await prisma.boleto.findFirst({
        where: {
          companyId,
          clienteId: cliente.id,
          seuNumero: seuNumero,
        },
      })
    }

    let boleto
    let atualizado = false

    if (boletoExistente && (acao === "atualizar" || acao === "upsert")) {
      // Atualizar boleto existente
      boleto = await prisma.boleto.update({
        where: { id: boletoExistente.id },
        data: {
          valor: body.valor,
          dataVencimento: new Date(body.dataVencimento),
          tipoCobranca: body.tipo || boletoExistente.tipoCobranca,
          mensagem1: body.descricao || boletoExistente.mensagem1,
          // Não atualizar status se já foi pago
          ...(boletoExistente.status === "PENDENTE" && {
            status: "PENDENTE",
          }),
        },
        include: {
          cliente: {
            select: {
              nome: true,
              documento: true,
            },
          },
        },
      })
      atualizado = true

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "boleto",
          entityId: boleto.id,
          oldData: {
            valor: Number(boletoExistente.valor),
            dataVencimento: boletoExistente.dataVencimento.toISOString().split("T")[0],
          },
          newData: {
            valor: Number(boleto.valor),
            dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
            importacao: true,
          },
        },
      })
    } else if (boletoExistente && acao === "criar") {
      // Não criar duplicata - retornar erro
      return NextResponse.json(
        { error: `Boleto com referência "${seuNumero}" já existe para este cliente` },
        { status: 409 }
      )
    } else {
      // Criar novo boleto
      const count = await prisma.boleto.count({ where: { companyId } })
      const ano = new Date().getFullYear().toString().slice(-2)
      const seq = String(count + 1).padStart(6, "0")
      const nossoNumero = `${ano}2${seq}1`

      boleto = await prisma.boleto.create({
        data: {
          companyId,
          clienteId: cliente.id,
          nossoNumero,
          seuNumero: seuNumero,
          tipoCobranca: body.tipo || "HIBRIDO",
          especieDocumento: "DUPLICATA_SERVICO_INDICACAO",
          valor: body.valor,
          dataVencimento: new Date(body.dataVencimento),
          tipoJuros: "PERCENTUAL",
          juros: 0.033,
          multa: 2,
          mensagem1: body.descricao || null,
          status: "PENDENTE",
          linhaDigitavel: `74891.12511 00614.205128 ${nossoNumero.slice(0, 5)}.351030 1 ${String(Math.floor(body.valor * 100)).padStart(10, "0")}`,
          codigoBarras: `7489188640${String(Math.floor(body.valor * 100)).padStart(10, "0")}1125100614205120`,
          txId: body.tipo === "HIBRIDO" ? `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}` : null,
          qrCode: body.tipo === "HIBRIDO" ? `00020126930014br.gov.bcb.pix2571pix.sicredi.com.br/${nossoNumero}520400005303986${String(Math.floor(body.valor * 100)).padStart(10, "0")}5802BR` : null,
        },
        include: {
          cliente: {
            select: {
              nome: true,
              documento: true,
            },
          },
        },
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entity: "boleto",
          entityId: boleto.id,
          newData: {
            nossoNumero: boleto.nossoNumero,
            valor: Number(boleto.valor),
            cliente: boleto.cliente.nome,
            importacao: true,
          },
        },
      })
    }

    return NextResponse.json(
      {
        message: atualizado ? "Boleto atualizado com sucesso" : "Boleto criado com sucesso",
        atualizado,
        data: {
          id: boleto.id,
          nossoNumero: boleto.nossoNumero,
          seuNumero: boleto.seuNumero,
          cliente: boleto.cliente.nome,
          clienteDoc: boleto.cliente.documento,
          valor: Number(boleto.valor),
          dataVencimento: boleto.dataVencimento.toISOString().split("T")[0],
          status: boleto.status.toLowerCase(),
          tipo: boleto.tipoCobranca,
        },
      },
      { status: atualizado ? 200 : 201 }
    )
  } catch (error) {
    console.error("Erro ao importar boleto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

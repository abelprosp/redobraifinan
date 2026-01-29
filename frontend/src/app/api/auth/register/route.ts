import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, companyName, companyDocument } = body

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 409 }
      )
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10)

    // Criar empresa se fornecido
    let companyId: string | null = null

    if (companyName && companyDocument) {
      // Verificar se empresa já existe
      const existingCompany = await prisma.company.findUnique({
        where: { document: companyDocument.replace(/\D/g, "") },
      })

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const company = await prisma.company.create({
          data: {
            name: companyName,
            document: companyDocument.replace(/\D/g, ""),
            email: email,
          },
        })
        companyId = company.id
      }
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: companyId ? "ADMIN" : "USER",
        companyId,
        isActive: true,
      },
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        entity: "user",
        entityId: user.id,
        newData: { email: user.email, name: user.name },
      },
    })

    return NextResponse.json(
      {
        message: "Usuário criado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao registrar usuário:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

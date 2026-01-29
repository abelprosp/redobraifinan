import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function getCompanyId() {
  const user = await getCurrentUser()
  return user?.companyId || null
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Não autorizado" },
    { status: 401 }
  )
}

export function forbidden() {
  return NextResponse.json(
    { error: "Acesso negado" },
    { status: 403 }
  )
}

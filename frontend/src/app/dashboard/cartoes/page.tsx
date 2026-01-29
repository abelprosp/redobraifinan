"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Wallet,
  TrendingUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface CartaoVirtual {
  id: string
  nome: string
  numero: string
  validade: string
  cvv: string
  limite: number
  usado: number
  status: string
  tipo: string
}

// Dados mockados para demonstração
const mockCartoes: CartaoVirtual[] = [
  {
    id: "1",
    nome: "Cartão Principal",
    numero: "4532 **** **** 1234",
    validade: "12/28",
    cvv: "***",
    limite: 10000,
    usado: 3500,
    status: "ativo",
    tipo: "virtual",
  },
  {
    id: "2",
    nome: "Cartão Marketing",
    numero: "4532 **** **** 5678",
    validade: "06/27",
    cvv: "***",
    limite: 5000,
    usado: 1200,
    status: "ativo",
    tipo: "virtual",
  },
  {
    id: "3",
    nome: "Cartão Viagens",
    numero: "4532 **** **** 9012",
    validade: "03/26",
    cvv: "***",
    limite: 15000,
    usado: 0,
    status: "bloqueado",
    tipo: "virtual",
  },
]

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<CartaoVirtual[]>(mockCartoes)
  const [showNumbers, setShowNumbers] = useState<Record<string, boolean>>({})

  // Estatísticas
  const stats = {
    total: cartoes.length,
    ativos: cartoes.filter((c) => c.status === "ativo").length,
    limiteTotal: cartoes.reduce((acc, c) => acc + c.limite, 0),
    usadoTotal: cartoes.reduce((acc, c) => acc + c.usado, 0),
  }

  function toggleShowNumber(id: string) {
    setShowNumbers({ ...showNumbers, [id]: !showNumbers[id] })
  }

  function toggleStatus(id: string) {
    setCartoes(
      cartoes.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "ativo" ? "bloqueado" : "ativo" }
          : c
      )
    )
    toast.success("Status do cartão atualizado!")
  }

  function copyNumber(numero: string) {
    navigator.clipboard.writeText(numero.replace(/\s/g, ""))
    toast.success("Número copiado!")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões virtuais
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cartão Virtual
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartões</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Limite Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.limiteTotal)}</p>
              </div>
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilizado</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.usadoTotal)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cartões */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cartoes.map((cartao) => {
          const disponivel = cartao.limite - cartao.usado
          const percentUsado = (cartao.usado / cartao.limite) * 100

          return (
            <Card
              key={cartao.id}
              className={`relative overflow-hidden ${
                cartao.status === "bloqueado" ? "opacity-75" : ""
              }`}
            >
              {/* Background do cartão */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
              
              <CardContent className="relative p-6 text-white">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm text-slate-300">{cartao.nome}</p>
                    <Badge
                      variant={cartao.status === "ativo" ? "success" : "secondary"}
                      className="mt-1"
                    >
                      {cartao.status === "ativo" ? (
                        <>
                          <Unlock className="mr-1 h-3 w-3" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <Lock className="mr-1 h-3 w-3" />
                          Bloqueado
                        </>
                      )}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleStatus(cartao.id)}>
                        {cartao.status === "ativo" ? (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Bloquear
                          </>
                        ) : (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Desbloquear
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Número do cartão */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-mono tracking-wider">
                      {showNumbers[cartao.id]
                        ? "4532 1234 5678 " + cartao.numero.slice(-4)
                        : cartao.numero}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-300 hover:text-white hover:bg-white/10"
                      onClick={() => toggleShowNumber(cartao.id)}
                    >
                      {showNumbers[cartao.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-300 hover:text-white hover:bg-white/10"
                      onClick={() => copyNumber(cartao.numero)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-6 mt-2 text-sm text-slate-300">
                    <span>Validade: {cartao.validade}</span>
                    <span>CVV: {cartao.cvv}</span>
                  </div>
                </div>

                {/* Limite */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Limite usado</span>
                    <span>{formatCurrency(cartao.usado)} / {formatCurrency(cartao.limite)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percentUsado > 80 ? "bg-red-500" : percentUsado > 50 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${percentUsado}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-300">
                    Disponível: <span className="text-white font-medium">{formatCurrency(disponivel)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Card para adicionar novo */}
        <Card className="border-2 border-dashed bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
          <CardContent className="flex h-full min-h-[250px] flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Criar Cartão Virtual</p>
              <p className="text-sm text-muted-foreground">
                Crie um novo cartão para suas compras
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

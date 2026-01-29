"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  QrCode,
  Loader2,
  Calendar,
  PieChart,
  BarChart3,
} from "lucide-react"

interface OverviewData {
  saldoTotal: number
  receitaMes: number
  despesaMes: number
  boletosEmitidos: number
  boletosPagos: number
  boletosVencidos: number
  clientesAtivos: number
  transacoesMes: number
  variacao: {
    receita: number
    despesa: number
    clientes: number
  }
}

export default function VisaoGeralPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<OverviewData>({
    saldoTotal: 0,
    receitaMes: 0,
    despesaMes: 0,
    boletosEmitidos: 0,
    boletosPagos: 0,
    boletosVencidos: 0,
    clientesAtivos: 0,
    transacoesMes: 0,
    variacao: { receita: 0, despesa: 0, clientes: 0 },
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardRes, contasRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/contas"),
        ])

        const dashboard = await dashboardRes.json()
        const contas = await contasRes.json()

        setData({
          saldoTotal: contas.saldoTotal || 0,
          receitaMes: dashboard.data?.stats?.receita?.valor || 0,
          despesaMes: 0,
          boletosEmitidos: dashboard.data?.stats?.boletosEmitidos?.valor || 0,
          boletosPagos: dashboard.data?.stats?.boletosRecebidos?.valor || 0,
          boletosVencidos: 0,
          clientesAtivos: dashboard.data?.stats?.clientes?.ativos || 0,
          transacoesMes: 0,
          variacao: {
            receita: dashboard.data?.stats?.receita?.variacao || 0,
            despesa: 0,
            clientes: dashboard.data?.stats?.clientes?.variacao || 0,
          },
        })
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">
          Resumo completo das suas finanças
        </p>
      </div>

      {/* Cards Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(data.saldoTotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Soma de todas as contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.receitaMes)}</div>
            <div className="flex items-center gap-1 text-xs">
              {data.variacao.receita >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={data.variacao.receita >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(data.variacao.receita).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{data.clientesAtivos}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Clientes com cadastro ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Boletos do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{data.boletosEmitidos}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.boletosPagos} pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Métricas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resumo de Cobranças */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Resumo de Cobranças
            </CardTitle>
            <CardDescription>
              Status dos boletos emitidos este mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Pagos</span>
                </div>
                <span className="font-bold">{data.boletosPagos}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Pendentes</span>
                </div>
                <span className="font-bold">
                  {data.boletosEmitidos - data.boletosPagos - data.boletosVencidos}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Vencidos</span>
                </div>
                <span className="font-bold">{data.boletosVencidos}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
            <CardDescription>
              Como seus clientes estão pagando
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span>PIX</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[65%] bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium">65%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  <span>Boleto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[30%] bg-blue-500 rounded-full" />
                  </div>
                  <span className="text-sm font-medium">30%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <span>Cartão</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[5%] bg-purple-500 rounded-full" />
                  </div>
                  <span className="text-sm font-medium">5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Recebimento</p>
                <p className="text-2xl font-bold">
                  {data.boletosEmitidos > 0
                    ? ((data.boletosPagos / data.boletosEmitidos) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    data.boletosPagos > 0 ? data.receitaMes / data.boletosPagos : 0
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inadimplência</p>
                <p className="text-2xl font-bold">
                  {data.boletosEmitidos > 0
                    ? ((data.boletosVencidos / data.boletosEmitidos) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

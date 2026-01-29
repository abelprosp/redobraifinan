"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Receipt,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  BarChart3,
  Loader2,
} from "lucide-react"
import Link from "next/link"

interface Stats {
  receita: { valor: number; variacao: number }
  clientes: { total: number; ativos: number; variacao: number }
  boletosEmitidos: { valor: number; variacao: number }
  boletosRecebidos: { valor: number; variacao: number }
}

interface BoletoVencendo {
  id: string
  cliente: string
  valor: number
  vencimento: string
  diasRestantes: number
}

interface Transacao {
  id: string
  cliente: string
  tipo: string
  valor: number
  status: string
  data: string
}

function StatCard({
  title,
  value,
  variacao,
  icon: Icon,
  prefix = "",
  isLoading = false,
}: {
  title: string
  value: number | string
  variacao: number
  icon: React.ElementType
  prefix?: string
  isLoading?: boolean
}) {
  const isPositive = variacao >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {prefix}
              {typeof value === "number" && prefix === "R$ "
                ? formatCurrency(value).replace("R$", "").trim()
                : value}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={isPositive ? "text-green-500" : "text-red-500"}>
                {Math.abs(variacao).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs. mês anterior</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    completed: { label: "Pago", variant: "success" as const, icon: CheckCircle2 },
    pending: { label: "Pendente", variant: "warning" as const, icon: Clock },
    failed: { label: "Falhou", variant: "destructive" as const, icon: XCircle },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Badge variant={config.variant} className="gap-1">
      <config.icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    receita: { valor: 0, variacao: 0 },
    clientes: { total: 0, ativos: 0, variacao: 0 },
    boletosEmitidos: { valor: 0, variacao: 0 },
    boletosRecebidos: { valor: 0, variacao: 0 },
  })
  const [boletosVencendo, setBoletosVencendo] = useState<BoletoVencendo[]>([])
  const [transacoesRecentes, setTransacoesRecentes] = useState<Transacao[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard")
        const data = await response.json()
        
        if (data.data) {
          setStats(data.data.stats)
          setBoletosVencendo(data.data.boletosVencendo || [])
          setTransacoesRecentes(data.data.transacoesRecentes || [])
        }
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está o resumo das suas finanças.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/relatorios">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Relatórios
            </Button>
          </Link>
          <Link href="/dashboard/boletos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Cobrança
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita do Mês"
          value={stats.receita.valor}
          variacao={stats.receita.variacao}
          icon={DollarSign}
          prefix="R$ "
          isLoading={isLoading}
        />
        <StatCard
          title="Clientes Ativos"
          value={stats.clientes.ativos}
          variacao={stats.clientes.variacao}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Boletos Emitidos"
          value={stats.boletosEmitidos.valor}
          variacao={stats.boletosEmitidos.variacao}
          icon={Receipt}
          isLoading={isLoading}
        />
        <StatCard
          title="Boletos Recebidos"
          value={stats.boletosRecebidos.valor}
          variacao={stats.boletosRecebidos.variacao}
          icon={CreditCard}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Receita Mensal</CardTitle>
                <CardDescription>
                  Evolução das receitas nos últimos 6 meses
                </CardDescription>
              </div>
              <Link href="/dashboard/relatorios">
                <Button variant="outline" size="sm">
                  Ver detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Gráfico de Receitas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(stats.receita.valor)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boletos Vencendo */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Vencendo em Breve
                </CardTitle>
                <CardDescription>
                  Boletos com vencimento nos próximos 3 dias
                </CardDescription>
              </div>
              <Badge variant="warning">{boletosVencendo.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : boletosVencendo.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-center">
                <div>
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum boleto vencendo nos próximos dias
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {boletosVencendo.map((boleto) => (
                  <div
                    key={boleto.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{boleto.cliente}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence em {boleto.diasRestantes} dia{boleto.diasRestantes > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {formatCurrency(boleto.valor)}
                      </p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Enviar lembrete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pagamentos Recentes</CardTitle>
              <CardDescription>
                Últimos pagamentos recebidos
              </CardDescription>
            </div>
            <Link href="/dashboard/boletos?status=pago">
              <Button variant="outline" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transacoesRecentes.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-center">
              <div>
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum pagamento recente
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {transacoesRecentes.map((transacao) => (
                <div
                  key={transacao.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {transacao.tipo === "PIX" ? (
                        <CreditCard className="h-5 w-5 text-primary" />
                      ) : (
                        <Receipt className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transacao.cliente}</p>
                      <p className="text-sm text-muted-foreground">
                        {transacao.tipo} • {transacao.data}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={transacao.status} />
                    <p className="min-w-[100px] text-right font-bold">
                      {formatCurrency(transacao.valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

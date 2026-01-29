"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Filter,
  Search,
  Loader2,
  RefreshCw,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { toast } from "sonner"

interface Transacao {
  id: string
  tipo: string
  status: string
  valor: number
  descricao?: string
  cliente?: string
  contaOrigem?: string
  contaDestino?: string
  formaPagamento?: string
  dataTransacao: string
}

interface Conta {
  id: string
  nome: string
}

const tipoConfig: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: "Entrada", icon: ArrowUpRight, color: "text-green-500" },
  saida: { label: "Saída", icon: ArrowDownRight, color: "text-red-500" },
  transferencia: { label: "Transferência", icon: ArrowLeftRight, color: "text-blue-500" },
}

export default function TransacoesPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0, saldo: 0 })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [filterTipo, setFilterTipo] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    tipo: "ENTRADA",
    valor: "",
    descricao: "",
    contaOrigemId: "",
    contaDestinoId: "",
    formaPagamento: "PIX",
    dataTransacao: new Date().toISOString().split("T")[0],
  })

  async function fetchTransacoes(page = 1) {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (filterTipo) params.set("tipo", filterTipo)

      const response = await fetch(`/api/transacoes?${params}`)
      const data = await response.json()

      if (data.data) {
        setTransacoes(data.data)
        setTotais(data.totais || { entradas: 0, saidas: 0, saldo: 0 })
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Erro ao buscar transações:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchContas() {
    try {
      const response = await fetch("/api/contas")
      const data = await response.json()
      if (data.data) {
        setContas(data.data)
      }
    } catch (error) {
      console.error("Erro ao buscar contas:", error)
    }
  }

  useEffect(() => {
    fetchTransacoes()
    fetchContas()
  }, [filterTipo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar transação")
        return
      }

      toast.success("Transação criada com sucesso!")
      setIsDialogOpen(false)
      setFormData({
        tipo: "ENTRADA",
        valor: "",
        descricao: "",
        contaOrigemId: "",
        contaDestinoId: "",
        formaPagamento: "PIX",
        dataTransacao: new Date().toISOString().split("T")[0],
      })
      fetchTransacoes()
    } catch (error) {
      toast.error("Erro ao criar transação")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground">
            Histórico de movimentações financeiras
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fetchTransacoes()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
                <DialogDescription>
                  Registre uma nova movimentação financeira
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo *</label>
                    <div className="flex gap-2">
                      {["ENTRADA", "SAIDA", "TRANSFERENCIA"].map((tipo) => (
                        <Button
                          key={tipo}
                          type="button"
                          variant={formData.tipo === tipo ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setFormData({ ...formData, tipo })}
                        >
                          {tipo === "ENTRADA" && <ArrowUpRight className="mr-2 h-4 w-4" />}
                          {tipo === "SAIDA" && <ArrowDownRight className="mr-2 h-4 w-4" />}
                          {tipo === "TRANSFERENCIA" && <ArrowLeftRight className="mr-2 h-4 w-4" />}
                          {tipo.charAt(0) + tipo.slice(1).toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data</label>
                      <Input
                        type="date"
                        value={formData.dataTransacao}
                        onChange={(e) => setFormData({ ...formData, dataTransacao: e.target.value })}
                      />
                    </div>
                  </div>

                  {(formData.tipo === "SAIDA" || formData.tipo === "TRANSFERENCIA") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Conta de Origem</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={formData.contaOrigemId}
                        onChange={(e) => setFormData({ ...formData, contaOrigemId: e.target.value })}
                      >
                        <option value="">Selecione uma conta</option>
                        {contas.map((conta) => (
                          <option key={conta.id} value={conta.id}>{conta.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(formData.tipo === "ENTRADA" || formData.tipo === "TRANSFERENCIA") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Conta de Destino</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={formData.contaDestinoId}
                        onChange={(e) => setFormData({ ...formData, contaDestinoId: e.target.value })}
                      >
                        <option value="">Selecione uma conta</option>
                        {contas.map((conta) => (
                          <option key={conta.id} value={conta.id}>{conta.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Forma de Pagamento</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={formData.formaPagamento}
                      onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                    >
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="TED">TED</option>
                      <option value="CARTAO">Cartão</option>
                      <option value="DINHEIRO">Dinheiro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição da transação"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Criar Transação"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totais.entradas)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totais.saidas)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={totais.saldo >= 0 ? "bg-primary/10 border-primary/20" : "bg-red-500/10 border-red-500/20"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${totais.saldo >= 0 ? "text-primary" : "text-red-600"}`}>
                  {formatCurrency(totais.saldo)}
                </p>
              </div>
              <ArrowLeftRight className={`h-8 w-8 ${totais.saldo >= 0 ? "text-primary" : "text-red-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Tipo
                  {filterTipo && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterTipo(null)}>Todos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTipo("entrada")}>Entradas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTipo("saida")}>Saídas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTipo("transferencia")}>Transferências</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transacoes.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {transacoes.map((transacao) => {
                const config = tipoConfig[transacao.tipo] || tipoConfig.entrada
                const Icon = config.icon

                return (
                  <div
                    key={transacao.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {transacao.descricao || config.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transacao.formaPagamento} • {formatDate(transacao.dataTransacao)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${config.color}`}>
                        {transacao.tipo === "saida" ? "-" : "+"}{formatCurrency(transacao.valor)}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {transacao.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Paginação */}
          {!isLoading && transacoes.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {transacoes.length} de {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => fetchTransacoes(pagination.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchTransacoes(pagination.page + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

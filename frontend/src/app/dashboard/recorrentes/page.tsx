"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  User,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface CobrancaRecorrente {
  id: string
  cliente: string
  descricao: string
  valor: number
  frequencia: string
  diaVencimento: number
  proximoVencimento: string
  status: string
  totalCobrado: number
  cobrancasRealizadas: number
}

// Dados mockados para demonstração
const mockRecorrentes: CobrancaRecorrente[] = [
  {
    id: "1",
    cliente: "Tech Solutions LTDA",
    descricao: "Mensalidade Sistema ERP",
    valor: 599.90,
    frequencia: "mensal",
    diaVencimento: 10,
    proximoVencimento: "2026-02-10",
    status: "ativo",
    totalCobrado: 3599.40,
    cobrancasRealizadas: 6,
  },
  {
    id: "2",
    cliente: "Maria Silva Santos",
    descricao: "Plano Premium",
    valor: 99.90,
    frequencia: "mensal",
    diaVencimento: 15,
    proximoVencimento: "2026-02-15",
    status: "ativo",
    totalCobrado: 499.50,
    cobrancasRealizadas: 5,
  },
  {
    id: "3",
    cliente: "Comércio ABC LTDA",
    descricao: "Suporte Técnico",
    valor: 350.00,
    frequencia: "mensal",
    diaVencimento: 5,
    proximoVencimento: "2026-02-05",
    status: "pausado",
    totalCobrado: 1400.00,
    cobrancasRealizadas: 4,
  },
]

export default function RecorrentesPage() {
  const [recorrentes, setRecorrentes] = useState<CobrancaRecorrente[]>(mockRecorrentes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    clienteId: "",
    descricao: "",
    valor: "",
    frequencia: "mensal",
    diaVencimento: "10",
  })

  // Estatísticas
  const stats = {
    total: recorrentes.length,
    ativos: recorrentes.filter((r) => r.status === "ativo").length,
    pausados: recorrentes.filter((r) => r.status === "pausado").length,
    receitaMensal: recorrentes
      .filter((r) => r.status === "ativo")
      .reduce((acc, r) => acc + r.valor, 0),
  }

  function StatusBadge({ status }: { status: string }) {
    if (status === "ativo") {
      return (
        <Badge variant="success" className="gap-1">
          <PlayCircle className="h-3 w-3" />
          Ativo
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <PauseCircle className="h-3 w-3" />
        Pausado
      </Badge>
    )
  }

  function toggleStatus(id: string) {
    setRecorrentes(
      recorrentes.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "ativo" ? "pausado" : "ativo" }
          : r
      )
    )
    toast.success("Status atualizado!")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    // Simular criação
    setTimeout(() => {
      const novaRecorrente: CobrancaRecorrente = {
        id: String(Date.now()),
        cliente: "Novo Cliente",
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        frequencia: formData.frequencia,
        diaVencimento: parseInt(formData.diaVencimento),
        proximoVencimento: new Date().toISOString().split("T")[0],
        status: "ativo",
        totalCobrado: 0,
        cobrancasRealizadas: 0,
      }

      setRecorrentes([novaRecorrente, ...recorrentes])
      setIsDialogOpen(false)
      setIsSaving(false)
      setFormData({
        clienteId: "",
        descricao: "",
        valor: "",
        frequencia: "mensal",
        diaVencimento: "10",
      })
      toast.success("Cobrança recorrente criada!")
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobranças Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie assinaturas e cobranças automáticas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Recorrência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Cobrança Recorrente</DialogTitle>
              <DialogDescription>
                Configure uma cobrança automática para seu cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição *</label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Mensalidade Sistema"
                    required
                  />
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
                    <label className="text-sm font-medium">Frequência</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={formData.frequencia}
                      onChange={(e) => setFormData({ ...formData, frequencia: e.target.value })}
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dia do Vencimento</label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.diaVencimento}
                    onChange={(e) => setFormData({ ...formData, diaVencimento: e.target.value })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dia do mês para gerar a cobrança (1-28)
                  </p>
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
                      Criando...
                    </>
                  ) : (
                    "Criar Recorrência"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pausados}</p>
              </div>
              <PauseCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.receitaMensal)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recorrentes.map((recorrente) => (
          <Card key={recorrente.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{recorrente.cliente}</CardTitle>
                    <CardDescription>{recorrente.descricao}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleStatus(recorrente.id)}>
                      {recorrente.status === "ativo" ? (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{formatCurrency(recorrente.valor)}</span>
                  <StatusBadge status={recorrente.status} />
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{recorrente.frequencia}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Dia {recorrente.diaVencimento}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">
                    {recorrente.cobrancasRealizadas} cobranças realizadas
                  </span>
                  <span className="font-medium">
                    {formatCurrency(recorrente.totalCobrado)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { formatCurrency } from "@/lib/utils"
import {
  Plus,
  Wallet,
  Building2,
  Landmark,
  PiggyBank,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface Conta {
  id: string
  nome: string
  descricao?: string
  tipo: string
  saldo: number
  banco?: string
  agencia?: string
  numeroConta?: string
  isActive: boolean
  createdAt: string
}

const tipoIcons: Record<string, React.ElementType> = {
  corrente: Landmark,
  poupanca: PiggyBank,
  caixa: Wallet,
  investimento: Building2,
}

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([])
  const [saldoTotal, setSaldoTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "corrente",
    saldoInicial: "",
    banco: "",
    agencia: "",
    numeroConta: "",
  })

  async function fetchContas() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/contas")
      const data = await response.json()
      if (data.data) {
        setContas(data.data)
        setSaldoTotal(data.saldoTotal || 0)
      }
    } catch (error) {
      console.error("Erro ao buscar contas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContas()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          saldoInicial: formData.saldoInicial ? parseFloat(formData.saldoInicial) : 0,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar conta")
        return
      }

      toast.success("Conta criada com sucesso!")
      setIsDialogOpen(false)
      setFormData({
        nome: "",
        descricao: "",
        tipo: "corrente",
        saldoInicial: "",
        banco: "",
        agencia: "",
        numeroConta: "",
      })
      fetchContas()
    } catch (error) {
      toast.error("Erro ao criar conta")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e caixas
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchContas}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conta</DialogTitle>
                <DialogDescription>
                  Adicione uma nova conta bancária ou caixa
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Conta Principal"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo *</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Poupança</option>
                      <option value="caixa">Caixa</option>
                      <option value="investimento">Investimento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Saldo Inicial</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.saldoInicial}
                      onChange={(e) => setFormData({ ...formData, saldoInicial: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Banco</label>
                      <Input
                        value={formData.banco}
                        onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                        placeholder="Sicredi"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agência</label>
                      <Input
                        value={formData.agencia}
                        onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                        placeholder="0001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Conta</label>
                      <Input
                        value={formData.numeroConta}
                        onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                        placeholder="12345-6"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição opcional"
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
                      "Criar Conta"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Saldo Total */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
              <p className="text-4xl font-bold">{formatCurrency(saldoTotal)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Em {contas.length} conta{contas.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="flex h-[300px] flex-col items-center justify-center gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contas.map((conta) => {
            const Icon = tipoIcons[conta.tipo] || Wallet
            const isPositive = conta.saldo >= 0

            return (
              <Card key={conta.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{conta.nome}</CardTitle>
                        <CardDescription className="capitalize">
                          {conta.tipo}
                          {conta.banco && ` • ${conta.banco}`}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver extrato
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
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(conta.saldo)}
                      </p>
                      {conta.agencia && conta.numeroConta && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ag: {conta.agencia} • CC: {conta.numeroConta}
                        </p>
                      )}
                    </div>
                    <Badge variant={conta.isActive ? "success" : "secondary"}>
                      {conta.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

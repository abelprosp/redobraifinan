"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, formatCPF, formatCNPJ } from "@/lib/utils"
import {
  QrCode,
  Plus,
  Copy,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Key,
  Building2,
  Mail,
  Phone,
  User,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react"
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

interface ChavePix {
  id: string
  tipo: string
  chave: string
  status: string
  createdAt: string
}

interface TransacaoPix {
  id: string
  tipo: string
  valor: number
  descricao?: string
  pagador?: string
  recebedor?: string
  dataHora: string
  status: string
  txId: string
}

// Dados mockados
const mockChaves: ChavePix[] = [
  { id: "1", tipo: "cpf", chave: "123.456.789-00", status: "ativo", createdAt: "2026-01-15" },
  { id: "2", tipo: "email", chave: "financeiro@empresa.com", status: "ativo", createdAt: "2026-01-10" },
  { id: "3", tipo: "telefone", chave: "+55 11 99999-0000", status: "ativo", createdAt: "2026-01-05" },
]

const mockTransacoes: TransacaoPix[] = [
  {
    id: "1",
    tipo: "entrada",
    valor: 1500.00,
    descricao: "Pagamento boleto #1234",
    pagador: "Maria Silva",
    dataHora: "2026-01-28 14:30",
    status: "concluido",
    txId: "E12345678901234567890",
  },
  {
    id: "2",
    tipo: "entrada",
    valor: 850.00,
    descricao: "Pagamento serviço",
    pagador: "Tech Solutions LTDA",
    dataHora: "2026-01-28 11:15",
    status: "concluido",
    txId: "E98765432109876543210",
  },
  {
    id: "3",
    tipo: "saida",
    valor: 200.00,
    descricao: "Transferência",
    recebedor: "João Carlos",
    dataHora: "2026-01-27 16:45",
    status: "concluido",
    txId: "E55555555555555555555",
  },
]

const tipoChaveIcon: Record<string, React.ElementType> = {
  cpf: User,
  cnpj: Building2,
  email: Mail,
  telefone: Phone,
  aleatoria: Key,
}

export default function PixPage() {
  const [chaves, setChaves] = useState<ChavePix[]>(mockChaves)
  const [transacoes, setTransacoes] = useState<TransacaoPix[]>(mockTransacoes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ valor: "", descricao: "" })

  // Estatísticas
  const stats = {
    chavesAtivas: chaves.filter((c) => c.status === "ativo").length,
    recebidoHoje: transacoes
      .filter((t) => t.tipo === "entrada" && t.dataHora.includes("2026-01-28"))
      .reduce((acc, t) => acc + t.valor, 0),
    enviadoHoje: transacoes
      .filter((t) => t.tipo === "saida" && t.dataHora.includes("2026-01-28"))
      .reduce((acc, t) => acc + t.valor, 0),
    totalTransacoes: transacoes.length,
  }

  function copyChave(chave: string) {
    navigator.clipboard.writeText(chave)
    toast.success("Chave PIX copiada!")
  }

  function gerarQrCode() {
    toast.success("QR Code gerado!")
    setIsQrDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PIX</h1>
          <p className="text-muted-foreground">
            Gerencie suas chaves e transações PIX
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                Gerar QR Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar QR Code PIX</DialogTitle>
                <DialogDescription>
                  Crie um QR Code para receber pagamentos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Pagamento NF-1234"
                  />
                </div>

                {/* QR Code Preview */}
                <div className="flex justify-center p-6 bg-white rounded-lg">
                  <div className="w-48 h-48 bg-muted rounded flex items-center justify-center">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={gerarQrCode}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar QR Code
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Chave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chaves Ativas</p>
                <p className="text-2xl font-bold">{stats.chavesAtivas}</p>
              </div>
              <Key className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido Hoje</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.recebidoHoje)}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviado Hoje</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.enviadoHoje)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold">{stats.totalTransacoes}</p>
              </div>
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chaves PIX */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Minhas Chaves PIX
            </CardTitle>
            <CardDescription>
              Chaves cadastradas para recebimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chaves.map((chave) => {
                const Icon = tipoChaveIcon[chave.tipo] || Key

                return (
                  <div
                    key={chave.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{chave.tipo}</p>
                        <p className="text-xs text-muted-foreground">{chave.chave}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyChave(chave.chave)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transações Recentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Transações PIX Recentes
            </CardTitle>
            <CardDescription>
              Últimas movimentações via PIX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transacoes.map((transacao) => (
                <div
                  key={transacao.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        transacao.tipo === "entrada"
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {transacao.tipo === "entrada" ? (
                        <ArrowDownRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transacao.tipo === "entrada" ? transacao.pagador : transacao.recebedor}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transacao.descricao || "Transferência PIX"}
                      </p>
                      <p className="text-xs text-muted-foreground">{transacao.dataHora}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        transacao.tipo === "entrada" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transacao.tipo === "entrada" ? "+" : "-"}
                      {formatCurrency(transacao.valor)}
                    </p>
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Concluído
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

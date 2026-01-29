"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus,
  FileText,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Eye,
  Send,
  Download,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Printer,
  ExternalLink,
  Calculator,
  Building2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import Link from "next/link"
import { toast } from "sonner"

interface NotaFiscal {
  id: string
  numero: string
  serie: string
  cliente: string
  cnpjCliente: string
  tipoCliente: string
  valorServico: number
  valorPis: number
  valorCofins: number
  valorCsll: number
  valorIr: number
  valorIss: number
  valorLiquido: number
  descricaoServico: string
  dataEmissao: string
  status: string
  codigoVerificacao?: string
  linkNfse?: string
}

interface Cliente {
  id: string
  nome: string
  documento: string
  tipo: string
  tipoTributacao: string
}

// Regras de tributação
const regrasTributacao: Record<string, { pis: number; cofins: number; csll: number; ir: number }> = {
  PJ_PRIVADA: { pis: 0.65, cofins: 3.0, csll: 1.0, ir: 1.5 },
  SIMPLES_ORGAO_ME: { pis: 0, cofins: 0, csll: 0, ir: 1.5 },
  ORGAO_FEDERAL: { pis: 0.65, cofins: 3.0, csll: 1.0, ir: 4.8 },
}

// Dados mockados
const mockNotas: NotaFiscal[] = [
  {
    id: "1",
    numero: "00001",
    serie: "RPS",
    cliente: "Tech Solutions LTDA",
    cnpjCliente: "12.345.678/0001-99",
    tipoCliente: "PJ_PRIVADA",
    valorServico: 9715.42,
    valorPis: 63.15,
    valorCofins: 291.46,
    valorCsll: 97.15,
    valorIr: 145.73,
    valorIss: 242.89,
    valorLiquido: 9117.93,
    descricaoServico: "Assessoria e consultoria em telecom",
    dataEmissao: "2026-01-28",
    status: "emitida",
    codigoVerificacao: "ABC123DEF",
    linkNfse: "#",
  },
  {
    id: "2",
    numero: "00002",
    serie: "RPS",
    cliente: "Prefeitura Municipal de Lajeado",
    cnpjCliente: "87.654.321/0001-00",
    tipoCliente: "SIMPLES_ORGAO_ME",
    valorServico: 4000.00,
    valorPis: 0,
    valorCofins: 0,
    valorCsll: 0,
    valorIr: 60.00,
    valorIss: 100.00,
    valorLiquido: 3940.00,
    descricaoServico: "Assessoria e consultoria em telecom",
    dataEmissao: "2026-01-25",
    status: "emitida",
    codigoVerificacao: "XYZ789GHI",
    linkNfse: "#",
  },
]

export default function NotasFiscaisPage() {
  const [notas, setNotas] = useState<NotaFiscal[]>(mockNotas)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    clienteId: "",
    tipoCliente: "PJ_PRIVADA",
    valorServico: "",
    descricaoServico: "Assessoria e consultoria em telecom",
    gerarBoleto: true,
  })

  const [calculoPreview, setCalculoPreview] = useState<{
    pis: number
    cofins: number
    csll: number
    ir: number
    iss: number
    valorLiquido: number
  } | null>(null)

  // Buscar clientes
  useEffect(() => {
    async function fetchClientes() {
      try {
        const response = await fetch("/api/clientes")
        const data = await response.json()
        if (data.data) {
          setClientes(data.data)
        }
      } catch (error) {
        console.error("Erro ao buscar clientes:", error)
      }
    }
    fetchClientes()
  }, [])

  // Calcular preview quando valor ou tipo mudar
  useEffect(() => {
    if (formData.valorServico && formData.tipoCliente) {
      const valor = parseFloat(formData.valorServico)
      const regra = regrasTributacao[formData.tipoCliente] || regrasTributacao.PJ_PRIVADA
      const iss = 2.5

      const pis = (valor * regra.pis) / 100
      const cofins = (valor * regra.cofins) / 100
      const csll = (valor * regra.csll) / 100
      const ir = (valor * regra.ir) / 100
      const issValor = (valor * iss) / 100
      const valorLiquido = valor - pis - cofins - csll - ir

      setCalculoPreview({
        pis,
        cofins,
        csll,
        ir,
        iss: issValor,
        valorLiquido,
      })
    } else {
      setCalculoPreview(null)
    }
  }, [formData.valorServico, formData.tipoCliente])

  // Estatísticas
  const stats = {
    total: notas.length,
    emitidas: notas.filter((n) => n.status === "emitida").length,
    valorTotal: notas.reduce((acc, n) => acc + n.valorServico, 0),
    retencoesTotal: notas.reduce((acc, n) => acc + (n.valorPis + n.valorCofins + n.valorCsll + n.valorIr), 0),
  }

  const notasFiltradas = notas.filter(
    (n) =>
      n.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.numero.includes(searchTerm)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    // Simular criação
    setTimeout(() => {
      if (!calculoPreview) {
        toast.error("Informe o valor do serviço")
        setIsSaving(false)
        return
      }

      const valor = parseFloat(formData.valorServico)
      const novaNota: NotaFiscal = {
        id: String(Date.now()),
        numero: String(notas.length + 1).padStart(5, "0"),
        serie: "RPS",
        cliente: clientes.find((c) => c.id === formData.clienteId)?.nome || "Cliente não identificado",
        cnpjCliente: clientes.find((c) => c.id === formData.clienteId)?.documento || "",
        tipoCliente: formData.tipoCliente,
        valorServico: valor,
        valorPis: calculoPreview.pis,
        valorCofins: calculoPreview.cofins,
        valorCsll: calculoPreview.csll,
        valorIr: calculoPreview.ir,
        valorIss: calculoPreview.iss,
        valorLiquido: calculoPreview.valorLiquido,
        descricaoServico: formData.descricaoServico,
        dataEmissao: new Date().toISOString().split("T")[0],
        status: "emitida",
        codigoVerificacao: Math.random().toString(36).substring(2, 11).toUpperCase(),
      }

      setNotas([novaNota, ...notas])

      if (formData.gerarBoleto) {
        toast.success(`Nota fiscal emitida e boleto gerado! Valor líquido: ${formatCurrency(calculoPreview.valorLiquido)}`)
      } else {
        toast.success("Nota fiscal emitida com sucesso!")
      }

      setIsDialogOpen(false)
      setIsSaving(false)
      setFormData({
        clienteId: "",
        tipoCliente: "PJ_PRIVADA",
        valorServico: "",
        descricaoServico: "Assessoria e consultoria em telecom",
        gerarBoleto: true,
      })
    }, 2000)
  }

  function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      emitida: { label: "Emitida", variant: "success", icon: CheckCircle2 },
      pendente: { label: "Pendente", variant: "warning", icon: Clock },
      cancelada: { label: "Cancelada", variant: "destructive", icon: XCircle },
      erro: { label: "Erro", variant: "destructive", icon: AlertTriangle },
    }

    const { label, variant, icon: Icon } = config[status] || config.pendente

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Emita e gerencie suas notas fiscais de serviço (NFSe)
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/configuracoes/impostos">
            <Button variant="outline">
              <Calculator className="mr-2 h-4 w-4" />
              Configurar Impostos
            </Button>
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova NFSe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Emitir Nota Fiscal de Serviço</DialogTitle>
                <DialogDescription>
                  As retenções serão calculadas automaticamente conforme tipo do cliente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4 lg:grid-cols-2">
                  {/* Formulário */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cliente</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={formData.clienteId}
                        onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Cliente (Tributação)</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={formData.tipoCliente}
                        onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })}
                      >
                        <option value="PJ_PRIVADA">Empresa Privada Fora do Simples</option>
                        <option value="SIMPLES_ORGAO_ME">Simples Nacional / Órgãos Municipais/Estaduais</option>
                        <option value="ORGAO_FEDERAL">Órgãos Públicos Federais</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor do Serviço</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorServico}
                        onChange={(e) => setFormData({ ...formData, valorServico: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descrição do Serviço</label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[80px]"
                        value={formData.descricaoServico}
                        onChange={(e) => setFormData({ ...formData, descricaoServico: e.target.value })}
                        required
                      />
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.gerarBoleto}
                        onChange={(e) => setFormData({ ...formData, gerarBoleto: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Gerar boleto automaticamente (valor líquido)</span>
                    </label>
                  </div>

                  {/* Preview dos cálculos */}
                  <div className="space-y-4">
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Cálculo das Retenções
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {calculoPreview ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Valor Bruto:</span>
                              <span className="font-medium">{formatCurrency(parseFloat(formData.valorServico))}</span>
                            </div>
                            <div className="border-t pt-2 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">PIS ({regrasTributacao[formData.tipoCliente]?.pis || 0}%):</span>
                                <span className="text-red-600">-{formatCurrency(calculoPreview.pis)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">COFINS ({regrasTributacao[formData.tipoCliente]?.cofins || 0}%):</span>
                                <span className="text-red-600">-{formatCurrency(calculoPreview.cofins)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">CSLL ({regrasTributacao[formData.tipoCliente]?.csll || 0}%):</span>
                                <span className="text-red-600">-{formatCurrency(calculoPreview.csll)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IR ({regrasTributacao[formData.tipoCliente]?.ir || 0}%):</span>
                                <span className="text-red-600">-{formatCurrency(calculoPreview.ir)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-muted-foreground">ISS (2.5%):</span>
                              <span className="text-blue-600">{formatCurrency(calculoPreview.iss)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-medium">Valor Líquido:</span>
                              <span className="font-bold text-green-600 text-lg">
                                {formatCurrency(calculoPreview.valorLiquido)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Informe o valor do serviço para calcular
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {formData.gerarBoleto && calculoPreview && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-green-700">
                          <strong>Boleto será gerado com:</strong><br />
                          Valor: {formatCurrency(calculoPreview.valorLiquido)}
                        </p>
                      </div>
                    )}
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
                        Emitindo...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Emitir NFSe
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Notas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emitidas</p>
                <p className="text-2xl font-bold text-green-600">{stats.emitidas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Retenções</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.retencoesTotal)}</p>
              </div>
              <Calculator className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou número da nota..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
          ) : notasFiltradas.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma nota fiscal encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Número</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Valor Bruto</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Retenções</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Valor Líquido</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notasFiltradas.map((nota) => {
                    const totalRetencoes = nota.valorPis + nota.valorCofins + nota.valorCsll + nota.valorIr
                    return (
                      <tr key={nota.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-4 font-medium">{nota.numero}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium">{nota.cliente}</p>
                            <p className="text-xs text-muted-foreground">{nota.cnpjCliente}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="text-xs">
                            {nota.tipoCliente === "PJ_PRIVADA" && "PJ Privada"}
                            {nota.tipoCliente === "SIMPLES_ORGAO_ME" && "Simples/ME"}
                            {nota.tipoCliente === "ORGAO_FEDERAL" && "Órgão Federal"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">{formatCurrency(nota.valorServico)}</td>
                        <td className="px-4 py-4 text-red-600">-{formatCurrency(totalRetencoes)}</td>
                        <td className="px-4 py-4 font-bold text-green-600">{formatCurrency(nota.valorLiquido)}</td>
                        <td className="px-4 py-4">{formatDate(nota.dataEmissao)}</td>
                        <td className="px-4 py-4"><StatusBadge status={nota.status} /></td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(nota.codigoVerificacao || "")
                                toast.success("Código de verificação copiado!")
                              }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar código
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Baixar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar por email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Consultar na prefeitura
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

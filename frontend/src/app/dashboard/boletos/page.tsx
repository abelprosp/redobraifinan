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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  Send,
  Download,
  XCircle,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Barcode,
  RefreshCw,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Boleto {
  id: string
  nossoNumero: string
  seuNumero?: string
  cliente: string
  clienteDoc: string
  valor: number
  valorPago?: number
  dataEmissao: string
  dataVencimento: string
  dataPagamento?: string
  status: string
  tipo: string
  linhaDigitavel?: string
  qrCode?: string
  txId?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive"; icon: any }> = {
    pendente: { label: "Pendente", variant: "warning", icon: Clock },
    pago: { label: "Pago", variant: "success", icon: CheckCircle2 },
    vencido: { label: "Vencido", variant: "destructive", icon: AlertTriangle },
    cancelado: { label: "Cancelado", variant: "secondary", icon: XCircle },
    baixado: { label: "Baixado", variant: "secondary", icon: XCircle },
  }

  const { label, variant, icon: Icon } = config[status] || config.pendente

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <Badge variant="outline" className="gap-1">
      {tipo === "HIBRIDO" ? (
        <>
          <QrCode className="h-3 w-3" />
          PIX + Boleto
        </>
      ) : (
        <>
          <Barcode className="h-3 w-3" />
          Boleto
        </>
      )}
    </Badge>
  )
}

export default function BoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    pagos: 0,
    vencidos: 0,
    valorRecebido: 0,
  })

  async function fetchBoletos(page = 1) {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      })

      if (searchTerm) params.set("search", searchTerm)
      if (filterStatus) params.set("status", filterStatus)

      const response = await fetch(`/api/boletos?${params}`)
      const data = await response.json()

      if (data.data) {
        setBoletos(data.data)
        setPagination(data.pagination)

        // Calcular estatísticas
        const pendentes = data.data.filter((b: Boleto) => b.status === "pendente").length
        const pagos = data.data.filter((b: Boleto) => b.status === "pago").length
        const vencidos = data.data.filter((b: Boleto) => b.status === "vencido").length
        const valorRecebido = data.data
          .filter((b: Boleto) => b.status === "pago")
          .reduce((acc: number, b: Boleto) => acc + (b.valorPago || b.valor), 0)

        setStats({
          total: data.pagination.total,
          pendentes,
          pagos,
          vencidos,
          valorRecebido,
        })
      }
    } catch (error) {
      console.error("Erro ao buscar boletos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBoletos()
  }, [filterStatus])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBoletos()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  async function handleCopyLinhaDigitavel(linha: string) {
    await navigator.clipboard.writeText(linha.replace(/\s/g, ""))
    toast.success("Linha digitável copiada!")
  }

  async function handleCopyPix(qrCode: string) {
    await navigator.clipboard.writeText(qrCode)
    toast.success("Código PIX copiado!")
  }

  async function handleCancelar(id: string) {
    if (!confirm("Tem certeza que deseja cancelar este boleto?")) return

    try {
      const response = await fetch(`/api/boletos/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Boleto cancelado com sucesso")
        fetchBoletos(pagination.page)
      }
    } catch (error) {
      console.error("Erro ao cancelar boleto:", error)
      toast.error("Erro ao cancelar boleto")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Boletos</h1>
          <p className="text-muted-foreground">
            Gerencie suas cobranças e acompanhe os pagamentos
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fetchBoletos(pagination.page)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Link href="/dashboard/boletos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Boleto
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Emitido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{stats.pagos}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.valorRecebido)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, cliente ou nosso número..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Status
                    {filterStatus && (
                      <Badge variant="secondary" className="ml-2">
                        1
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                    Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("pendente")}>
                    Pendentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("pago")}>
                    Pagos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("vencido")}>
                    Vencidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("cancelado")}>
                    Cancelados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : boletos.length === 0 ? (
            <div className="flex h-[400px] flex-col items-center justify-center gap-4">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum boleto encontrado</p>
              <Link href="/dashboard/boletos/novo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Emitir Boleto
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Boleto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Vencimento
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boletos.map((boleto) => (
                    <tr
                      key={boleto.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{boleto.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Nosso Nº: {boleto.nossoNumero}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{boleto.cliente}</p>
                          <p className="text-sm text-muted-foreground">
                            {boleto.clienteDoc}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TipoBadge tipo={boleto.tipo} />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{formatDate(boleto.dataVencimento)}</p>
                          {boleto.dataPagamento && (
                            <p className="text-sm text-green-600">
                              Pago em {formatDate(boleto.dataPagamento)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold">{formatCurrency(boleto.valor)}</p>
                        {boleto.valorPago && boleto.valorPago !== boleto.valor && (
                          <p className="text-sm text-muted-foreground">
                            Pago: {formatCurrency(boleto.valorPago)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={boleto.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/boletos/${boleto.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            {boleto.linhaDigitavel && (
                              <DropdownMenuItem
                                onClick={() => handleCopyLinhaDigitavel(boleto.linhaDigitavel!)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar linha digitável
                              </DropdownMenuItem>
                            )}
                            {boleto.qrCode && (
                              <DropdownMenuItem
                                onClick={() => handleCopyPix(boleto.qrCode!)}
                              >
                                <QrCode className="mr-2 h-4 w-4" />
                                Copiar PIX
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar por email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {boleto.status === "pendente" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCancelar(boleto.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar boleto
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && boletos.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {boletos.length} de {pagination.total} boletos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => fetchBoletos(pagination.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchBoletos(pagination.page + 1)}
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

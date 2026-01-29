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
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Simula faturas baseadas em boletos agrupados
interface Fatura {
  id: string
  numero: string
  cliente: string
  valor: number
  dataEmissao: string
  dataVencimento: string
  status: string
  itens: number
}

export default function FaturasPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchFaturas() {
      try {
        // Buscar boletos e agrupar como "faturas"
        const response = await fetch("/api/boletos?limit=50")
        const data = await response.json()

        if (data.data) {
          // Agrupar boletos por cliente como faturas
          const clienteMap = new Map<string, any[]>()
          
          data.data.forEach((boleto: any) => {
            const key = boleto.cliente
            if (!clienteMap.has(key)) {
              clienteMap.set(key, [])
            }
            clienteMap.get(key)!.push(boleto)
          })

          const faturasList: Fatura[] = []
          let idx = 1
          
          clienteMap.forEach((boletos, cliente) => {
            const valorTotal = boletos.reduce((acc: number, b: any) => acc + b.valor, 0)
            const ultimoBoleto = boletos[0]
            
            faturasList.push({
              id: `FAT-${String(idx).padStart(4, "0")}`,
              numero: `FAT-${String(idx).padStart(4, "0")}`,
              cliente,
              valor: valorTotal,
              dataEmissao: ultimoBoleto.dataEmissao,
              dataVencimento: ultimoBoleto.dataVencimento,
              status: ultimoBoleto.status,
              itens: boletos.length,
            })
            idx++
          })

          setFaturas(faturasList)
        }
      } catch (error) {
        console.error("Erro ao buscar faturas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFaturas()
  }, [])

  const faturasFiltradas = faturas.filter(
    (f) =>
      f.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.numero.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas
  const stats = {
    total: faturas.length,
    pendentes: faturas.filter((f) => f.status === "pendente").length,
    pagas: faturas.filter((f) => f.status === "pago").length,
    valorTotal: faturas.reduce((acc, f) => acc + f.valor, 0),
  }

  function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      pendente: { label: "Pendente", variant: "warning", icon: Clock },
      pago: { label: "Paga", variant: "success", icon: CheckCircle2 },
      vencido: { label: "Vencida", variant: "destructive", icon: AlertTriangle },
      cancelado: { label: "Cancelada", variant: "secondary", icon: XCircle },
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
          <h1 className="text-3xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">
            Gerencie faturas consolidadas por cliente
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Link href="/dashboard/boletos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Faturas</p>
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
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagas</p>
                <p className="text-2xl font-bold text-green-600">{stats.pagas}</p>
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
              <FileText className="h-8 w-8 text-primary" />
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
              placeholder="Buscar por cliente ou número da fatura..."
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
          ) : faturasFiltradas.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Fatura
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Itens
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
                  {faturasFiltradas.map((fatura) => (
                    <tr key={fatura.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-4 font-medium">{fatura.numero}</td>
                      <td className="px-4 py-4">{fatura.cliente}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline">{fatura.itens} item(ns)</Badge>
                      </td>
                      <td className="px-4 py-4">{formatDate(fatura.dataVencimento)}</td>
                      <td className="px-4 py-4 font-bold">{formatCurrency(fatura.valor)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={fatura.status} />
                      </td>
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
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar por email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

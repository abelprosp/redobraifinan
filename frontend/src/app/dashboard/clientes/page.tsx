"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatCPF, formatCNPJ } from "@/lib/utils"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Receipt,
  UserCheck,
  UserX,
  Building2,
  User,
  Download,
  Upload,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

interface Cliente {
  id: string
  nome: string
  nomeFantasia?: string
  email?: string
  telefone?: string
  documento: string
  tipo: "PF" | "PJ"
  status: string
  saldo: number
  totalBoletos: number
  dataCadastro: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" }> = {
    ativo: { label: "Ativo", variant: "success" },
    inativo: { label: "Inativo", variant: "secondary" },
    pendente: { label: "Pendente", variant: "warning" },
    bloqueado: { label: "Bloqueado", variant: "destructive" },
  }

  const { label, variant } = config[status] || config.pendente

  return <Badge variant={variant}>{label}</Badge>
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <Badge variant="outline" className="gap-1">
      {tipo === "PF" ? (
        <>
          <User className="h-3 w-3" />
          Pessoa Física
        </>
      ) : (
        <>
          <Building2 className="h-3 w-3" />
          Pessoa Jurídica
        </>
      )}
    </Badge>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
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
    ativos: 0,
    pendentes: 0,
    saldoTotal: 0,
  })

  async function fetchClientes(page = 1) {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      })
      
      if (searchTerm) params.set("search", searchTerm)
      if (filterStatus) params.set("status", filterStatus)

      const response = await fetch(`/api/clientes?${params}`)
      const data = await response.json()

      if (data.data) {
        setClientes(data.data)
        setPagination(data.pagination)

        // Calcular estatísticas
        const ativos = data.data.filter((c: Cliente) => c.status === "ativo").length
        const pendentes = data.data.filter((c: Cliente) => c.status === "pendente").length
        const saldoTotal = data.data.reduce((acc: number, c: Cliente) => acc + c.saldo, 0)

        setStats({
          total: data.pagination.total,
          ativos,
          pendentes,
          saldoTotal,
        })
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [filterStatus])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchClientes(pagination.page)
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e visualize informações de cadastro
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fetchClientes(pagination.page)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Link href="/dashboard/clientes/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
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
              <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
              <UserX className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.saldoTotal)}
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
                placeholder="Buscar por nome, email ou documento..."
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
                  <DropdownMenuItem onClick={() => setFilterStatus("ativo")}>
                    Ativos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("inativo")}>
                    Inativos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("pendente")}>
                    Pendentes
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
          ) : clientes.length === 0 ? (
            <div className="flex h-[400px] flex-col items-center justify-center gap-4">
              <User className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              <Link href="/dashboard/clientes/novo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Saldo Pendente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Boletos
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {cliente.nome
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{cliente.nome}</p>
                            {cliente.email && (
                              <p className="text-sm text-muted-foreground">
                                {cliente.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {cliente.tipo === "PF"
                            ? formatCPF(cliente.documento)
                            : formatCNPJ(cliente.documento)}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <TipoBadge tipo={cliente.tipo} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={cliente.status} />
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {formatCurrency(cliente.saldo)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="gap-1">
                          <Receipt className="h-3 w-3" />
                          {cliente.totalBoletos}
                        </Badge>
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
                              <Link href={`/dashboard/clientes/${cliente.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/boletos/novo?clienteId=${cliente.id}`}>
                                <Receipt className="mr-2 h-4 w-4" />
                                Emitir boleto
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(cliente.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
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

          {/* Pagination */}
          {!isLoading && clientes.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {clientes.length} de {pagination.total} clientes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => fetchClientes(pagination.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchClientes(pagination.page + 1)}
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

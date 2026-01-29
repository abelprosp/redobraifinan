"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatCPF, formatCNPJ } from "@/lib/utils"
import {
  ArrowLeft,
  Loader2,
  QrCode,
  Barcode,
  Search,
  Calendar,
  Receipt,
  Info,
  User,
  Calculator,
  Building2,
  Landmark,
  FileText,
} from "lucide-react"
import { toast } from "sonner"

interface Cliente {
  id: string
  nome: string
  documento: string
  email?: string
  tipo: "PF" | "PJ"
}

// Regras de tributação baseadas na planilha
const regrasTributacao: Record<string, { nome: string; pis: number; cofins: number; csll: number; ir: number; icon: any }> = {
  SEM_RETENCAO: { nome: "Sem Retenção", pis: 0, cofins: 0, csll: 0, ir: 0, icon: User },
  PJ_PRIVADA: { nome: "PJ Privada Fora do Simples", pis: 0.65, cofins: 3.0, csll: 1.0, ir: 1.5, icon: Building2 },
  SIMPLES_ORGAO_ME: { nome: "Simples / Órgãos Municipais/Estaduais", pis: 0, cofins: 0, csll: 0, ir: 1.5, icon: FileText },
  ORGAO_FEDERAL: { nome: "Órgãos Públicos Federais", pis: 0.65, cofins: 3.0, csll: 1.0, ir: 4.8, icon: Landmark },
}

export default function NovoBoletoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get("clienteId")

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClientes, setIsLoadingClientes] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState("")
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  const [formData, setFormData] = useState({
    tipo: "HIBRIDO" as "NORMAL" | "HIBRIDO",
    tipoTributacao: "SEM_RETENCAO",
    valor: "",
    dataVencimento: "",
    seuNumero: "",
    juros: "0.033",
    multa: "2",
    desconto1: "",
    dataDesconto1: "",
    mensagem1: "",
    mensagem2: "",
    aplicarRetencao: false,
  })

  // Calcular retenções
  const calcularRetencoes = () => {
    if (!formData.valor || !formData.aplicarRetencao) {
      return null
    }

    const valorBruto = parseFloat(formData.valor.replace(/\D/g, "")) / 100
    const regra = regrasTributacao[formData.tipoTributacao]

    if (!regra || formData.tipoTributacao === "SEM_RETENCAO") {
      return null
    }

    const pis = (valorBruto * regra.pis) / 100
    const cofins = (valorBruto * regra.cofins) / 100
    const csll = (valorBruto * regra.csll) / 100
    const ir = (valorBruto * regra.ir) / 100
    const totalRetencoes = pis + cofins + csll + ir
    const valorLiquido = valorBruto - totalRetencoes

    return {
      valorBruto,
      pis,
      cofins,
      csll,
      ir,
      totalRetencoes,
      valorLiquido,
      regra,
    }
  }

  const retencoes = calcularRetencoes()

  // Buscar clientes
  useEffect(() => {
    async function fetchClientes() {
      try {
        const response = await fetch("/api/clientes?limit=100")
        const data = await response.json()
        if (data.data) {
          setClientes(data.data)
          
          if (clienteIdParam) {
            const cliente = data.data.find((c: Cliente) => c.id === clienteIdParam)
            if (cliente) {
              setClienteSelecionado(cliente)
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar clientes:", error)
      } finally {
        setIsLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [clienteIdParam])

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
      c.documento.includes(searchCliente.replace(/\D/g, ""))
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!clienteSelecionado) {
      toast.error("Selecione um cliente")
      return
    }

    if (!formData.valor || !formData.dataVencimento) {
      toast.error("Preencha o valor e a data de vencimento")
      return
    }

    setIsLoading(true)

    // Valor final do boleto (líquido se houver retenção)
    const valorFinal = retencoes ? retencoes.valorLiquido : parseFloat(formData.valor.replace(/\D/g, "")) / 100

    try {
      const response = await fetch("/api/boletos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSelecionado.id,
          tipo: formData.tipo,
          valor: valorFinal,
          valorBruto: retencoes ? retencoes.valorBruto : valorFinal,
          tipoTributacao: formData.tipoTributacao,
          retencoes: retencoes ? {
            pis: retencoes.pis,
            cofins: retencoes.cofins,
            csll: retencoes.csll,
            ir: retencoes.ir,
            total: retencoes.totalRetencoes,
          } : null,
          dataVencimento: formData.dataVencimento,
          seuNumero: formData.seuNumero || undefined,
          juros: parseFloat(formData.juros) || 0.033,
          multa: parseFloat(formData.multa) || 2,
          desconto1: formData.desconto1 ? parseFloat(formData.desconto1) : undefined,
          dataDesconto1: formData.dataDesconto1 || undefined,
          mensagem1: formData.mensagem1 || undefined,
          mensagem2: formData.mensagem2 || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar boleto")
        return
      }

      if (retencoes) {
        toast.success(`Boleto criado! Valor líquido: ${formatCurrency(retencoes.valorLiquido)}`)
      } else {
        toast.success("Boleto criado com sucesso!")
      }
      router.push("/dashboard/boletos")
    } catch (error) {
      toast.error("Erro ao criar boleto")
    } finally {
      setIsLoading(false)
    }
  }

  function formatCurrencyInput(value: string) {
    const numbers = value.replace(/\D/g, "")
    const formatted = (parseInt(numbers || "0") / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return formatted
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/boletos">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Boleto</h1>
          <p className="text-muted-foreground">
            Emita um novo boleto de cobrança com cálculo automático de retenções
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Cobrança */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Cobrança</CardTitle>
                <CardDescription>
                  Escolha entre boleto tradicional ou híbrido com PIX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.tipo === "NORMAL" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, tipo: "NORMAL" })}
                  >
                    <Barcode className="mr-2 h-4 w-4" />
                    Boleto Tradicional
                  </Button>
                  <Button
                    type="button"
                    variant={formData.tipo === "HIBRIDO" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, tipo: "HIBRIDO" })}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    PIX + Boleto (Híbrido)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
                <CardDescription>
                  Selecione o cliente para esta cobrança
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClientes ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando clientes...
                  </div>
                ) : clienteSelecionado ? (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{clienteSelecionado.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {clienteSelecionado.tipo === "PF"
                            ? formatCPF(clienteSelecionado.documento)
                            : formatCNPJ(clienteSelecionado.documento)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setClienteSelecionado(null)
                        setShowClienteDropdown(true)
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente por nome ou documento..."
                        className="pl-10"
                        value={searchCliente}
                        onChange={(e) => {
                          setSearchCliente(e.target.value)
                          setShowClienteDropdown(true)
                        }}
                        onFocus={() => setShowClienteDropdown(true)}
                      />
                    </div>
                    {showClienteDropdown && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-[300px] overflow-auto">
                        {clientesFiltrados.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum cliente encontrado.{" "}
                            <Link href="/dashboard/clientes/novo" className="text-primary hover:underline">
                              Criar novo
                            </Link>
                          </div>
                        ) : (
                          clientesFiltrados.map((cliente) => (
                            <button
                              key={cliente.id}
                              type="button"
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                              onClick={() => {
                                setClienteSelecionado(cliente)
                                setShowClienteDropdown(false)
                                setSearchCliente("")
                              }}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{cliente.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cliente.tipo === "PF"
                                    ? formatCPF(cliente.documento)
                                    : formatCNPJ(cliente.documento)}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados do Boleto */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Boleto</CardTitle>
                <CardDescription>
                  Valor e vencimento da cobrança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Bruto *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        className="pl-10"
                        value={formData.valor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            valor: formatCurrencyInput(e.target.value),
                          })
                        }
                        placeholder="0,00"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vencimento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        value={formData.dataVencimento}
                        onChange={(e) =>
                          setFormData({ ...formData, dataVencimento: e.target.value })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Seu Número (referência)</label>
                  <Input
                    value={formData.seuNumero}
                    onChange={(e) =>
                      setFormData({ ...formData, seuNumero: e.target.value })
                    }
                    placeholder="Ex: NF-1234, Pedido-567"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Retenção de Impostos */}
            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-orange-500" />
                  Retenção de Impostos (Opcional)
                </CardTitle>
                <CardDescription>
                  Configure as retenções federais conforme Lei 10.833/2003 e Decreto 9.580/2018
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={formData.aplicarRetencao}
                    onChange={(e) =>
                      setFormData({ ...formData, aplicarRetencao: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">Aplicar retenções de impostos</p>
                    <p className="text-sm text-muted-foreground">
                      O boleto será gerado com o valor líquido (após descontos)
                    </p>
                  </div>
                </label>

                {formData.aplicarRetencao && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Tipo de Cliente (Tributação)</label>
                    <div className="grid gap-2">
                      {Object.entries(regrasTributacao).filter(([key]) => key !== "SEM_RETENCAO").map(([key, regra]) => {
                        const Icon = regra.icon
                        const isSelected = formData.tipoTributacao === key
                        const totalRetencao = regra.pis + regra.cofins + regra.csll + regra.ir

                        return (
                          <button
                            key={key}
                            type="button"
                            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setFormData({ ...formData, tipoTributacao: key })}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <div>
                                <p className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                                  {regra.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  PIS {regra.pis}% | COFINS {regra.cofins}% | CSLL {regra.csll}% | IR {regra.ir}%
                                </p>
                              </div>
                            </div>
                            <Badge variant={isSelected ? "default" : "outline"}>
                              {totalRetencao.toFixed(2)}%
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Juros e Multa */}
            <Card>
              <CardHeader>
                <CardTitle>Juros e Multa</CardTitle>
                <CardDescription>
                  Configurações para atraso no pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Juros ao dia (%)</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.juros}
                      onChange={(e) =>
                        setFormData({ ...formData, juros: e.target.value })
                      }
                      placeholder="0.033"
                    />
                    <p className="text-xs text-muted-foreground">
                      Padrão: 0.033% ao dia (1% ao mês)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Multa por atraso (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.multa}
                      onChange={(e) =>
                        setFormData({ ...formData, multa: e.target.value })
                      }
                      placeholder="2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo permitido: 2%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mensagens */}
            <Card>
              <CardHeader>
                <CardTitle>Mensagens</CardTitle>
                <CardDescription>
                  Instruções que aparecerão no boleto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem 1</label>
                  <Input
                    value={formData.mensagem1}
                    onChange={(e) =>
                      setFormData({ ...formData, mensagem1: e.target.value })
                    }
                    placeholder="Ex: Não receber após vencimento"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem 2</label>
                  <Input
                    value={formData.mensagem2}
                    onChange={(e) =>
                      setFormData({ ...formData, mensagem2: e.target.value })
                    }
                    placeholder="Ex: Referente à NF 1234"
                    maxLength={80}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Resumo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Boleto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {formData.tipo === "HIBRIDO" ? (
                      <>
                        <QrCode className="mr-1 h-3 w-3" />
                        PIX + Boleto
                      </>
                    ) : (
                      <>
                        <Barcode className="mr-1 h-3 w-3" />
                        Boleto Tradicional
                      </>
                    )}
                  </Badge>
                </div>

                {clienteSelecionado && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{clienteSelecionado.nome}</p>
                  </div>
                )}

                {formData.valor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Bruto</p>
                    <p className="text-xl font-bold">
                      R$ {formData.valor}
                    </p>
                  </div>
                )}

                {formData.dataVencimento && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">
                      {new Date(formData.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cálculo das Retenções */}
            {retencoes && (
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-orange-500" />
                    Cálculo das Retenções
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    {retencoes.pis > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PIS ({retencoes.regra.pis}%):</span>
                        <span className="text-red-600">-{formatCurrency(retencoes.pis)}</span>
                      </div>
                    )}
                    {retencoes.cofins > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">COFINS ({retencoes.regra.cofins}%):</span>
                        <span className="text-red-600">-{formatCurrency(retencoes.cofins)}</span>
                      </div>
                    )}
                    {retencoes.csll > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CSLL ({retencoes.regra.csll}%):</span>
                        <span className="text-red-600">-{formatCurrency(retencoes.csll)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IR ({retencoes.regra.ir}%):</span>
                      <span className="text-red-600">-{formatCurrency(retencoes.ir)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Retenções:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(retencoes.totalRetencoes)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Valor do Boleto:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(retencoes.valorLiquido)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este é o valor que será cobrado no boleto
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Dica</p>
                    <p className="text-muted-foreground mt-1">
                      {formData.aplicarRetencao
                        ? "As retenções serão descontadas automaticamente. O cliente receberá o boleto com o valor líquido."
                        : "Ative a retenção de impostos se precisar descontar PIS, COFINS, CSLL e IR do valor."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading || !clienteSelecionado}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando boleto...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Gerar Boleto
                  </>
                )}
              </Button>
              <Link href="/dashboard/boletos">
                <Button variant="outline" className="w-full">
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

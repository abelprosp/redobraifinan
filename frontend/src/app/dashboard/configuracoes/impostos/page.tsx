"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Calculator,
  Save,
  Loader2,
  FileText,
  Building2,
  Landmark,
  Info,
  Plus,
  Trash2,
  Settings,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface RegraImposto {
  id: string
  nome: string
  descricao: string
  tipoCliente: string
  pis: number
  cofins: number
  csll: number
  ir: number
  iss: number
  retencaoCsrf: number
  ativo: boolean
}

// Regras baseadas na planilha
const regrasIniciais: RegraImposto[] = [
  {
    id: "1",
    nome: "Empresa Privada Fora do Simples",
    descricao: "PJ setor privado, sindicato, cooperativas",
    tipoCliente: "PJ_PRIVADA",
    pis: 0.65,
    cofins: 3.0,
    csll: 1.0,
    ir: 1.5,
    iss: 2.5,
    retencaoCsrf: 4.65,
    ativo: true,
  },
  {
    id: "2",
    nome: "Simples Nacional / Órgãos Municipais e Estaduais",
    descricao: "Prefeituras, Secretarias de Governo, etc.",
    tipoCliente: "SIMPLES_ORGAO_ME",
    pis: 0,
    cofins: 0,
    csll: 0,
    ir: 1.5,
    iss: 2.5,
    retencaoCsrf: 0,
    ativo: true,
  },
  {
    id: "3",
    nome: "Órgãos Públicos Federais",
    descricao: "Governo Federal, Banco CEF, Banco do Brasil",
    tipoCliente: "ORGAO_FEDERAL",
    pis: 0.65,
    cofins: 3.0,
    csll: 1.0,
    ir: 4.8,
    iss: 2.5,
    retencaoCsrf: 4.65,
    ativo: true,
  },
]

interface ConfiguracaoNFSe {
  cnae: string
  itemListaServico: string
  naturezaOperacao: string
  regimeEspecial: string
  municipioServico: string
  aliquotaIss: number
  descricaoServico: string
  serieNfse: string
  proximoNumero: number
  ambienteEmissao: string
}

export default function ImpostosPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [regras, setRegras] = useState<RegraImposto[]>(regrasIniciais)
  const [configNfse, setConfigNfse] = useState<ConfiguracaoNFSe>({
    cnae: "7020400",
    itemListaServico: "1701",
    naturezaOperacao: "5.2",
    regimeEspecial: "nenhum",
    municipioServico: "Lajeado - RS",
    aliquotaIss: 2.5,
    descricaoServico: "Assessoria e consultoria em telecom",
    serieNfse: "RPS",
    proximoNumero: 1,
    ambienteEmissao: "homologacao",
  })

  const [valorSimulacao, setValorSimulacao] = useState("")
  const [regraSimulacao, setRegraSimulacao] = useState<string>("1")

  function calcularRetencoes(valor: number, regra: RegraImposto) {
    const pisValor = (valor * regra.pis) / 100
    const cofinsValor = (valor * regra.cofins) / 100
    const csllValor = (valor * regra.csll) / 100
    const irValor = (valor * regra.ir) / 100
    const issValor = (valor * regra.iss) / 100
    const totalRetencoes = pisValor + cofinsValor + csllValor + irValor
    const valorLiquido = valor - totalRetencoes

    return {
      pis: pisValor,
      cofins: cofinsValor,
      csll: csllValor,
      ir: irValor,
      iss: issValor,
      totalRetencoes,
      valorLiquido,
    }
  }

  async function handleSave() {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success("Configurações de impostos salvas!")
    }, 1500)
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const regraAtual = regras.find((r) => r.id === regraSimulacao)
  const simulacao = regraAtual && valorSimulacao
    ? calcularRetencoes(parseFloat(valorSimulacao), regraAtual)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de Impostos</h1>
          <p className="text-muted-foreground">
            Configure as regras de retenção para boletos e notas fiscais
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      {/* Alerta Informativo */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-600">Retenção de impostos federais</p>
              <p className="text-sm text-muted-foreground">
                Conforme Lei Nº 10.833/2003 e Decreto 9.580/2018. A retenção CSRF de 4,65% 
                (PIS + COFINS + CSLL) é aplicada para pagamentos de serviços de limpeza, 
                conservação, manutenção, etc. O IR é retido conforme Art. 714 § 1º, XII.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Regras de Retenção */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Regras de Retenção por Tipo de Cliente
          </h2>

          {regras.map((regra) => (
            <Card key={regra.id} className={!regra.ativo ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {regra.tipoCliente === "ORGAO_FEDERAL" && <Landmark className="h-4 w-4" />}
                      {regra.tipoCliente === "PJ_PRIVADA" && <Building2 className="h-4 w-4" />}
                      {regra.tipoCliente === "SIMPLES_ORGAO_ME" && <FileText className="h-4 w-4" />}
                      {regra.nome}
                    </CardTitle>
                    <CardDescription>{regra.descricao}</CardDescription>
                  </div>
                  <Badge variant={regra.ativo ? "success" : "secondary"}>
                    {regra.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">PIS</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={regra.pis}
                      onChange={(e) => {
                        setRegras(regras.map((r) =>
                          r.id === regra.id ? { ...r, pis: parseFloat(e.target.value) || 0 } : r
                        ))
                      }}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">COFINS</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={regra.cofins}
                      onChange={(e) => {
                        setRegras(regras.map((r) =>
                          r.id === regra.id ? { ...r, cofins: parseFloat(e.target.value) || 0 } : r
                        ))
                      }}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">CSLL</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={regra.csll}
                      onChange={(e) => {
                        setRegras(regras.map((r) =>
                          r.id === regra.id ? { ...r, csll: parseFloat(e.target.value) || 0 } : r
                        ))
                      }}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">IR</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={regra.ir}
                      onChange={(e) => {
                        setRegras(regras.map((r) =>
                          r.id === regra.id ? { ...r, ir: parseFloat(e.target.value) || 0 } : r
                        ))
                      }}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">ISS</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={regra.iss}
                      onChange={(e) => {
                        setRegras(regras.map((r) =>
                          r.id === regra.id ? { ...r, iss: parseFloat(e.target.value) || 0 } : r
                        ))
                      }}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Resumo da retenção */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Retenção Federal:</span>
                    <span className="font-medium">
                      {(regra.pis + regra.cofins + regra.csll + regra.ir).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">CSRF (PIS + COFINS + CSLL):</span>
                    <span className="font-medium">
                      {(regra.pis + regra.cofins + regra.csll).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Códigos DARF */}
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>DARF CSLL/PIS/COFINS: <strong>5952/07</strong></span>
                  <span>DARF IRRF: <strong>1708/06</strong></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar - Configuração NFSe e Simulador */}
        <div className="space-y-6">
          {/* Simulador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Simulador de Retenção
              </CardTitle>
              <CardDescription>
                Calcule as retenções antes de emitir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Cliente</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={regraSimulacao}
                  onChange={(e) => setRegraSimulacao(e.target.value)}
                >
                  {regras.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Valor do Serviço</label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorSimulacao}
                  onChange={(e) => setValorSimulacao(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {simulacao && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PIS ({regraAtual?.pis}%):</span>
                    <span className="text-red-600">-{formatCurrency(simulacao.pis)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COFINS ({regraAtual?.cofins}%):</span>
                    <span className="text-red-600">-{formatCurrency(simulacao.cofins)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CSLL ({regraAtual?.csll}%):</span>
                    <span className="text-red-600">-{formatCurrency(simulacao.csll)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IR ({regraAtual?.ir}%):</span>
                    <span className="text-red-600">-{formatCurrency(simulacao.ir)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total Retenções:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(simulacao.totalRetencoes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t">
                    <span className="font-medium">Valor Líquido:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(simulacao.valorLiquido)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração NFSe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Configuração NFSe
              </CardTitle>
              <CardDescription>
                Dados para emissão de notas fiscais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">CNAE</label>
                  <Input
                    value={configNfse.cnae}
                    onChange={(e) => setConfigNfse({ ...configNfse, cnae: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Item Lista</label>
                  <Input
                    value={configNfse.itemListaServico}
                    onChange={(e) => setConfigNfse({ ...configNfse, itemListaServico: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Nat. Operação</label>
                  <Input
                    value={configNfse.naturezaOperacao}
                    onChange={(e) => setConfigNfse({ ...configNfse, naturezaOperacao: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Alíquota ISS %</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={configNfse.aliquotaIss}
                    onChange={(e) => setConfigNfse({ ...configNfse, aliquotaIss: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Município do Serviço</label>
                <Input
                  value={configNfse.municipioServico}
                  onChange={(e) => setConfigNfse({ ...configNfse, municipioServico: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Descrição Padrão do Serviço</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  value={configNfse.descricaoServico}
                  onChange={(e) => setConfigNfse({ ...configNfse, descricaoServico: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Ambiente de Emissão</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={configNfse.ambienteEmissao}
                  onChange={(e) => setConfigNfse({ ...configNfse, ambienteEmissao: e.target.value })}
                >
                  <option value="homologacao">Homologação (Testes)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Regime Especial: {configNfse.regimeEspecial}. O boleto será gerado com o valor líquido (após retenções).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

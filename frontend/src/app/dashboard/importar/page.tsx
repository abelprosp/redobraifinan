"use client"

import React, { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Upload,
  FileSpreadsheet,
  Download,
  Users,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ArrowRight,
  Trash2,
  Eye,
  Play,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

type ImportType = "clientes" | "cobrancas"

interface ImportRow {
  row: number
  data: Record<string, string>
  status: "valid" | "error" | "warning"
  errors: string[]
}

interface ImportResult {
  success: number
  errors: number
  warnings: number
  details: Array<{ row: number; message: string; type: "success" | "error" | "warning" }>
}

// Templates CSV
const templateClientes = `nome,documento,tipo,email,telefone,endereco,cidade,estado,cep,tipoTributacao
"Empresa ABC LTDA","12345678000199","PJ","contato@empresa.com","(11) 99999-9999","Av. Paulista, 1000","São Paulo","SP","01310-100","PJ_PRIVADA"
"João Silva","12345678901","PF","joao@email.com","(11) 98888-8888","Rua das Flores, 123","São Paulo","SP","01234-567","SEM_RETENCAO"
"Prefeitura Municipal","98765432000100","PJ","financeiro@prefeitura.gov.br","(51) 3333-3333","Praça Central, 1","Lajeado","RS","95900-000","SIMPLES_ORGAO_ME"`

const templateCobrancas = `cliente_documento,valor,data_vencimento,tipo_boleto,tipo_tributacao,descricao,seu_numero,acao
"12345678000199","1500.00","2026-02-15","HIBRIDO","PJ_PRIVADA","Mensalidade Janeiro","NF-001","criar"
"12345678901","350.50","2026-02-20","HIBRIDO","SEM_RETENCAO","Serviço de Consultoria","NF-002","criar"
"98765432000100","4000.00","2026-02-28","HIBRIDO","SIMPLES_ORGAO_ME","Contrato Mensal","NF-003","atualizar"`

export default function ImportarPage() {
  const [importType, setImportType] = useState<ImportType>("clientes")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload")
  const [modoAtualizacao, setModoAtualizacao] = useState(false) // Atualizar existentes automaticamente
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Download template
  function downloadTemplate(type: ImportType) {
    const content = type === "clientes" ? templateClientes : templateCobrancas
    const filename = type === "clientes" ? "template_clientes.csv" : "template_cobrancas.csv"
    
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success(`Template ${filename} baixado!`)
  }

  // Parse CSV
  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split("\n").filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
    const rows: Record<string, string>[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
      const row: Record<string, string> = {}
      
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || "").replace(/"/g, "").trim()
      })
      
      rows.push(row)
    }
    
    return rows
  }

  // Validar clientes
  function validateCliente(data: Record<string, string>, row: number): ImportRow {
    const errors: string[] = []
    
    if (!data.nome || data.nome.length < 3) {
      errors.push("Nome inválido (mínimo 3 caracteres)")
    }
    
    if (!data.documento) {
      errors.push("Documento obrigatório")
    } else {
      const doc = data.documento.replace(/\D/g, "")
      if (doc.length !== 11 && doc.length !== 14) {
        errors.push("CPF deve ter 11 dígitos ou CNPJ 14 dígitos")
      }
    }
    
    if (!data.tipo || !["PF", "PJ"].includes(data.tipo.toUpperCase())) {
      errors.push("Tipo deve ser PF ou PJ")
    }
    
    if (data.email && !data.email.includes("@")) {
      errors.push("Email inválido")
    }
    
    return {
      row,
      data,
      status: errors.length > 0 ? "error" : "valid",
      errors,
    }
  }

  // Validar cobranças
  function validateCobranca(data: Record<string, string>, row: number): ImportRow {
    const errors: string[] = []
    
    if (!data.cliente_documento) {
      errors.push("Documento do cliente obrigatório")
    }
    
    if (!data.valor || isNaN(parseFloat(data.valor)) || parseFloat(data.valor) <= 0) {
      errors.push("Valor inválido")
    }
    
    if (!data.data_vencimento) {
      errors.push("Data de vencimento obrigatória")
    } else {
      const date = new Date(data.data_vencimento)
      if (isNaN(date.getTime())) {
        errors.push("Data de vencimento inválida (use AAAA-MM-DD)")
      }
    }
    
    const tiposValidos = ["NORMAL", "HIBRIDO"]
    if (data.tipo_boleto && !tiposValidos.includes(data.tipo_boleto.toUpperCase())) {
      errors.push("Tipo de boleto deve ser NORMAL ou HIBRIDO")
    }
    
    return {
      row,
      data,
      status: errors.length > 0 ? "error" : "valid",
      errors,
    }
  }

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV")
      return
    }
    
    setFile(selectedFile)
    setIsProcessing(true)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)
      
      const validated = rows.map((row, idx) => {
        if (importType === "clientes") {
          return validateCliente(row, idx + 2)
        } else {
          return validateCobranca(row, idx + 2)
        }
      })
      
      setParsedData(validated)
      setStep("preview")
      setIsProcessing(false)
    }
    
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo")
      setIsProcessing(false)
    }
    
    reader.readAsText(selectedFile, "UTF-8")
  }, [importType])

  // Handle import
  async function handleImport() {
    const validRows = parsedData.filter(r => r.status === "valid")
    
    if (validRows.length === 0) {
      toast.error("Nenhum registro válido para importar")
      return
    }
    
    setIsImporting(true)
    
    const result: ImportResult = {
      success: 0,
      errors: 0,
      warnings: 0,
      details: [],
    }
    
    for (const row of parsedData) {
      if (row.status === "error") {
        result.errors++
        result.details.push({
          row: row.row,
          message: row.errors.join(", "),
          type: "error",
        })
        continue
      }
      
      try {
        if (importType === "clientes") {
          const acao = row.data.acao?.toLowerCase() || (modoAtualizacao ? "upsert" : "criar")
          const endpoint = acao === "atualizar" || acao === "upsert" 
            ? "/api/clientes/importar" 
            : "/api/clientes"
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: row.data.nome,
              documento: row.data.documento.replace(/\D/g, ""),
              tipo: row.data.tipo.toUpperCase(),
              email: row.data.email || null,
              telefone: row.data.telefone || null,
              endereco: row.data.endereco || null,
              cidade: row.data.cidade || null,
              estado: row.data.estado || null,
              cep: row.data.cep || null,
              tipoTributacao: row.data.tipoTributacao || "SEM_RETENCAO",
              acao: acao,
            }),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            result.success++
            const acaoRealizada = data.atualizado ? "atualizado" : "importado"
            result.details.push({
              row: row.row,
              message: `Cliente "${row.data.nome}" ${acaoRealizada}`,
              type: "success",
            })
          } else {
            result.errors++
            result.details.push({
              row: row.row,
              message: data.error || "Erro ao importar",
              type: "error",
            })
          }
        } else {
          // Cobranças - verifica se deve atualizar ou criar
          const acao = row.data.acao?.toLowerCase() || (modoAtualizacao ? "upsert" : "criar")
          const endpoint = acao === "atualizar" || acao === "upsert" 
            ? "/api/boletos/importar" 
            : "/api/boletos"
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteDocumento: row.data.cliente_documento.replace(/\D/g, ""),
              valor: parseFloat(row.data.valor),
              dataVencimento: row.data.data_vencimento,
              tipo: (row.data.tipo_boleto || "HIBRIDO").toUpperCase(),
              tipoTributacao: row.data.tipo_tributacao || "SEM_RETENCAO",
              descricao: row.data.descricao || null,
              seuNumero: row.data.seu_numero || null,
              acao: acao, // criar, atualizar, upsert
            }),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            result.success++
            const acaoRealizada = data.atualizado ? "atualizado" : "criado"
            result.details.push({
              row: row.row,
              message: `Boleto de ${formatCurrency(parseFloat(row.data.valor))} ${acaoRealizada}${row.data.seu_numero ? ` (${row.data.seu_numero})` : ""}`,
              type: "success",
            })
          } else {
            result.errors++
            result.details.push({
              row: row.row,
              message: data.error || "Erro ao importar",
              type: "error",
            })
          }
        }
      } catch (error) {
        result.errors++
        result.details.push({
          row: row.row,
          message: "Erro de conexão",
          type: "error",
        })
      }
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    setImportResult(result)
    setStep("result")
    setIsImporting(false)
    
    if (result.success > 0) {
      toast.success(`${result.success} registro(s) importado(s) com sucesso!`)
    }
    if (result.errors > 0) {
      toast.error(`${result.errors} erro(s) na importação`)
    }
  }

  // Reset
  function handleReset() {
    setFile(null)
    setParsedData([])
    setImportResult(null)
    setStep("upload")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Stats do preview
  const previewStats = {
    total: parsedData.length,
    valid: parsedData.filter(r => r.status === "valid").length,
    errors: parsedData.filter(r => r.status === "error").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importação em Massa</h1>
        <p className="text-muted-foreground">
          Importe clientes e cobranças a partir de arquivos CSV
        </p>
      </div>

      {/* Tipo de Importação */}
      <Card>
        <CardHeader>
          <CardTitle>O que você deseja importar?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setImportType("clientes")
                handleReset()
              }}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
                importType === "clientes"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className={`p-3 rounded-lg ${importType === "clientes" ? "bg-primary/10" : "bg-muted"}`}>
                <Users className={`h-6 w-6 ${importType === "clientes" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">Clientes</p>
                <p className="text-sm text-muted-foreground">
                  Cadastrar clientes em lote
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportType("cobrancas")
                handleReset()
              }}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
                importType === "cobrancas"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className={`p-3 rounded-lg ${importType === "cobrancas" ? "bg-primary/10" : "bg-muted"}`}>
                <Receipt className={`h-6 w-6 ${importType === "cobrancas" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">Cobranças / Boletos</p>
                <p className="text-sm text-muted-foreground">
                  Gerar boletos em lote
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Step: Upload */}
      {step === "upload" && (
        <>
          {/* Download Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                1. Baixar Template
              </CardTitle>
              <CardDescription>
                Use nosso modelo CSV para garantir que os dados estão no formato correto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => downloadTemplate(importType)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar template de {importType === "clientes" ? "clientes" : "cobranças"}
              </Button>

              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Campos do template:</p>
                {importType === "clientes" ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>nome</strong> - Nome completo ou razão social *</li>
                    <li>• <strong>documento</strong> - CPF ou CNPJ (somente números) * - usado como identificador</li>
                    <li>• <strong>tipo</strong> - PF ou PJ *</li>
                    <li>• <strong>email</strong> - Email do cliente</li>
                    <li>• <strong>telefone</strong> - Telefone com DDD</li>
                    <li>• <strong>endereco, cidade, estado, cep</strong> - Endereço</li>
                    <li>• <strong>tipoTributacao</strong> - SEM_RETENCAO, PJ_PRIVADA, SIMPLES_ORGAO_ME, ORGAO_FEDERAL</li>
                    <li>• <strong>acao</strong> - "criar", "atualizar" ou "upsert" (opcional)</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>cliente_documento</strong> - CPF/CNPJ do cliente (deve estar cadastrado) *</li>
                    <li>• <strong>valor</strong> - Valor do boleto (ex: 1500.00) *</li>
                    <li>• <strong>data_vencimento</strong> - Data no formato AAAA-MM-DD *</li>
                    <li>• <strong>tipo_boleto</strong> - NORMAL ou HIBRIDO</li>
                    <li>• <strong>tipo_tributacao</strong> - Tipo para cálculo de retenções</li>
                    <li>• <strong>descricao</strong> - Descrição da cobrança</li>
                    <li>• <strong>seu_numero</strong> - Referência interna (NF, pedido) - usado para atualização</li>
                    <li>• <strong>acao</strong> - "criar", "atualizar" ou "upsert" (opcional)</li>
                  </ul>
                )}
                
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modoAtualizacao}
                      onChange={(e) => setModoAtualizacao(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <div>
                      <p className="font-medium text-blue-700">Modo Atualização Automática</p>
                      <p className="text-xs text-blue-600">
                        {importType === "clientes" 
                          ? "Se ativado, clientes existentes (mesmo CPF/CNPJ) serão atualizados automaticamente"
                          : "Se ativado, boletos existentes (mesmo cliente + seu_numero) serão atualizados automaticamente"
                        }
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                2. Enviar Arquivo
              </CardTitle>
              <CardDescription>
                Selecione o arquivo CSV preenchido com os dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium">Clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">ou arraste o arquivo CSV aqui</p>
                  </div>
                )}
              </label>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Registros</p>
                    <p className="text-2xl font-bold">{previewStats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Válidos</p>
                    <p className="text-2xl font-bold text-green-600">{previewStats.valid}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Com Erros</p>
                    <p className="text-2xl font-bold text-red-600">{previewStats.errors}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview dos Dados</CardTitle>
                  <CardDescription>
                    Arquivo: {file?.name}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={previewStats.valid === 0 || isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Importar {previewStats.valid} registro(s)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium">Linha</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      {importType === "clientes" ? (
                        <>
                          <th className="px-4 py-2 text-left font-medium">Nome</th>
                          <th className="px-4 py-2 text-left font-medium">Documento</th>
                          <th className="px-4 py-2 text-left font-medium">Tipo</th>
                          <th className="px-4 py-2 text-left font-medium">Email</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-left font-medium">Cliente</th>
                          <th className="px-4 py-2 text-left font-medium">Valor</th>
                          <th className="px-4 py-2 text-left font-medium">Vencimento</th>
                          <th className="px-4 py-2 text-left font-medium">Tipo</th>
                        </>
                      )}
                      <th className="px-4 py-2 text-left font-medium">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row) => (
                      <tr key={row.row} className={`border-b ${row.status === "error" ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                        <td className="px-4 py-2">{row.row}</td>
                        <td className="px-4 py-2">
                          {row.status === "valid" ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Erro
                            </Badge>
                          )}
                        </td>
                        {importType === "clientes" ? (
                          <>
                            <td className="px-4 py-2">{row.data.nome || "-"}</td>
                            <td className="px-4 py-2">{row.data.documento || "-"}</td>
                            <td className="px-4 py-2">{row.data.tipo || "-"}</td>
                            <td className="px-4 py-2">{row.data.email || "-"}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2">{row.data.cliente_documento || "-"}</td>
                            <td className="px-4 py-2">
                              {row.data.valor ? formatCurrency(parseFloat(row.data.valor)) : "-"}
                            </td>
                            <td className="px-4 py-2">{row.data.data_vencimento || "-"}</td>
                            <td className="px-4 py-2">{row.data.tipo_boleto || "HIBRIDO"}</td>
                          </>
                        )}
                        <td className="px-4 py-2 text-sm text-red-600">
                          {row.errors.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step: Result */}
      {step === "result" && importResult && (
        <>
          {/* Result Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Importados</p>
                    <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-3xl font-bold text-red-600">{importResult.errors}</p>
                  </div>
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">{importResult.success + importResult.errors}</p>
                  </div>
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultado da Importação</CardTitle>
                  <CardDescription>
                    Detalhes de cada registro processado
                  </CardDescription>
                </div>
                <Button onClick={handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Nova Importação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {importResult.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      detail.type === "success"
                        ? "bg-green-500/10"
                        : detail.type === "error"
                        ? "bg-red-500/10"
                        : "bg-yellow-500/10"
                    }`}
                  >
                    {detail.type === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : detail.type === "error" ? (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">Linha {detail.row}:</span> {detail.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

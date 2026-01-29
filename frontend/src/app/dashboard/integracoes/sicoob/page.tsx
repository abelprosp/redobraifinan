"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Building2,
  Shield,
  AlertCircle,
  FileText,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Webhook,
  Database,
} from "lucide-react"
import { toast } from "sonner"

interface IntegracaoConfig {
  id?: string
  provider: string
  nome: string
  isActive: boolean
  environment: string
  clientId: string
  clientSecret: string
  numeroContrato: string
  cooperativa: string
  chavePix: string
  webhookUrl: string
  hasCredentials: boolean
  hasClientId?: boolean
  hasClientSecret?: boolean
  lastConnectionAt?: string
  lastConnectionStatus?: string
  lastError?: string
}

export default function SicoobIntegrationPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  
  const [config, setConfig] = useState<IntegracaoConfig>({
    provider: "sicoob",
    nome: "Sicoob",
    isActive: false,
    environment: "sandbox",
    clientId: "",
    clientSecret: "",
    numeroContrato: "",
    cooperativa: "",
    chavePix: "",
    webhookUrl: "",
    hasCredentials: false,
  })

  // Carregar configuração existente
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch("/api/integracoes/sicoob")
        if (response.ok) {
          const data = await response.json()
          setConfig({
            ...config,
            ...data,
            // Manter campos de credenciais vazios
            clientId: "",
            clientSecret: "",
          })
        }
      } catch (error) {
        console.error("Erro ao carregar configuração:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [])

  async function handleSave() {
    if (!config.numeroContrato) {
      toast.error("Preencha o número do contrato")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/integracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "sicoob",
          nome: "Sicoob",
          environment: config.environment,
          clientId: config.clientId || undefined,
          clientSecret: config.clientSecret || undefined,
          numeroContrato: config.numeroContrato,
          cooperativa: config.cooperativa,
          chavePix: config.chavePix,
          webhookUrl: config.webhookUrl,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || "Configurações salvas com sucesso!")
        // Recarregar para atualizar indicadores
        const reloadResponse = await fetch("/api/integracoes/sicoob")
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json()
          setConfig({
            ...config,
            ...reloadData,
            clientId: "",
            clientSecret: "",
          })
        }
      } else {
        toast.error(data.error || "Erro ao salvar configurações")
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestConnection() {
    setIsTesting(true)
    try {
      const response = await fetch("/api/integracoes/sicoob/test", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || "Conexão estabelecida com sucesso!")
        setConfig({
          ...config,
          lastConnectionAt: new Date().toISOString(),
          lastConnectionStatus: "success",
          lastError: undefined,
        })
      } else {
        toast.error(data.error || "Falha ao conectar")
        setConfig({
          ...config,
          lastConnectionAt: new Date().toISOString(),
          lastConnectionStatus: "error",
          lastError: data.error,
        })
      }
    } catch (error) {
      toast.error("Erro ao testar conexão")
    } finally {
      setIsTesting(false)
    }
  }

  async function handleToggleActive() {
    try {
      const response = await fetch("/api/integracoes/sicoob/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !config.isActive }),
      })

      const data = await response.json()

      if (data.success) {
        setConfig({ ...config, isActive: data.isActive })
        toast.success(data.message)
      } else {
        toast.error(data.error || "Erro ao alterar status")
      }
    } catch (error) {
      toast.error("Erro ao alterar status")
    }
  }

  function copyWebhookUrl() {
    const webhookUrl = `${window.location.origin}/api/webhooks/sicoob`
    navigator.clipboard.writeText(webhookUrl)
    toast.success("URL copiada!")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/integracoes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Integração Sicoob</h1>
              <p className="text-muted-foreground">
                Configure a conexão com a API do Sicoob
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {config.isActive ? "Ativo" : "Inativo"}
            </span>
            <Switch
              checked={config.isActive}
              onCheckedChange={handleToggleActive}
              disabled={!config.hasCredentials}
            />
          </div>
          <Badge variant={config.lastConnectionStatus === "success" ? "success" : config.lastConnectionStatus === "error" ? "destructive" : "secondary"}>
            {config.lastConnectionStatus === "success" ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Conectado
              </>
            ) : config.lastConnectionStatus === "error" ? (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Erro
              </>
            ) : (
              "Não testado"
            )}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-700">Portal de Desenvolvedores Sicoob</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para obter suas credenciais de API, acesse o portal de desenvolvedores do Sicoob
                e crie uma aplicação para sua cooperativa.
              </p>
              <a 
                href="https://developers.sicoob.com.br/portal/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
              >
                Acessar Portal Sicoob
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credenciais */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Credenciais OAuth2
                  </CardTitle>
                  <CardDescription>
                    Credenciais de acesso à API do Sicoob
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Client ID *
                  {config.hasClientId && (
                    <Badge variant="outline" className="ml-2 text-xs">Configurado</Badge>
                  )}
                </label>
                <Input
                  type={showCredentials ? "text" : "password"}
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  placeholder={config.hasClientId ? "••••••••••••" : "seu-client-id"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Client Secret *
                  {config.hasClientSecret && (
                    <Badge variant="outline" className="ml-2 text-xs">Configurado</Badge>
                  )}
                </label>
                <Input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  placeholder={config.hasClientSecret ? "••••••••••••••••" : "seu-client-secret"}
                />
              </div>

              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isTesting || !config.hasCredentials}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar Conexão
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Dados da Cooperativa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Cooperativa
              </CardTitle>
              <CardDescription>
                Informações da sua cooperativa Sicoob
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número do Contrato *</label>
                  <Input
                    value={config.numeroContrato}
                    onChange={(e) => setConfig({ ...config, numeroContrato: e.target.value })}
                    placeholder="12345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número do contrato de cobrança
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Código da Cooperativa</label>
                  <Input
                    value={config.cooperativa}
                    onChange={(e) => setConfig({ ...config, cooperativa: e.target.value })}
                    placeholder="0001"
                    maxLength={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    4 dígitos da cooperativa
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chave PIX</label>
                <Input
                  value={config.chavePix}
                  onChange={(e) => setConfig({ ...config, chavePix: e.target.value })}
                  placeholder="sua-chave-pix@email.com ou CNPJ"
                />
                <p className="text-xs text-muted-foreground">
                  Chave PIX cadastrada na conta para recebimentos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ambiente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ambiente
              </CardTitle>
              <CardDescription>
                Selecione o ambiente de execução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  config.environment === "sandbox" 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-muted-foreground/50"
                }`}>
                  <input
                    type="radio"
                    name="environment"
                    value="sandbox"
                    checked={config.environment === "sandbox"}
                    onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    config.environment === "sandbox" 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`} />
                  <div>
                    <p className="font-medium">Sandbox</p>
                    <p className="text-xs text-muted-foreground">Ambiente de testes</p>
                  </div>
                </label>

                <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  config.environment === "production" 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-muted-foreground/50"
                }`}>
                  <input
                    type="radio"
                    name="environment"
                    value="production"
                    checked={config.environment === "production"}
                    onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    config.environment === "production" 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`} />
                  <div>
                    <p className="font-medium">Produção</p>
                    <p className="text-xs text-muted-foreground">Ambiente real</p>
                  </div>
                </label>
              </div>

              {config.environment === "production" && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-xs text-yellow-700">
                      Em produção, é necessário configurar o certificado mTLS fornecido pelo Sicoob.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook
              </CardTitle>
              <CardDescription>
                URL para receber notificações de pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/sicoob`}
                  readOnly
                  className="bg-muted"
                />
                <Button variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no portal Sicoob para receber notificações de pagamentos em tempo real.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conexão</span>
                {config.lastConnectionStatus === "success" ? (
                  <Badge variant="success">Ativa</Badge>
                ) : config.lastConnectionStatus === "error" ? (
                  <Badge variant="destructive">Erro</Badge>
                ) : (
                  <Badge variant="secondary">Não testada</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ambiente</span>
                <Badge variant="outline" className="capitalize">{config.environment}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credenciais</span>
                <Badge variant={config.hasCredentials ? "success" : "secondary"}>
                  {config.hasCredentials ? "Configuradas" : "Pendente"}
                </Badge>
              </div>
              {config.lastConnectionAt && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Último teste</p>
                  <p className="text-sm">
                    {new Date(config.lastConnectionAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
              {config.lastError && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                  {config.lastError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funcionalidades */}
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Emissão de boletos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Boleto híbrido (PIX)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Consulta de boletos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Baixa de boletos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Alteração de vencimento
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Cobrança PIX
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Webhooks
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Segunda via PDF
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle>Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a 
                href="https://developers.sicoob.com.br/portal/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Database className="h-4 w-4" />
                Portal Desenvolvedores
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="https://developers.sicoob.com.br/#!/apis"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                Documentação API
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
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
      </div>
    </div>
  )
}

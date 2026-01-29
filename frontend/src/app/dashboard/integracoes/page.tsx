"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Settings,
  ExternalLink,
  ArrowRight,
  Zap,
  Building2,
  CreditCard,
  Globe,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

const integracoes = [
  {
    id: "sicredi",
    nome: "Sicredi",
    descricao: "Emissão de boletos e PIX via Sicredi",
    status: "conectado",
    tipo: "Banco",
    icon: Building2,
    cor: "bg-green-500",
    href: "/dashboard/integracoes/sicredi",
  },
  {
    id: "sicoob",
    nome: "Sicoob",
    descricao: "Emissão de boletos e PIX via Sicoob",
    status: "disponivel",
    tipo: "Banco",
    icon: Building2,
    cor: "bg-blue-600",
    href: "/dashboard/integracoes/sicoob",
  },
  {
    id: "stripe",
    nome: "Stripe",
    descricao: "Pagamentos internacionais com cartão",
    status: "disponivel",
    tipo: "Pagamentos",
    icon: CreditCard,
    cor: "bg-purple-500",
    href: "#",
  },
  {
    id: "asaas",
    nome: "Asaas",
    descricao: "Plataforma de cobranças e gestão",
    status: "disponivel",
    tipo: "Pagamentos",
    icon: Zap,
    cor: "bg-blue-500",
    href: "#",
  },
  {
    id: "nfe",
    nome: "Nota Fiscal",
    descricao: "Emissão automática de NF-e",
    status: "em_breve",
    tipo: "Fiscal",
    icon: Globe,
    cor: "bg-orange-500",
    href: "#",
  },
]

export default function IntegracoesPage() {
  function StatusBadge({ status }: { status: string }) {
    switch (status) {
      case "conectado":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Conectado
          </Badge>
        )
      case "disponivel":
        return (
          <Badge variant="outline" className="gap-1">
            Disponível
          </Badge>
        )
      case "em_breve":
        return (
          <Badge variant="secondary" className="gap-1">
            Em breve
          </Badge>
        )
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Desconectado
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Conecte o Redobrai Finan com seus bancos e serviços favoritos
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conectadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {integracoes.filter((i) => i.status === "conectado").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold">
                  {integracoes.filter((i) => i.status === "disponivel").length}
                </p>
              </div>
              <LinkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em breve</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {integracoes.filter((i) => i.status === "em_breve").length}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Integrações */}
      <div className="grid gap-4 md:grid-cols-2">
        {integracoes.map((integracao) => (
          <Card key={integracao.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${integracao.cor}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${integracao.cor}/10`}>
                    <integracao.icon className={`h-6 w-6 ${integracao.cor.replace("bg-", "text-")}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integracao.nome}</CardTitle>
                    <CardDescription>{integracao.descricao}</CardDescription>
                  </div>
                </div>
                <StatusBadge status={integracao.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{integracao.tipo}</Badge>
                
                {integracao.status === "conectado" ? (
                  <Link href={integracao.href}>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                  </Link>
                ) : integracao.status === "disponivel" && integracao.href !== "#" ? (
                  <Link href={integracao.href}>
                    <Button size="sm">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Conectar
                    </Button>
                  </Link>
                ) : integracao.status === "disponivel" ? (
                  <Button size="sm" disabled>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Em breve
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Em breve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure endpoints para receber notificações em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Endpoint de Pagamentos</p>
              <p className="text-sm text-muted-foreground">
                Receba notificações quando um pagamento for confirmado
              </p>
            </div>
            <Button variant="outline">
              Configurar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API REST
          </CardTitle>
          <CardDescription>
            Integre o Redobrai Finan com seus sistemas via API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Documentação da API</p>
                <p className="text-sm text-muted-foreground">
                  Acesse a documentação completa da nossa API REST
                </p>
              </div>
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver docs
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-2">Base URL</p>
              <code className="text-sm bg-background px-3 py-1 rounded">
                https://api.redobrai.com.br/v1
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

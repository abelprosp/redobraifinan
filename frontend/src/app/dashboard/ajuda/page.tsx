"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle,
  Search,
  MessageCircle,
  FileText,
  Video,
  Book,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

const categorias = [
  {
    titulo: "Primeiros Passos",
    descricao: "Aprenda a configurar sua conta",
    icon: Book,
    artigos: 5,
    cor: "bg-blue-500/10 text-blue-500",
  },
  {
    titulo: "Boletos e Cobranças",
    descricao: "Como emitir e gerenciar boletos",
    icon: FileText,
    artigos: 12,
    cor: "bg-green-500/10 text-green-500",
  },
  {
    titulo: "PIX e Pagamentos",
    descricao: "Configurar e receber via PIX",
    icon: MessageCircle,
    artigos: 8,
    cor: "bg-purple-500/10 text-purple-500",
  },
  {
    titulo: "Integrações",
    descricao: "Conectar com bancos e sistemas",
    icon: ExternalLink,
    artigos: 6,
    cor: "bg-orange-500/10 text-orange-500",
  },
]

const artigosPopulares = [
  {
    titulo: "Como emitir meu primeiro boleto",
    categoria: "Boletos",
    tempo: "3 min",
  },
  {
    titulo: "Configurar integração com Sicredi",
    categoria: "Integrações",
    tempo: "5 min",
  },
  {
    titulo: "Como cadastrar uma chave PIX",
    categoria: "PIX",
    tempo: "2 min",
  },
  {
    titulo: "Gerenciar cobranças recorrentes",
    categoria: "Cobranças",
    tempo: "4 min",
  },
  {
    titulo: "Exportar relatórios financeiros",
    categoria: "Relatórios",
    tempo: "3 min",
  },
]

const faqItems = [
  {
    pergunta: "Como faço para emitir um boleto?",
    resposta: "Acesse Cobranças > Boletos > Novo Boleto. Selecione o cliente, informe o valor e a data de vencimento. O boleto será gerado automaticamente com código de barras e QR Code PIX.",
  },
  {
    pergunta: "Quanto tempo leva para o pagamento ser confirmado?",
    resposta: "Pagamentos via PIX são confirmados instantaneamente. Boletos podem levar até 3 dias úteis para compensação, dependendo do banco pagador.",
  },
  {
    pergunta: "Como configurar a integração bancária?",
    resposta: "Vá em Configurações > Integrações > Sicredi. Você precisará das credenciais de API fornecidas pelo seu gerente de conta no Sicredi.",
  },
  {
    pergunta: "Posso cancelar um boleto já emitido?",
    resposta: "Sim, desde que o boleto ainda não tenha sido pago. Acesse o boleto e clique em 'Cancelar'. O sistema enviará o comando de baixa para o banco.",
  },
]

export default function AjudaPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Central de Ajuda</h1>
        <p className="text-muted-foreground mt-2">
          Como podemos ajudar você hoje?
        </p>

        {/* Busca */}
        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos, tutoriais..."
            className="pl-12 h-12 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categorias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categorias.map((categoria) => (
          <Card key={categoria.titulo} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className={`inline-flex p-3 rounded-lg ${categoria.cor} mb-4`}>
                <categoria.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{categoria.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-1">{categoria.descricao}</p>
              <p className="text-xs text-muted-foreground mt-3">
                {categoria.artigos} artigos
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Artigos Populares */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Artigos Populares</CardTitle>
            <CardDescription>
              Os conteúdos mais acessados pela comunidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {artigosPopulares.map((artigo, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{artigo.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{artigo.categoria}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {artigo.tempo}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Precisa de mais ajuda?</CardTitle>
            <CardDescription>
              Entre em contato com nosso suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-3">
              <MessageCircle className="h-5 w-5" />
              Chat ao vivo
              <Badge variant="success" className="ml-auto">Online</Badge>
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3">
              <Mail className="h-5 w-5" />
              suporte@redobrai.com.br
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3">
              <Phone className="h-5 w-5" />
              (11) 4000-0000
            </Button>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Horário de atendimento
              </p>
              <p className="text-sm font-medium">
                Segunda a Sexta, 8h às 18h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
          <CardDescription>
            Respostas rápidas para as dúvidas mais comuns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="font-medium">{item.pergunta}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openFaq === idx ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-muted-foreground">
                    {item.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vídeos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Tutoriais em Vídeo
          </CardTitle>
          <CardDescription>
            Aprenda visualmente com nossos tutoriais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Introdução ao Redobrai Finan",
              "Como emitir boletos",
              "Configurando integrações",
            ].map((titulo, idx) => (
              <div
                key={idx}
                className="relative group cursor-pointer rounded-lg overflow-hidden border"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-6 border-b-6 border-l-8 border-transparent border-l-white ml-1" />
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm">{titulo}</p>
                  <p className="text-xs text-muted-foreground">5:30</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

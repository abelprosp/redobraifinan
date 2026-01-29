"use client"

import React, { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Save,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Mail,
  Smartphone,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)

  const [notificacoes, setNotificacoes] = useState({
    emailPagamento: true,
    emailVencimento: true,
    pushPagamento: false,
    pushVencimento: true,
  })

  function handleSave() {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success("Configurações salvas!")
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência no Redobrai Finan
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Escolha o tema da interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "light" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <Sun className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Claro</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <Moon className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Escuro</p>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "system" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <Monitor className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Sistema</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure como deseja receber alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Notificar quando receber pagamento</span>
                    <input
                      type="checkbox"
                      checked={notificacoes.emailPagamento}
                      onChange={(e) => setNotificacoes({ ...notificacoes, emailPagamento: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Alertar boletos próximos do vencimento</span>
                    <input
                      type="checkbox"
                      checked={notificacoes.emailVencimento}
                      onChange={(e) => setNotificacoes({ ...notificacoes, emailVencimento: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Push (Navegador)
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Notificar quando receber pagamento</span>
                    <input
                      type="checkbox"
                      checked={notificacoes.pushPagamento}
                      onChange={(e) => setNotificacoes({ ...notificacoes, pushPagamento: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Alertar boletos próximos do vencimento</span>
                    <input
                      type="checkbox"
                      checked={notificacoes.pushVencimento}
                      onChange={(e) => setNotificacoes({ ...notificacoes, pushVencimento: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Proteja sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Autenticação em duas etapas</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Badge variant="outline">Desativado</Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Alterar senha</p>
                  <p className="text-sm text-muted-foreground">
                    Última alteração há 30 dias
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Key className="mr-2 h-4 w-4" />
                  Alterar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Sessões ativas</p>
                  <p className="text-sm text-muted-foreground">
                    1 dispositivo conectado
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Gerenciar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Idioma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Idioma e Região
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Idioma</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fuso horário</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  <option value="America/Manaus">Manaus (GMT-4)</option>
                  <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Formato de data</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                  <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Usuário logado */}
          <Card>
            <CardHeader>
              <CardTitle>Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Logado como</p>
                <p className="font-medium">{session?.user?.name || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Função</p>
                <Badge variant="outline">{session?.user?.role || "USER"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <Button className="w-full" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, User, Building2, Save } from "lucide-react"
import { toast } from "sonner"

export default function NovoClientePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF")
  const [formData, setFormData] = useState({
    nome: "",
    nomeFantasia: "",
    documento: "",
    email: "",
    telefone: "",
    celular: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    observacoes: "",
  })

  function formatCPF(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14)
  }

  function formatCNPJ(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18)
  }

  function formatPhone(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15)
  }

  function formatCEP(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tipo: tipoPessoa,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar cliente")
        return
      }

      toast.success("Cliente criado com sucesso!")
      router.push("/dashboard/clientes")
    } catch (error) {
      toast.error("Erro ao criar cliente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clientes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Cliente</h1>
          <p className="text-muted-foreground">
            Cadastre um novo cliente no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Pessoa */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Pessoa</CardTitle>
                <CardDescription>
                  Selecione se é pessoa física ou jurídica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={tipoPessoa === "PF" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTipoPessoa("PF")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Pessoa Física
                  </Button>
                  <Button
                    type="button"
                    variant={tipoPessoa === "PJ" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTipoPessoa("PJ")}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Pessoa Jurídica
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dados Básicos */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Básicos</CardTitle>
                <CardDescription>
                  Informações principais do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {tipoPessoa === "PF" ? "Nome Completo" : "Razão Social"} *
                    </label>
                    <Input
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      placeholder={
                        tipoPessoa === "PF" ? "Nome completo" : "Razão social"
                      }
                      required
                    />
                  </div>
                  {tipoPessoa === "PJ" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome Fantasia</label>
                      <Input
                        value={formData.nomeFantasia}
                        onChange={(e) =>
                          setFormData({ ...formData, nomeFantasia: e.target.value })
                        }
                        placeholder="Nome fantasia"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {tipoPessoa === "PF" ? "CPF" : "CNPJ"} *
                    </label>
                    <Input
                      value={formData.documento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          documento:
                            tipoPessoa === "PF"
                              ? formatCPF(e.target.value)
                              : formatCNPJ(e.target.value),
                        })
                      }
                      placeholder={
                        tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone: formatPhone(e.target.value),
                        })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Celular</label>
                    <Input
                      value={formData.celular}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          celular: formatPhone(e.target.value),
                        })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                  Endereço de cobrança do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CEP</label>
                    <Input
                      value={formData.cep}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cep: formatCEP(e.target.value),
                        })
                      }
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-medium">Logradouro</label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) =>
                        setFormData({ ...formData, endereco: e.target.value })
                      }
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número</label>
                    <Input
                      value={formData.numero}
                      onChange={(e) =>
                        setFormData({ ...formData, numero: e.target.value })
                      }
                      placeholder="000"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complemento</label>
                    <Input
                      value={formData.complemento}
                      onChange={(e) =>
                        setFormData({ ...formData, complemento: e.target.value })
                      }
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bairro</label>
                    <Input
                      value={formData.bairro}
                      onChange={(e) =>
                        setFormData({ ...formData, bairro: e.target.value })
                      }
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cidade</label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) =>
                        setFormData({ ...formData, cidade: e.target.value })
                      }
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UF</label>
                    <Input
                      value={formData.uf}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          uf: e.target.value.toUpperCase().slice(0, 2),
                        })
                      }
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações internas sobre o cliente..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {tipoPessoa === "PF" ? (
                      <>
                        <User className="mr-1 h-3 w-3" />
                        Pessoa Física
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-1 h-3 w-3" />
                        Pessoa Jurídica
                      </>
                    )}
                  </Badge>
                </div>

                {formData.nome && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{formData.nome}</p>
                  </div>
                )}

                {formData.documento && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {tipoPessoa === "PF" ? "CPF" : "CNPJ"}
                    </p>
                    <p className="font-medium">{formData.documento}</p>
                  </div>
                )}

                {formData.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Cliente
                  </>
                )}
              </Button>
              <Link href="/dashboard/clientes">
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

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios"

// ============================================================================
// CONFIGURAÇÃO DO CLIENTE API
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

// Criar instância do axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token
apiClient.interceptors.request.use(
  (config) => {
    // Buscar token do localStorage
    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("redobrai-auth")
      if (authData) {
        const { state } = JSON.parse(authData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para tratar erros
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado - redirecionar para login
      if (typeof window !== "undefined") {
        localStorage.removeItem("redobrai-auth")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// FUNÇÕES DE API - BOLETOS
// ============================================================================

export interface CreateBoletoRequest {
  cliente: string
  clienteDoc: string
  valor: number
  dataVencimento: string
  tipo?: "NORMAL" | "HIBRIDO"
  descricao?: string
}

export interface BoletoResponse {
  id: string
  nossoNumero: string
  cliente: string
  clienteDoc: string
  valor: number
  dataVencimento: string
  status: string
  tipo: string
  linhaDigitavel?: string
  qrCode?: string
}

export const boletosApi = {
  // Listar boletos
  list: async (params?: {
    status?: string
    cliente?: string
    page?: number
    limit?: number
  }) => {
    const response = await apiClient.get<{
      data: BoletoResponse[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>("/boletos", { params })
    return response.data
  },

  // Buscar boleto por ID
  get: async (id: string) => {
    const response = await apiClient.get<{ data: BoletoResponse }>(`/boletos/${id}`)
    return response.data.data
  },

  // Criar boleto
  create: async (data: CreateBoletoRequest) => {
    const response = await apiClient.post<{
      message: string
      data: BoletoResponse
    }>("/boletos", data)
    return response.data
  },

  // Baixar boleto
  baixar: async (id: string) => {
    const response = await apiClient.patch(`/boletos/${id}`, { action: "baixar" })
    return response.data
  },

  // Cancelar boleto
  cancelar: async (id: string) => {
    const response = await apiClient.delete(`/boletos/${id}`)
    return response.data
  },

  // Alterar vencimento
  alterarVencimento: async (id: string, novaData: string) => {
    const response = await apiClient.patch(`/boletos/${id}`, {
      action: "alterar-vencimento",
      dataVencimento: novaData,
    })
    return response.data
  },
}

// ============================================================================
// FUNÇÕES DE API - CLIENTES
// ============================================================================

export interface CreateClienteRequest {
  nome: string
  email: string
  telefone?: string
  documento: string
  tipo: "PF" | "PJ"
  endereco?: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
    cep: string
  }
}

export interface ClienteResponse {
  id: string
  nome: string
  email: string
  telefone: string
  documento: string
  tipo: "PF" | "PJ"
  status: string
  createdAt: string
}

export const clientesApi = {
  // Listar clientes
  list: async (params?: {
    status?: string
    tipo?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    const response = await apiClient.get<{
      data: ClienteResponse[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>("/clientes", { params })
    return response.data
  },

  // Buscar cliente por ID
  get: async (id: string) => {
    const response = await apiClient.get<{ data: ClienteResponse }>(`/clientes/${id}`)
    return response.data.data
  },

  // Criar cliente
  create: async (data: CreateClienteRequest) => {
    const response = await apiClient.post<{
      message: string
      data: ClienteResponse
    }>("/clientes", data)
    return response.data
  },

  // Atualizar cliente
  update: async (id: string, data: Partial<CreateClienteRequest>) => {
    const response = await apiClient.patch<{
      message: string
      data: ClienteResponse
    }>(`/clientes/${id}`, data)
    return response.data
  },

  // Excluir cliente
  delete: async (id: string) => {
    const response = await apiClient.delete(`/clientes/${id}`)
    return response.data
  },
}

// ============================================================================
// FUNÇÕES DE API - SICREDI
// ============================================================================

export interface CreateSicrediBoletoRequest {
  tipoCobranca: "NORMAL" | "HIBRIDO"
  pagador: {
    tipoPessoa: "PESSOA_FISICA" | "PESSOA_JURIDICA"
    documento: string
    nome: string
    endereco?: string
    cidade?: string
    uf?: string
    cep?: string
    email?: string
  }
  especieDocumento: string
  seuNumero: string
  dataVencimento: string
  valor: number
  juros?: number
  multa?: number
}

export const sicrediApi = {
  // Criar boleto via Sicredi
  criarBoleto: async (data: CreateSicrediBoletoRequest) => {
    const response = await apiClient.post("/sicredi/boletos", data)
    return response.data
  },

  // Consultar boleto via Sicredi
  consultarBoleto: async (nossoNumero: string) => {
    const response = await apiClient.get("/sicredi/boletos", {
      params: { nossoNumero },
    })
    return response.data
  },

  // Sincronizar boletos
  sincronizar: async () => {
    const response = await apiClient.post("/sicredi/sincronizar")
    return response.data
  },
}

// ============================================================================
// FUNÇÕES DE API - DASHBOARD
// ============================================================================

export const dashboardApi = {
  // Obter estatísticas
  getStats: async () => {
    const response = await apiClient.get("/dashboard/stats")
    return response.data
  },

  // Obter receita mensal
  getRevenue: async (periodo?: { inicio: string; fim: string }) => {
    const response = await apiClient.get("/dashboard/revenue", { params: periodo })
    return response.data
  },

  // Obter transações recentes
  getRecentTransactions: async (limit?: number) => {
    const response = await apiClient.get("/dashboard/transactions", {
      params: { limit: limit || 5 },
    })
    return response.data
  },
}

export default apiClient

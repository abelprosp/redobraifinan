import { create } from "zustand"
import { persist } from "zustand/middleware"

// ============================================================================
// TIPOS
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user" | "viewer"
  avatar?: string
  company?: {
    id: string
    name: string
    document: string
  }
}

export interface Notification {
  id: string
  type: "success" | "warning" | "error" | "info"
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface AppSettings {
  sidebarCollapsed: boolean
  theme: "light" | "dark" | "system"
  language: "pt-BR" | "en-US"
  currency: "BRL" | "USD"
}

// ============================================================================
// AUTH STORE
// ============================================================================

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          // Simular login
          await new Promise((r) => setTimeout(r, 1000))
          
          const user: User = {
            id: "1",
            name: "João Silva",
            email,
            role: "admin",
            company: {
              id: "1",
              name: "Empresa Teste LTDA",
              document: "12.345.678/0001-99",
            },
          }
          
          set({
            user,
            token: "mock-token-" + Date.now(),
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: "redobrai-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ============================================================================
// NOTIFICATIONS STORE
// ============================================================================

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  
  // Actions
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    }
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      if (notification && !notification.read) {
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.unreadCount - 1,
        }
      }
      return state
    })
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read
          ? state.unreadCount - 1
          : state.unreadCount,
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))

// ============================================================================
// SETTINGS STORE
// ============================================================================

interface SettingsState {
  settings: AppSettings
  
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void
  toggleSidebar: () => void
  setTheme: (theme: AppSettings["theme"]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        sidebarCollapsed: false,
        theme: "system",
        language: "pt-BR",
        currency: "BRL",
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      toggleSidebar: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            sidebarCollapsed: !state.settings.sidebarCollapsed,
          },
        }))
      },

      setTheme: (theme) => {
        set((state) => ({
          settings: { ...state.settings, theme },
        }))
      },
    }),
    {
      name: "redobrai-settings",
    }
  )
)

// ============================================================================
// BOLETOS STORE
// ============================================================================

export interface Boleto {
  id: string
  nossoNumero: string
  cliente: string
  clienteDoc: string
  valor: number
  dataVencimento: string
  status: "pendente" | "pago" | "vencido" | "cancelado"
  tipo: "NORMAL" | "HIBRIDO"
  linhaDigitavel?: string
  qrCode?: string
}

interface BoletosState {
  boletos: Boleto[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setBoletos: (boletos: Boleto[]) => void
  addBoleto: (boleto: Boleto) => void
  updateBoleto: (id: string, data: Partial<Boleto>) => void
  removeBoleto: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useBoletosStore = create<BoletosState>((set) => ({
  boletos: [],
  isLoading: false,
  error: null,

  setBoletos: (boletos) => set({ boletos }),
  
  addBoleto: (boleto) => {
    set((state) => ({
      boletos: [boleto, ...state.boletos],
    }))
  },

  updateBoleto: (id, data) => {
    set((state) => ({
      boletos: state.boletos.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    }))
  },

  removeBoleto: (id) => {
    set((state) => ({
      boletos: state.boletos.filter((b) => b.id !== id),
    }))
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

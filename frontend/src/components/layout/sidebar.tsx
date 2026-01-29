"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Wallet,
  ArrowLeftRight,
  Receipt,
  FileText,
  RefreshCw,
  CreditCard,
  QrCode,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Link as LinkIcon,
  Upload,
} from "lucide-react"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const menuItems = [
  {
    title: "PRINCIPAL",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Visão Geral",
        href: "/dashboard/visao-geral",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      {
        title: "Clientes",
        href: "/dashboard/clientes",
        icon: Users,
      },
      {
        title: "Contas",
        href: "/dashboard/contas",
        icon: Wallet,
      },
      {
        title: "Transações",
        href: "/dashboard/transacoes",
        icon: ArrowLeftRight,
      },
      {
        title: "Importação",
        href: "/dashboard/importar",
        icon: Upload,
      },
    ],
  },
  {
    title: "COBRANÇAS",
    items: [
      {
        title: "Boletos",
        href: "/dashboard/boletos",
        icon: Receipt,
      },
      {
        title: "Notas Fiscais",
        href: "/dashboard/notas-fiscais",
        icon: FileText,
      },
      {
        title: "Faturas",
        href: "/dashboard/faturas",
        icon: Receipt,
      },
      {
        title: "Recorrentes",
        href: "/dashboard/recorrentes",
        icon: RefreshCw,
      },
    ],
  },
  {
    title: "PAGAMENTOS",
    items: [
      {
        title: "Cartões",
        href: "/dashboard/cartoes",
        icon: CreditCard,
      },
      {
        title: "PIX",
        href: "/dashboard/pix",
        icon: QrCode,
      },
    ],
  },
  {
    title: "CONFIGURAÇÕES",
    items: [
      {
        title: "Integrações",
        href: "/dashboard/integracoes",
        icon: LinkIcon,
      },
      {
        title: "Empresa",
        href: "/dashboard/empresa",
        icon: Building2,
      },
      {
        title: "Impostos",
        href: "/dashboard/configuracoes/impostos",
        icon: Receipt,
      },
      {
        title: "Configurações",
        href: "/dashboard/configuracoes",
        icon: Settings,
      },
    ],
  },
]

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              RF
            </div>
            <span className="font-semibold text-lg">Redobrai</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              RF
            </div>
          </Link>
        )}
      </div>

      {/* Menu */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-2">
          {menuItems.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground tracking-wider">
                  {section.title}
                </h4>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3",
                          isCollapsed && "justify-center px-2",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        <Link href="/dashboard/ajuda">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3",
              isCollapsed && "justify-center px-2"
            )}
          >
            <HelpCircle className="h-4 w-4" />
            {!isCollapsed && <span>Central de Ajuda</span>}
          </Button>
        </Link>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="w-full mt-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}

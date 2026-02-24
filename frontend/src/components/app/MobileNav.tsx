import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, ArrowLeftRight, Coins, MoreHorizontal,
  Landmark, Wallet, Percent, FileText, Settings, LogOut, Moon, Sun, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const mainItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cartera', icon: Briefcase, label: 'Cartera' },
  { to: '/operaciones', icon: ArrowLeftRight, label: 'Operaciones' },
  { to: '/dividendos', icon: Coins, label: 'Dividendos' },
]

const moreItems = [
  { to: '/activos', icon: Landmark, label: 'Activos' },
  { to: '/cuentas', icon: Wallet, label: 'Cuentas' },
  { to: '/intereses', icon: Percent, label: 'Intereses' },
  { to: '/fiscal', icon: FileText, label: 'Fiscal' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark'),
  )
  const toggle = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }
  return { isDark, toggle }
}

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { isDark, toggle } = useDarkMode()
  const logout = useAuthStore((s) => s.logout)

  const closeMore = () => setMoreOpen(false)

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMore}
        />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed left-0 right-0 z-50 md:hidden rounded-t-2xl border-t shadow-xl transition-transform duration-200 ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ bottom: '4rem', background: 'hsl(var(--background))' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Más</span>
          <button onClick={closeMore} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-2">
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMore}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2 space-y-1">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
          >
            {isDark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            onClick={() => { logout(); closeMore() }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-muted"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="flex items-center justify-around">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
              moreOpen ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            Más
          </button>
        </div>
      </div>
    </>
  )
}

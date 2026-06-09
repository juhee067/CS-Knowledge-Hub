import { NavLink, Outlet } from 'react-router-dom'
import { BookText, LogOut, Search, Upload, Inbox, Zap, Layers, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/ask',      label: 'Ask Hub', icon: Sparkles },
  { to: '/search',   label: '검색',    icon: Search },
  { to: '/faqs',     label: 'FAQ',      icon: BookText },
  { to: '/inbox',    label: '수집현황', icon: Inbox },
  { to: '/assetize', label: '자산화큐', icon: Layers },
  { to: '/quick',    label: '빠른입력', icon: Zap },
  { to: '/import',   label: '이관',     icon: Upload },
  { to: '/settings', label: '설정',     icon: Settings },
]

export function Layout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold">CS Knowledge Hub</span>
            <nav className="flex gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-accent',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {profile?.name}
            </span>
            {role && (
              <Badge variant="secondary" className="uppercase">
                {role}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} title="로그아웃">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

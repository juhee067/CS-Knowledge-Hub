import { NavLink, Outlet } from 'react-router-dom'
import { BookText, Building2, LogOut, Search, Upload, Inbox, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClient } from '@/contexts/ClientContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/search',  label: '검색',      icon: Search },
  { to: '/faqs',    label: 'FAQ',        icon: BookText },
  { to: '/clients', label: '클라이언트', icon: Building2 },
  { to: '/inbox',   label: '수집현황',   icon: Inbox },
  { to: '/quick',   label: '빠른입력',   icon: Zap },
  { to: '/import',  label: '이관',       icon: Upload },
]

export function Layout() {
  const { profile, role, signOut } = useAuth()
  const { clients, selected, setSelected } = useClient()

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
            {clients.length > 0 && (
              <Select
                className="h-8 w-40 text-sm"
                value={selected?.id ?? ''}
                onChange={(e) => {
                  const c = clients.find((c) => c.id === e.target.value) ?? null
                  setSelected(c)
                }}
                title="답변 작성 클라이언트 선택"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
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

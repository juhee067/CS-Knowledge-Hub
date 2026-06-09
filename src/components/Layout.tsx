import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Inbox, Flame, Zap, Sparkles, Search, BookText,
  Upload, Settings, LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// CS 워크플로우 중심으로 그룹화한 네비게이션
const navGroups: {
  title: string
  items: { to: string; label: string; icon: typeof Inbox }[]
}[] = [
  {
    title: '문의 대응',
    items: [
      { to: '/home',     label: '홈',        icon: LayoutDashboard },
      { to: '/inbox',    label: '문의함',     icon: Inbox },
      { to: '/assetize', label: '자산화 큐',  icon: Flame },
      { to: '/quick',    label: '빠른 입력',  icon: Zap },
    ],
  },
  {
    title: '지식',
    items: [
      { to: '/ask',    label: 'Ask the Hub', icon: Sparkles },
      { to: '/search', label: '통합 검색',    icon: Search },
      { to: '/faqs',   label: 'FAQ',          icon: BookText },
    ],
  },
  {
    title: '관리',
    items: [
      { to: '/import',   label: '이관', icon: Upload },
      { to: '/settings', label: '설정', icon: Settings },
    ],
  },
]

export function Layout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="flex min-h-screen">
      {/* ── 좌측 사이드바 ─────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold">CS Knowledge Hub</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* 하단 사용자 영역 */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.name}</p>
              {role && (
                <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase">
                  {role}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="로그아웃" className="shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── 본문 ─────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

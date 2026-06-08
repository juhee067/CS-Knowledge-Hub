import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listClients } from '@/api/clients'
import type { Client } from '@/types'

interface ClientState {
  clients: Client[]
  selected: Client | null
  setSelected: (c: Client | null) => void
}

const ClientContext = createContext<ClientState | undefined>(undefined)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)

  useEffect(() => {
    listClients()
      .then((list) => {
        setClients(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => {/* 미연결 환경에서는 무시 */})
  }, [])

  const value = useMemo<ClientState>(
    () => ({ clients, selected, setSelected }),
    [clients, selected],
  )

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within ClientProvider')
  return ctx
}

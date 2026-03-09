import { Store } from '@tanstack/react-store'

interface AdminState {
    isSidebarOpen: boolean
    user: { name: string; role: string } | null
}

export const adminStore = new Store<AdminState>({
    isSidebarOpen: true,
    user: { name: 'Admin User', role: 'Superadmin' },
})

export const adminActions = {
    toggleSidebar: () => {
        adminStore.setState((state) => ({ ...state, isSidebarOpen: !state.isSidebarOpen }))
    },
    setUser: (user: AdminState['user']) => {
        adminStore.setState((state) => ({ ...state, user }))
    },
}

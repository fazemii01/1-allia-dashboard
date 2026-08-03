import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { useAuthStore } from '@/stores/auth-store'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { auth } = useAuthStore()
  const rawRole = auth.user?.role
  const userRole = Array.isArray(rawRole) ? rawRole[0] : (rawRole || 'user')
  const isAdmin = userRole === 'admin'
  const isStaff = userRole === 'staff'

  // Dynamically filter navGroups to hide admin-only pages
  const filteredNavGroups = sidebarData.navGroups.map((group) => {
    return {
      ...group,
      items: group.items.filter((item) => {
        if ((item.url === '/permissions' || item.url === '/users') && !isAdmin) {
          return false
        }
        return true
      }),
    }
  })

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: auth.user?.name || sidebarData.user.name,
            email: auth.user?.email || sidebarData.user.email,
            avatar: auth.user?.photo_url || '',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

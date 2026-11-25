import { BarChart3, Home, Sparkles, Trophy, User } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/tricks', label: 'Tricks', icon: Sparkles },
  { to: '/records', label: 'Records', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
]

/** Layout for the tab screens: content + persistent bottom navigation (side nav from md). */
export function TabLayout() {
  return (
    <>
      <div className="md:pl-56">
        <Outlet />
      </div>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/90 pb-safe backdrop-blur md:inset-y-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:pb-0 md:pt-6"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 md:max-w-none md:grid-cols-1 md:gap-1 md:px-3">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'} // Tricks stays active on its category/trick pages
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm ${
                    isActive ? 'text-accent-fg md:bg-surface' : 'text-muted hover:text-fg'
                  }`
                }
              >
                <Icon size={22} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

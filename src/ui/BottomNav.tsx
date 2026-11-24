import { BarChart3, Home, Trophy, User } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/records', label: 'Records', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
]

/** Layout for the four tab screens: content + persistent bottom navigation. */
export function TabLayout() {
  return (
    <>
      <Outlet />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/90 pb-safe backdrop-blur"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-accent-fg' : 'text-muted hover:text-fg'
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

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Screen wrapper: subtle enter transition. Mobile column, full width up to ~1440px from md.
 * `withNav` leaves room for the tab bar; `narrow` keeps reading/form screens at a comfortable width.
 */
export function Page({ children, withNav = false, narrow = false }: { children: ReactNode; withNav?: boolean; narrow?: boolean }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`mx-auto w-full max-w-md px-4 pt-safe md:px-8 ${narrow ? 'md:max-w-3xl' : 'md:max-w-[90rem]'} ${withNav ? 'pb-28 md:pb-10' : 'pb-8'}`}
    >
      {children}
    </motion.main>
  )
}

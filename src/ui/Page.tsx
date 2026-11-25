import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Screen wrapper: subtle enter transition + mobile column. `withNav` leaves room for the tab bar. */
export function Page({ children, withNav = false }: { children: ReactNode; withNav?: boolean }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`mx-auto w-full max-w-md px-4 pt-safe md:max-w-3xl md:px-8 lg:max-w-5xl ${withNav ? 'pb-28 md:pb-8' : 'pb-8'}`}
    >
      {children}
    </motion.main>
  )
}

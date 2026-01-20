"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { Sun, Moon } from "@phosphor-icons/react"

export function SkyToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <motion.div
          initial={false}
          animate={{
            y: isDark ? 30 : 0,
            opacity: isDark ? 0 : 1,
            rotate: isDark ? 90 : 0
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun weight="fill" className="w-5 h-5 text-amber-500" />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            y: isDark ? 0 : -30,
            opacity: isDark ? 1 : 0,
            rotate: isDark ? 0 : -90
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon weight="fill" className="w-5 h-5 text-indigo-400" />
        </motion.div>
      </div>
    </button>
  )
}

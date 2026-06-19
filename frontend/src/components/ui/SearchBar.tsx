import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function SearchBar({ className, ...props }: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center w-full max-w-md', className)}>
      <Search className="w-4 h-4 absolute left-3.5 text-text-muted" />
      <input
        type="text"
        className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 focus:border-white/20 focus:bg-white/[0.06] rounded-full pl-10 pr-12 py-2 text-xs text-white placeholder:text-text-muted outline-none transition-all duration-300"
        {...props}
      />
      <kbd className="absolute right-3.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-white/5 border border-white/5 text-text-muted pointer-events-none">
        ⌘K
      </kbd>
    </div>
  )
}

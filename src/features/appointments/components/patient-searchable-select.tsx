import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ChevronsUpDown, Check, X, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PatientOption {
  id: string | number
  nama_lengkap: string
  no_telepon?: string
  jenis_terapi?: string
}

interface SearchablePatientSelectProps {
  patients: PatientOption[]
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchablePatientSelect({
  patients,
  value,
  onChange,
  placeholder = '-- Pilih Pasien Terdaftar --',
  disabled = false,
  className,
}: SearchablePatientSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPatient = useMemo(() => {
    if (!value) return null
    return patients.find((p) => String(p.id) === String(value)) || null
  }, [patients, value])

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients
    const q = searchQuery.toLowerCase().trim()
    return patients.filter((p) => {
      const matchName = p.nama_lengkap?.toLowerCase().includes(q)
      const matchPhone = p.no_telepon?.toLowerCase().includes(q)
      const matchTerapi = p.jenis_terapi?.toLowerCase().includes(q)
      return matchName || matchPhone || matchTerapi
    })
  }, [patients, searchQuery])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground flex items-center justify-between text-left transition-colors focus:outline-none focus:border-primary',
          isOpen && 'border-primary ring-1 ring-primary/20',
          !selectedPatient && 'text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          {selectedPatient ? (
            <span className="truncate text-foreground font-bold flex items-center gap-1.5">
              <span>{selectedPatient.nama_lengkap}</span>
              {selectedPatient.no_telepon && (
                <span className="text-muted-foreground font-normal text-[11px]">
                  ({selectedPatient.no_telepon})
                </span>
              )}
              {selectedPatient.jenis_terapi && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium">
                  {selectedPatient.jenis_terapi}
                </span>
              )}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedPatient && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Hapus pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pasien, no telp, jenis terapi..."
                className="w-full bg-background border border-input rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/20">
            {filteredPatients.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Tidak ditemukan pasien dengan kata kunci &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = String(p.id) === String(value)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(String(p.id))
                      setIsOpen(false)
                      setSearchQuery('')
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs',
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold'
                        : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold truncate">{p.nama_lengkap}</span>
                        {p.jenis_terapi && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-medium">
                            {p.jenis_terapi}
                          </span>
                        )}
                      </div>
                      {p.no_telepon && (
                        <span className="text-[11px] text-muted-foreground">
                          {p.no_telepon}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground flex justify-between items-center">
            <span>
              {filteredPatients.length} dari {patients.length} pasien
            </span>
            <span>ESC untuk menutup</span>
          </div>
        </div>
      )}
    </div>
  )
}

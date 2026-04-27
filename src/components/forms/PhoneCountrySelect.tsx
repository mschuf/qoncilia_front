import { useEffect, useMemo, useRef, useState } from "react"
import { FiCheck, FiChevronDown, FiSearch, FiX } from "react-icons/fi"
import { getCountries, getCountryCallingCode, type Country } from "react-phone-number-input"

interface CountryOption {
  value: Country
  label: string
  callingCode: string
  searchText: string
}

interface PhoneCountrySelectProps {
  value?: Country
  onChange: (value?: Country) => void
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  allowClear?: boolean
}

const countryNameResolvers =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? [
        new Intl.DisplayNames(["es"], { type: "region" }),
        new Intl.DisplayNames(["en"], { type: "region" })
      ]
    : []

function getFlagEmoji(country: Country) {
  return [...country.toUpperCase()]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("")
}

function resolveCountryLabel(country: Country) {
  for (const resolver of countryNameResolvers) {
    const label = resolver.of(country)
    if (label) {
      return label
    }
  }

  return country
}

function normalizeSearchValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

const countryOptions: CountryOption[] = getCountries()
  .map((country) => {
    const label = resolveCountryLabel(country)
    const callingCode = `+${getCountryCallingCode(country)}`

    return {
      value: country,
      label,
      callingCode,
      searchText: normalizeSearchValue(`${label} ${country} ${callingCode}`)
    }
  })
  .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))

export default function PhoneCountrySelect({
  value,
  onChange,
  ariaLabel = "Pais",
  placeholder = "Pais",
  disabled = false,
  readOnly = false,
  allowClear = true
}: PhoneCountrySelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const selectedCountry = useMemo(
    () => countryOptions.find((option) => option.value === value),
    [value]
  )

  const filteredCountries = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchValue)
    if (!normalizedSearch) {
      return countryOptions
    }

    return countryOptions.filter((option) => option.searchText.includes(normalizedSearch))
  }, [searchValue])

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("")
      return
    }

    searchInputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const selectDisabled = disabled || readOnly

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={selectDisabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!selectDisabled) {
            setIsOpen((prev) => !prev)
          }
        }}
        className="flex h-9 items-center gap-2 rounded-lg bg-slate-50 px-2 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-xl leading-none" title={selectedCountry?.label}>
          {selectedCountry ? getFlagEmoji(selectedCountry.value) : "🏳️"}
        </span>

        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[18rem] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false)
                }
              }}
              placeholder="Buscar pais o codigo"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            {searchValue ? (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("")
                  searchInputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label="Limpiar busqueda"
              >
                <FiX className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {allowClear && value ? (
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                setIsOpen(false)
              }}
              className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <span>Quitar seleccion</span>
              <FiX className="h-4 w-4" />
            </button>
          ) : null}

          <div className="mt-2 max-h-72 overflow-y-auto pr-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.value === value

                return (
                  <button
                    key={country.value}
                    type="button"
                    onClick={() => {
                      onChange(country.value)
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg leading-none">{getFlagEmoji(country.value)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {country.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {country.callingCode} | {country.value}
                      </span>
                    </span>
                    {isSelected ? <FiCheck className="h-4 w-4 text-slate-700" /> : null}
                  </button>
                )
              })
            ) : (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-slate-500">
                No encontramos paises para esa busqueda.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

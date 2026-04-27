import { useEffect, useState, type ComponentProps } from "react"
import PhoneInput from "react-phone-number-input/input"
import { parsePhoneNumber, type Country } from "react-phone-number-input"
import PhoneCountrySelect from "./PhoneCountrySelect"

type BasePhoneInputProps = ComponentProps<typeof PhoneInput>

interface InternationalPhoneFieldProps
  extends Omit<BasePhoneInputProps, "country" | "defaultCountry"> {
  country?: Country
  defaultCountry?: Country
  countrySelectAriaLabel?: string
  countryPlaceholder?: string
  requireCountrySelection?: boolean
  onCountryChange?: (value?: Country) => void
}

function resolveInitialCountry(
  value: BasePhoneInputProps["value"],
  country?: Country,
  defaultCountry?: Country
) {
  if (country) {
    return country
  }

  if (typeof value === "string" && value) {
    return parsePhoneNumber(value)?.country ?? defaultCountry
  }

  return defaultCountry
}

export default function InternationalPhoneField({
  country,
  defaultCountry,
  countrySelectAriaLabel = "Pais",
  countryPlaceholder = "Seleccionar pais",
  requireCountrySelection = false,
  onCountryChange,
  className,
  disabled = false,
  readOnly = false,
  value,
  onChange,
  international,
  withCountryCallingCode,
  placeholder,
  ...props
}: InternationalPhoneFieldProps) {
  const [internalCountry, setInternalCountry] = useState<Country | undefined>(() =>
    resolveInitialCountry(value, country, defaultCountry)
  )
  const [hasManualSelection, setHasManualSelection] = useState(Boolean(country))

  useEffect(() => {
    if (country !== undefined) {
      setInternalCountry(country)
      setHasManualSelection(true)
      return
    }

    if (hasManualSelection) {
      return
    }

    setInternalCountry(resolveInitialCountry(value, undefined, defaultCountry))
  }, [country, defaultCountry, hasManualSelection, value])

  const selectedCountry = country ?? internalCountry
  const inputDisabled = disabled || readOnly || (requireCountrySelection && !selectedCountry)

  return (
    <div 
      className={`group flex flex-row-reverse items-center justify-end gap-1 rounded-xl border border-slate-200 p-1 transition-all focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 ${
        disabled || readOnly ? "bg-slate-50 opacity-60" : "bg-white"
      }`}
    >
      <PhoneInput
        {...props}
        country={selectedCountry}
        international={selectedCountry ? (international ?? true) : undefined}
        withCountryCallingCode={selectedCountry ? (withCountryCallingCode ?? true) : undefined}
        disabled={inputDisabled}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        placeholder={
          selectedCountry
            ? placeholder
            : "Selecciona un país"
        }
        className={`min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 ${className ?? ""}`}
      />

      <div className="h-6 w-px bg-slate-100 group-focus-within:bg-slate-200" />

      <PhoneCountrySelect
        value={selectedCountry}
        onChange={(nextCountry) => {
          setHasManualSelection(true)

          if (country === undefined) {
            setInternalCountry(nextCountry)
          }

          if (selectedCountry !== nextCountry && value) {
            onChange(undefined)
          }

          onCountryChange?.(nextCountry)
        }}
        ariaLabel={countrySelectAriaLabel}
        placeholder={countryPlaceholder}
        disabled={disabled}
        readOnly={readOnly}
        allowClear={!requireCountrySelection}
      />
    </div>
  )
}

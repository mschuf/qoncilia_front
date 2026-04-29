import type { PublicCompany } from "./access-control"

export interface PublicBank {
  id: number
  companyId: number
  userId: number
  userLogin: string
  name: string
  alias: string | null
  description: string | null
  branch: string | null
  active: boolean
}

export interface PublicCompanyBankAccount {
  id: number
  companyId: number
  companyName: string
  bankId: number
  bankName: string
  bankAlias: string | null
  bankBranch: string | null
  name: string
  currency: string
  accountNumber: string
  bankErpId: string
  majorAccountNumber: string
  paymentAccountNumber: string | null
  active: boolean
}

export interface PublicCurrency {
  id: number
  code: string
  name: string
  symbol: string | null
  decimals: number
  active: boolean
}

export interface CompanyBankingReferenceResponse {
  companies: PublicCompany[]
  banks: PublicBank[]
  accounts: PublicCompanyBankAccount[]
  currencies: PublicCurrency[]
}

export interface BankFormState {
  userId: number | ""
  name: string
  alias: string
  description: string
  branch: string
  active: boolean
}

export interface CompanyBankAccountFormState {
  bankId: number | ""
  name: string
  currency: string
  accountNumber: string
  bankErpId: string
  majorAccountNumber: string
  paymentAccountNumber: string
  active: boolean
}

export interface DeleteBankingEntityResponse {
  id: number
  message: string
}

import type { PublicCompany } from "./access-control"

export interface PublicBank {
  id: number
  name: string
  branch: string | null
  active: boolean
}

export interface PublicCompanyBankAccount {
  id: number
  companyId: number
  companyName: string
  bankId: number
  bankName: string
  bankBranch: string | null
  name: string
  accountNumber: string
  bankErpId: string
  majorAccountNumber: string
  paymentAccountNumber: string | null
  active: boolean
}

export interface CompanyBankingReferenceResponse {
  companies: PublicCompany[]
  banks: PublicBank[]
  accounts: PublicCompanyBankAccount[]
}

export interface BankFormState {
  name: string
  branch: string
  active: boolean
}

export interface CompanyBankAccountFormState {
  bankId: number | ""
  name: string
  accountNumber: string
  bankErpId: string
  majorAccountNumber: string
  paymentAccountNumber: string
  active: boolean
}

// Browser-safe donation settings: currencies, suggested amounts and minimums.
// Minimums are set by the payment providers, not by us — every gift above them is welcome.

export type CurrencyInfo = { code: string; name: string; min: number; presets: number[]; decimals: number }

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'NGN', name: 'Nigerian Naira', min: 100, presets: [1000, 2000, 5000, 10000, 20000], decimals: 0 },
  { code: 'USD', name: 'US Dollar', min: 1, presets: [5, 10, 25, 50, 100], decimals: 2 },
  { code: 'GBP', name: 'British Pound', min: 1, presets: [5, 10, 25, 50, 100], decimals: 2 },
  { code: 'EUR', name: 'Euro', min: 1, presets: [5, 10, 25, 50, 100], decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', min: 1, presets: [5, 10, 25, 50, 100], decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', min: 5, presets: [20, 50, 100, 200, 500], decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', min: 50, presets: [200, 500, 1000, 2500, 5000], decimals: 0 },
  { code: 'ZAR', name: 'South African Rand', min: 10, presets: [50, 100, 200, 500, 1000], decimals: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', min: 1000, presets: [10000, 20000, 50000, 100000, 200000], decimals: 0 },
  { code: 'TZS', name: 'Tanzanian Shilling', min: 1000, presets: [5000, 10000, 20000, 50000, 100000], decimals: 0 },
  { code: 'RWF', name: 'Rwandan Franc', min: 500, presets: [2000, 5000, 10000, 20000, 50000], decimals: 0 },
  { code: 'XAF', name: 'Central African CFA', min: 500, presets: [2000, 5000, 10000, 20000, 50000], decimals: 0 },
  { code: 'XOF', name: 'West African CFA', min: 500, presets: [2000, 5000, 10000, 20000, 50000], decimals: 0 },
  { code: 'ZMW', name: 'Zambian Kwacha', min: 10, presets: [50, 100, 200, 500, 1000], decimals: 2 },
  { code: 'EGP', name: 'Egyptian Pound', min: 20, presets: [100, 200, 500, 1000, 2000], decimals: 2 },
]

export const currencyInfo = (code: string) => CURRENCIES.find((c) => c.code === code)

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: currencyInfo(currency)?.decimals ?? 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

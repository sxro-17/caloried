import { createContext, useContext } from 'react'

export type ImportOpenResult = { opened: boolean; reason?: 'not-ready' | 'no-eligible-data' }
export type ImportContextValue = { importing: boolean; openImport: () => ImportOpenResult }
export const ImportContext = createContext<ImportContextValue>({ importing: false, openImport: () => ({ opened: false, reason: 'not-ready' }) })

export function useGuestDataImport() { return useContext(ImportContext) }

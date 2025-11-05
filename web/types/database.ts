export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      setters_users: {
        Row: {
          id: number
          created_at: string
          telegram_id: number | null
          name: string | null
          isActive: boolean | null
          telegram_name: string | null
          full_access: boolean | null
        }
        Insert: {
          id?: never // This should be auto-generated
          created_at?: string
          telegram_id?: number | null
          name?: string | null
          isActive?: boolean | null
          telegram_name?: string | null
          full_access?: boolean | null
        }
        Update: {
          id?: never
          created_at?: string
          telegram_id?: number | null
          name?: string | null
          isActive?: boolean | null
          telegram_name?: string | null
          full_access?: boolean | null
        }
      }
    }
  }
}
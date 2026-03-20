import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Profile = {
  id: string
  phone_hash: string
  display_name: string
  bio?: string
  user_type: 'listener' | 'host' | 'verified'
  created_at: string
}

export type Room = {
  id: string
  host_id: string
  title: string
  description?: string
  category: 'agriculture' | 'health' | 'education' | 'news' | 'entertainment' | 'general'
  language: 'english' | 'shona' | 'ndebele'
  scheduled_at: string
  duration_minutes: number
  capacity: number
  is_ticketed: boolean
  ticket_price: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  participant_count: number
  created_at: string
}

export type Message = {
  id: string
  room_id: string
  user_id: string
  message: string
  created_at: string
}

export type Wallet = {
  id: string
  user_id: string
  balance: number
  currency: string
  updated_at: string
}

export type Transaction = {
  id: string
  from_user_id: string
  to_user_id: string
  room_id: string
  amount: number
  transaction_type: string
  status: string
  reference: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile }
      rooms: { Row: Room }
      messages: { Row: Message }
      wallets: { Row: Wallet }
      transactions: { Row: Transaction }
    }
  }
}
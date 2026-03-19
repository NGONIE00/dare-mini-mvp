import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { id: string; phone_hash: string; display_name: string; bio: string | null; user_type: 'listener' | 'host' | 'verified'; created_at: string } }
      rooms: { Row: { id: string; host_id: string; title: string; description: string; category: string; language: string; scheduled_at: string; duration_minutes: number; capacity: number; is_ticketed: boolean; ticket_price: number; status: string; participant_count: number; created_at: string } }
      messages: { Row: { id: string; room_id: string; user_id: string; message: string; created_at: string } }
      wallets: { Row: { id: string; user_id: string; balance: number; currency: string; updated_at: string } }
      transactions: { Row: { id: string; from_user_id: string; to_user_id: string; room_id: string; amount: number; transaction_type: string; status: string; reference: string; created_at: string } }
    }
  }
}
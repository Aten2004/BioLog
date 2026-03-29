import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// เช็กเบื้องต้นว่าลืมใส่ในไฟล์ .env.local หรือเปล่า
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ไม่พบ Environment Variables ใน .env.local")
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
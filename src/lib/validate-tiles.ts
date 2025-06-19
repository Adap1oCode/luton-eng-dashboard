import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })


// ✅ Supabase public credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase URL or Anon Key not set in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('▶️ Connecting to Supabase via supabase-js')

  const { count, error } = await supabase
    .from('requisitions')
    .select('*', { count: 'exact', head: true })
    .lt('due_date', new Date().toISOString())
    .not('status', 'ilike', '%complete%')
    .not('status', 'ilike', '%cancel%')

  if (error) {
    console.error('❌ Query failed:', error)
    process.exit(1)
  }

  console.log(`🔍 Late tile count from Supabase: ${count}`)

  const uiLateCount = 314 // ← replace with actual config value

  if (count !== uiLateCount) {
    console.error(`❌ Mismatch: Supabase count = ${count}, config/UI = ${uiLateCount}`)
    process.exit(1)
  } else {
    console.log(`✅ Config and Supabase match: ${count}`)
  }
}

run()

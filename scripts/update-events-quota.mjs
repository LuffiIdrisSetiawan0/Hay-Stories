import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value.trim()
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('Updating all events to shots_per_guest = 100...')
  const { data, error } = await supabase
    .from('events')
    .update({ shots_per_guest: 100 })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id, title, slug, shots_per_guest')

  if (error) {
    console.error('Error updating events:', error)
    process.exit(1)
  }

  console.log(`Successfully updated ${data.length} event(s):`)
  data.forEach((e) => console.log(` - [${e.title}] (${e.slug}): ${e.shots_per_guest} jepretan`))
}

run()

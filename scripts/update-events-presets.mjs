import { createClient } from '@supabase/supabase-js'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_ROLE_KEY) {
  // Read from .env.local
  const fs = await import('fs')
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  for (const line of envContent.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: events, error } = await supabase.from('events').select('id, title, preset')
  if (error) {
    console.error('Error fetching events:', error)
    process.exit(1)
  }

  console.log(`Found ${events.length} events:`)
  for (const event of events) {
    console.log(`- ${event.title} (${event.id}): preset = ${event.preset}`)
    // Preset generasi lama tetap bisa dibaca pada metadata foto, tetapi acara
    // baru hanya boleh memakai katalog aktif yang LUT dan lisensinya diaudit.
    const valid = [
      'natural-clean',
      'everyday-100',
      'golden-hour-400',
      'pastel-400',
      'neon-night-1600',
      'noir-400',
    ]
    if (!valid.includes(event.preset)) {
      const { error: updateErr } = await supabase
        .from('events')
        .update({ preset: 'natural-clean' })
        .eq('id', event.id)
      if (updateErr) {
        console.error(`  Failed to update event ${event.id}:`, updateErr)
      } else {
        console.log(`  Updated event ${event.id} to natural-clean!`)
      }
    }
  }
  process.exit(0)
}

main()

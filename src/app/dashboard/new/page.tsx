import type { Metadata } from 'next'
import Wizard from './Wizard'

export const metadata: Metadata = {
  title: 'Buat Album Baru — HAY Stories',
}

export default function NewEventPage() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Buat album baru
        </h1>
        <p
          style={{
            marginTop: '0.35rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9375rem',
          }}
        >
          Empat langkah, sekitar dua menit.
        </p>
      </header>

      <Wizard />
    </div>
  )
}

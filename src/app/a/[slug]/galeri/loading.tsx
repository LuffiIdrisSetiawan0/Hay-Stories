import styles from './Gallery.module.css'

export default function GalleryLoading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Memuat galeri foto">
      <header className={styles.bar}>
        <span className={styles.loadingCircle} aria-hidden="true" />
        <div className={styles.barTitle}>
          <span className={styles.loadingLine} aria-hidden="true" />
          <span className={styles.loadingText}>Memuat foto terbaru…</span>
        </div>
      </header>

      <div className={styles.gridWrap}>
        <div className={styles.loadingGrid} aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className={styles.loadingTile} />
          ))}
        </div>
      </div>
    </main>
  )
}

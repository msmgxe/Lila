import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <main
      style={{
        height: '100dvh',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: 'radial-gradient(70% 60% at 50% 0%, #191515, #0e0c0c 70%)',
      }}
    >
      <div>
        <p className="et" style={{ marginBottom: '1rem' }}>
          Error 404
        </p>
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 6vw, 3.4rem)',
            marginBottom: '1rem',
          }}
        >
          Esta página no está en el anaquel
        </h1>
        <p style={{ color: '#a49f99', maxWidth: '40ch', margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Puede que el volumen se haya reordenado, o que el poema todavía no esté publicado.
        </p>
        <Link
          href="/"
          className="cta"
          style={{ display: 'inline-block', width: 'auto', padding: '.72rem 1.6rem', textDecoration: 'none' }}
        >
          Volver al anaquel
        </Link>
      </div>
    </main>
  )
}

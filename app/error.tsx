'use client'

// Simple error page without context providers
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '1rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '3.75rem',
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: '1rem'
        }}>Error</h1>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem'
        }}>Something went wrong</h2>
        <p style={{
          color: '#6b7280',
          marginBottom: '2rem'
        }}>
          An unexpected error occurred. Please try again.
        </p>
        <button 
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            borderRadius: '0.375rem',
            color: 'white',
            backgroundColor: '#dc2626',
            cursor: 'pointer',
            marginRight: '0.5rem'
          }}
        >
          Try again
        </button>
        <a 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            fontSize: '1rem',
            fontWeight: '500',
            borderRadius: '0.375rem',
            color: '#374151',
            backgroundColor: 'white',
            textDecoration: 'none'
          }}
        >
          Go home
        </a>
      </div>
    </div>
  )
}

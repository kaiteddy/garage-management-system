// Ultra-simple 404 page to avoid any SSR issues
export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Page Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '1rem'
            }}>404</h1>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '1rem'
            }}>Page Not Found</h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '2rem'
            }}>
              The page you are looking for doesn't exist or has been moved.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: '#3b82f6',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

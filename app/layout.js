import './globals.css'

export const metadata = {
  title: 'MF Services Apps',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F8F9FA' }}>
        {children}
      </body>
    </html>
  )
}
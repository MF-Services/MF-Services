import './globals.css'
export const metadata = { title: 'MF Services Cable Plan Configurator', viewport: 'width=device-width, initial-scale=1' }
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{margin:0, padding:0, background:'#F8F9FA'}}>
        {children}
      </body>
    </html>
  )
}

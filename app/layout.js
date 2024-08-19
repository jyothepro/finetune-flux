import './globals.css'

export const metadata = {
  title: 'AI Image Generator',
  description: 'Generate custom images using AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
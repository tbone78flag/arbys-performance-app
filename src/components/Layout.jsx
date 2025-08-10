// Layout.jsx
export default function Layout({ children }) {
  return (
    <div className="min-h-dvh w-full bg-red-100">
      {/* Page container: center content and add safe mobile padding */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

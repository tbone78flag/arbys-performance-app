// components/Layout.jsx
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-red-100 flex flex-col items-center justify-center p-4">
      {children}
    </div>
  )
}

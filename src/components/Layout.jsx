
export default function Layout({ children }) {
  return (
    <div className="w-screen min-h-screen bg-red-100 border-4 flex flex-col items-center justify-start p-4">
      {children}
    </div>
  )
}


import { AppShell } from "@/components/app-shell"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#0a1628] relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <AppShell />
      </div>
    </main>
  )
}

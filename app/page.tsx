import { AuthGuard } from "@/components/auth-guard"
import { WalletDashboard } from "@/components/wallet-dashboard"

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-background">
        <WalletDashboard />
      </main>
    </AuthGuard>
  )
}

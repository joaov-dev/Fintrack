import { Link } from 'react-router-dom'
import { XCircle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutCanceledPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl mx-auto bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-slate-400" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-foreground">Checkout cancelado</h1>
          <p className="text-muted-foreground">
            Nenhuma cobrança foi realizada. Você pode tentar novamente quando quiser.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/upgrade">
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Voltar ao app
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

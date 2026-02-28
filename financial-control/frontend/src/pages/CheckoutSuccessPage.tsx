import { Link } from 'react-router-dom'
import { CheckCircle2, LayoutDashboard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'hsl(var(--primary) / 0.1)' }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: 'hsl(var(--primary))' }} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-foreground">Assinatura confirmada!</h1>
          <p className="text-muted-foreground">
            Seu plano foi ativado com sucesso. Aproveite todas as funcionalidades desbloqueadas.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Ir para o Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/billing">
              <Receipt className="w-4 h-4" />
              Ver assinatura
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Target, HeartPulse, CalendarClock, ArrowLeftRight,
  BarChart3, CheckCircle2, ChevronRight, Menu, X, Repeat2,
  Landmark, Shield, Zap, TrendingDown, FileBarChart, ArrowRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

// ─── Scroll animation hook ────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Como funciona', href: '#how-it-works' },
    { label: 'Por que DominaHub', href: '#why' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled && 'bg-background/90 backdrop-blur-lg border-b border-border shadow-sm',
      )}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-black text-lg tracking-tight text-foreground">DominaHub</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all dark:animate-glow-pulse"
          >
            Começar grátis
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg px-5 py-4 space-y-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border flex gap-2">
            <Link to="/login" className="flex-1 text-center px-3 py-2.5 text-sm border border-border rounded-lg text-foreground">
              Entrar
            </Link>
            <Link to="/login" className="flex-1 text-center px-3 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg font-semibold">
              Começar grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[460px] mx-auto select-none pointer-events-none">
      {/* Ambient glow */}
      <div className="absolute inset-8 bg-primary/15 blur-[80px] rounded-full" />

      {/* Main window */}
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-float">
        {/* Titlebar */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">DominaHub — Dashboard</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { label: 'Saldo', value: '+R$ 1.240', color: 'text-primary' },
            { label: 'Receitas', value: 'R$ 5.200', color: 'text-emerald-400' },
            { label: 'Despesas', value: 'R$ 3.960', color: 'text-rose-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-background px-2.5 py-2">
              <p className="text-[8px] text-muted-foreground mb-0.5">{label}</p>
              <p className={cn('text-[11px] font-bold', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="px-3 pb-2">
          <p className="text-[8px] text-muted-foreground mb-2">Evolução Mensal</p>
          <div className="flex items-end gap-1.5 h-14">
            {[[55, 48], [68, 55], [52, 60], [80, 65], [64, 72], [90, 58], [85, 55]].map(
              ([inc, exp], i) => (
                <div key={i} className="flex-1 flex flex-col gap-0.5 h-full items-center justify-end">
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${exp * 0.5}%`, background: 'hsl(var(--destructive) / 0.45)' }}
                  />
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${inc}%`, background: 'hsl(var(--primary) / 0.75)' }}
                  />
                </div>
              ),
            )}
          </div>
          <div className="flex justify-between mt-1">
            {['Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'].map((m) => (
              <span key={m} className="text-[7px] text-muted-foreground">{m}</span>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="px-3 pb-3 space-y-1">
          {[
            { e: '💼', name: 'Salário', tag: 'Renda', amount: '+R$ 5.200', color: 'text-primary' },
            { e: '🛒', name: 'Supermercado', tag: 'Alimentação', amount: '−R$ 312', color: 'text-rose-400' },
            { e: '💻', name: 'Freelance', tag: 'Renda Extra', amount: '+R$ 800', color: 'text-primary' },
          ].map(({ e, name, tag, amount, color }) => (
            <div key={name} className="flex items-center justify-between bg-background rounded-lg px-2.5 py-1.5">
              <span className="text-xs">{e}</span>
              <div className="flex-1 ml-2">
                <p className="text-[9px] font-medium text-foreground">{name}</p>
                <p className="text-[7px] text-muted-foreground">{tag}</p>
              </div>
              <span className={cn('text-[9px] font-bold', color)}>{amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating goal card */}
      <div className="absolute -right-5 bottom-24 rounded-xl border border-border bg-card shadow-xl px-3.5 py-3 min-w-[130px] animate-float-delayed">
        <p className="text-[8px] text-muted-foreground">Meta: Reserva</p>
        <p className="text-[11px] font-bold text-foreground mt-0.5">R$ 8.200 / R$ 15k</p>
        <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '55%', background: 'hsl(var(--primary))' }} />
        </div>
        <p className="text-[8px] font-medium mt-1" style={{ color: 'hsl(var(--primary))' }}>55% concluído</p>
      </div>

      {/* Floating health card */}
      <div className="absolute -left-5 top-24 rounded-xl border border-border bg-card shadow-xl px-3.5 py-3 animate-float-slow">
        <p className="text-[8px] text-muted-foreground">Saúde financeira</p>
        <p className="text-2xl font-black leading-none mt-0.5" style={{ color: 'hsl(var(--primary))' }}>82</p>
        <p className="text-[8px] font-medium mt-0.5 text-emerald-400">Muito boa</p>
      </div>
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 lg:min-h-screen lg:flex lg:items-center">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-25 dark:opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Ambient glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 pt-12 pb-16 lg:py-24 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: text */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
            100% gratuito · Sem cartão de crédito
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.05] tracking-tight">
              Controle total das suas{' '}
              <span style={{ color: 'hsl(var(--primary))' }}>finanças</span>,{' '}
              em um só lugar.
            </h1>
            <p className="text-lg text-muted-foreground mt-5 max-w-md leading-relaxed">
              Planeje, acompanhe e projete seu dinheiro com clareza e controle.
              Você manda no seu dinheiro — não o contrário.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-all dark:animate-glow-pulse"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              Começar agora
              <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border text-foreground font-medium text-base hover:bg-muted transition-all"
            >
              Ver como funciona
            </a>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            {['Sem cartão de crédito', 'Dados seguros', 'Configuração em 2 min'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Mobile-only mini stats preview */}
          <div className="lg:hidden grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Saldo do Mês</p>
              <p className="text-xl font-black mt-1" style={{ color: 'hsl(var(--primary))' }}>+R$ 1.240</p>
              <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">↑ 12% vs mês anterior</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Saúde Financeira</p>
              <p className="text-xl font-black mt-1" style={{ color: 'hsl(var(--primary))' }}>82 / 100</p>
              <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Excelente</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">Meta: Reserva</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '55%', background: 'hsl(var(--primary))' }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">55% concluído</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">Budget: Alimentação</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: '78%' }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">78% utilizado</p>
            </div>
          </div>
        </div>

        {/* Right: mockup (desktop only) */}
        <div className="hidden lg:block">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const { ref, inView } = useInView()

  const features = [
    { icon: ArrowLeftRight, title: 'Gestão de gastos', desc: 'Registre e categorize cada real que entra e sai. Filtros por período, conta e categoria.' },
    { icon: Landmark, title: 'Múltiplas contas', desc: 'Centralize corrente, poupança, cartão e investimentos em um único painel unificado.' },
    { icon: Target, title: 'Metas financeiras', desc: 'Defina objetivos, vincule a contas e acompanhe o progresso calculado automaticamente.' },
    { icon: HeartPulse, title: 'Saúde financeira', desc: 'Score inteligente baseado em poupança, endividamento, reserva e controle de budget.' },
    { icon: CalendarClock, title: 'Previsão do mês', desc: 'Projete o fechamento do mês com base em histórico, recorrências e despesas variáveis.' },
    { icon: BarChart3, title: 'Relatórios avançados', desc: 'Evolução mensal, top categorias de despesa e comparativos de período com gráficos visuais.' },
    { icon: Repeat2, title: 'Recorrências', desc: 'Cadastre uma vez e o sistema projeta receitas e despesas fixas nos meses seguintes.' },
    { icon: FileBarChart, title: 'Insights automáticos', desc: 'Alertas contextuais quando um orçamento estoura, uma meta atrasa ou um passivo vence.' },
    { icon: TrendingDown, title: 'Passivos e dívidas', desc: 'Controle empréstimos e financiamentos com juros, parcelas e datas de vencimento.' },
  ]

  return (
    <section id="features" className="py-24 bg-card/20">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className={cn('text-center mb-14 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
            Funcionalidades
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3">
            Tudo que você precisa para dominar suas finanças
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-lg">
            Do básico ao avançado — uma plataforma completa pensada para resultado real.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              style={{ transitionDelay: `${i * 60}ms` }}
              className={cn(
                'group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-500',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
              )}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:scale-110 transition-transform duration-200"
                style={{ background: 'hsl(var(--primary) / 0.12)' }}
              >
                <Icon className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <h3 className="font-bold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const { ref, inView } = useInView()

  const steps = [
    { n: '01', title: 'Crie sua conta', desc: 'Cadastro em menos de 2 minutos, sem cartão de crédito. Apenas nome, e-mail e senha.', icon: Shield },
    { n: '02', title: 'Cadastre seus dados', desc: 'Adicione contas bancárias, importe transações via CSV ou cadastre manualmente com categorias.', icon: Zap },
    { n: '03', title: 'Defina metas e orçamentos', desc: 'Configure limites mensais por categoria, crie metas financeiras e ative transações recorrentes.', icon: Target },
    { n: '04', title: 'Acompanhe sua evolução', desc: 'Monitore gráficos, seu score de saúde financeira, previsões de fechamento e insights automáticos.', icon: TrendingUp },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className={cn('text-center mb-14 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
            Como funciona
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3">
            Do zero ao controle em 4 passos
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map(({ n, title, desc, icon: Icon }, i) => (
            <div
              key={n}
              style={{ transitionDelay: `${i * 100}ms` }}
              className={cn(
                'relative transition-all duration-700',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
              )}
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] right-[-8px] h-px border-t border-dashed border-border" />
              )}

              <div className="flex flex-col gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border"
                    style={{ background: 'hsl(var(--primary) / 0.1)', borderColor: 'hsl(var(--primary) / 0.2)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                  </div>
                  <span className="text-3xl font-black" style={{ color: 'hsl(var(--primary) / 0.25)' }}>{n}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Product Preview ──────────────────────────────────────────────────────────
function ProductPreviewSection() {
  const { ref, inView } = useInView()
  const [tab, setTab] = useState(0)

  const screens = [
    {
      tab: 'Dashboard',
      title: 'Visão geral em um painel',
      desc: 'Resumo mensal completo: saldo, receitas, despesas, gráficos de evolução, patrimônio líquido, orçamentos e transações recentes.',
      mockup: (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-rose-500/60" />
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary) / 0.7)' }} />
            <span className="ml-2 text-[10px] text-muted-foreground">Dashboard — Fev 2026</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Saldo', v: '+R$ 1.240', c: 'primary' },
                { l: 'Receitas', v: 'R$ 5.200', c: 'emerald' },
                { l: 'Despesas', v: 'R$ 3.960', c: 'rose' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-background rounded-lg p-2.5">
                  <p className="text-[8px] text-muted-foreground">{l}</p>
                  <p className={cn(
                    'text-[11px] font-bold mt-0.5',
                    c === 'primary' ? 'text-primary' : c === 'emerald' ? 'text-emerald-400' : 'text-rose-400',
                  )}>{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-[8px] text-muted-foreground mb-2">Evolução Mensal</p>
              <div className="flex items-end gap-1 h-12">
                {[60, 45, 75, 55, 80, 65, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `hsl(var(--primary) / ${0.4 + i * 0.08})` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      tab: 'Previsão',
      title: 'Feche o mês no azul',
      desc: 'Projete receitas e despesas com base no histórico real. Veja um calendário financeiro com todos os eventos do mês: receitas, despesas e passivos.',
      mockup: (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-rose-500/60" />
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary) / 0.7)' }} />
            <span className="ml-2 text-[10px] text-muted-foreground">Previsão do Mês</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Saldo Esperado', v: '+R$ 950', c: 'text-primary' },
                { l: 'Receita Proj.', v: 'R$ 6.0k', c: 'text-emerald-400' },
                { l: 'Despesa Proj.', v: 'R$ 5.1k', c: 'text-rose-400' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-background rounded-lg p-2">
                  <p className="text-[7px] text-muted-foreground">{l}</p>
                  <p className={cn('text-[11px] font-bold mt-0.5', c)}>{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-[8px] text-muted-foreground mb-2">Calendário Financeiro — Fevereiro</p>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: 28 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-5 rounded-sm flex items-center justify-center text-[7px] font-medium',
                      i === 19 ? 'text-primary-foreground' : i < 19 ? 'text-muted-foreground/50' : 'text-muted-foreground',
                    )}
                    style={{
                      background: i === 19
                        ? 'hsl(var(--primary))'
                        : i < 19
                        ? 'hsl(var(--muted) / 0.5)'
                        : 'hsl(var(--muted) / 0.2)',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      tab: 'Saúde',
      title: 'Seu score financeiro',
      desc: 'Indicadores precisos como taxa de poupança, nível de endividamento, reserva de emergência e diversificação de renda — calculados automaticamente.',
      mockup: (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-rose-500/60" />
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary) / 0.7)' }} />
            <span className="ml-2 text-[10px] text-muted-foreground">Saúde Financeira</span>
          </div>
          <div className="p-5 flex flex-col items-center gap-4">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="30" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${82 * 1.885} 200`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center z-10">
                <p className="text-2xl font-black" style={{ color: 'hsl(var(--primary))' }}>82</p>
                <p className="text-[9px] text-muted-foreground">/ 100</p>
              </div>
            </div>
            <p className="text-sm font-bold text-foreground">Muito boa</p>
            <div className="w-full space-y-2">
              {[
                { label: 'Taxa de poupança', pct: 75 },
                { label: 'Controle de orçamento', pct: 88 },
                { label: 'Reserva de emergência', pct: 55 },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                    <span className="text-[9px] font-semibold" style={{ color: 'hsl(var(--primary))' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section className="py-24 bg-card/20 overflow-hidden">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className={cn('text-center mb-10 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
            Visual do produto
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3">Veja o DominaHub em ação</h2>
        </div>

        {/* Tab selector */}
        <div className="flex justify-center gap-2 mb-10">
          {screens.map(({ tab: t }, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === i
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
              style={tab === i ? { background: 'hsl(var(--primary))' } : {}}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={cn('grid lg:grid-cols-2 gap-12 items-center transition-all duration-700', inView ? 'opacity-100' : 'opacity-0')}>
          {/* Text */}
          <div className="space-y-5">
            <h3 className="text-2xl font-black text-foreground">{screens[tab].title}</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">{screens[tab].desc}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              Experimentar agora
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mockup */}
          <div className="relative">
            <div className="absolute inset-0 blur-3xl rounded-full scale-75 pointer-events-none" style={{ background: 'hsl(var(--primary) / 0.08)' }} />
            <div className="relative transition-all duration-300">{screens[tab].mockup}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Why Domina ───────────────────────────────────────────────────────────────
function WhySection() {
  const { ref, inView } = useInView()

  const reasons = [
    { icon: CalendarClock, title: 'Projeta, não só registra', desc: 'Preveja o fechamento do mês antes de ele chegar, com base em padrões reais e recorrências futuras.' },
    { icon: Target, title: 'Metas com progresso real', desc: 'Vinculadas a contas reais. O progresso é calculado a partir do saldo atual — sem preenchimento manual.' },
    { icon: HeartPulse, title: 'Score de saúde financeira', desc: 'Um número que resume poupança, dívidas, budget e reserva de emergência em um indicador claro.' },
    { icon: Shield, title: 'Seus dados, seu controle', desc: 'Exporte, limpe ou apague tudo quando quiser. Sem lock-in.' },
    { icon: FileBarChart, title: 'Relatórios que fazem sentido', desc: 'Trends, top categorias e comparativos entre meses sem precisar de planilhas ou ferramentas externas.' },
    { icon: Zap, title: 'Insights automáticos', desc: 'Alertas contextuais quando orçamento estoura, meta atrasa ou passivo vence. Sem você precisar checar.' },
  ]

  return (
    <section id="why" className="py-24 bg-background">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className={cn('text-center mb-14 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
            Por que DominaHub
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3">Diferente dos apps genéricos</h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-lg">
            Enquanto outros apps registram o passado, o DominaHub projeta o futuro.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reasons.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              style={{ transitionDelay: `${i * 70}ms` }}
              className={cn(
                'flex gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-500',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
              )}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'hsl(var(--primary) / 0.1)' }}
              >
                <Icon className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
function CTASection() {
  const { ref, inView } = useInView()

  return (
    <section className="py-28 bg-card/30 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-x-1/4 inset-y-0 blur-3xl rounded-full pointer-events-none"
        style={{ background: 'hsl(var(--primary) / 0.06)' }}
      />

      <div
        ref={ref}
        className={cn(
          'max-w-3xl mx-auto px-5 text-center space-y-8 transition-all duration-700',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold"
          style={{
            borderColor: 'hsl(var(--primary) / 0.3)',
            background: 'hsl(var(--primary) / 0.1)',
            color: 'hsl(var(--primary))',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Gratuito para sempre
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
          Assuma o controle das suas finanças{' '}
          <span style={{ color: 'hsl(var(--primary))' }}>hoje.</span>
        </h2>

        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Comece agora e tenha clareza total sobre o seu dinheiro em poucos minutos.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all dark:animate-glow-pulse"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          Criar conta gratuitamente
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-sm text-muted-foreground">Sem cartão de crédito · Configuração em 2 minutos</p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-black text-foreground">DominaHub</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Termos de uso</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <a href="#" className="hover:text-foreground transition-colors">Contato</a>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} DominaHub
        </p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ProductPreviewSection />
      <WhySection />
      <CTASection />
      <Footer />
    </div>
  )
}

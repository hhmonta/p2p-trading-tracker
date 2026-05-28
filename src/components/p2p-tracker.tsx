'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// Icons
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Plus,
  Menu,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Pencil,
  Trash2,
  CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react'

// Charts
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Types
type Section = 'dashboard' | 'trades' | 'bank'

interface Trade {
  id: string
  type: string
  asset: string
  amount: number
  price: number
  total: number
  currency: string
  platform: string
  counterparty: string | null
  notes: string | null
  date: string
  createdAt: string
  updatedAt: string
}

interface BankTransaction {
  id: string
  type: string
  amount: number
  currency: string
  concept: string | null
  reference: string | null
  bank: string | null
  date: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  totalCompras: number
  countCompras: number
  totalVentas: number
  countVentas: number
  netProfitLoss: number
  profitLossByAsset: { asset: string; compras: number; ventas: number; profitLoss: number }[]
  monthlyBreakdown: { month: string; compras: number; ventas: number; profitLoss: number }[]
  bankBalance: number
  totalEntradas: number
  totalSalidas: number
  recentTrades: Trade[]
  recentBankTransactions: BankTransaction[]
  assetDistribution: { asset: string; total: number }[]
}

// Helpers
function formatNumber(num: number): string {
  return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isValid(d)) return format(d, 'dd/MM/yyyy', { locale: es })
    return dateStr
  } catch {
    return dateStr
  }
}

function formatDateForInput(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isValid(d)) return format(d, 'yyyy-MM-dd')
    return dateStr
  } catch {
    return dateStr
  }
}

const CHART_COLORS = ['#16a34a', '#ea580c', '#0891b2', '#9333ea', '#e11d48', '#ca8a04']

// API hooks
function useStats() {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Error cargando estadísticas')
      return res.json()
    },
  })
}

function useTrades(filters?: { type?: string; asset?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.asset) params.set('asset', filters.asset)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)

  return useQuery<Trade[]>({
    queryKey: ['trades', filters],
    queryFn: async () => {
      const res = await fetch(`/api/trades?${params.toString()}`)
      if (!res.ok) throw new Error('Error cargando operaciones')
      return res.json()
    },
  })
}

function useBankTransactions(filters?: { type?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)

  return useQuery<BankTransaction[]>({
    queryKey: ['bank', filters],
    queryFn: async () => {
      const res = await fetch(`/api/bank?${params.toString()}`)
      if (!res.ok) throw new Error('Error cargando transacciones')
      return res.json()
    },
  })
}

function useCreateTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error creando operación')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Operación creada correctamente')
    },
    onError: () => toast.error('Error al crear operación'),
  })
}

function useUpdateTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/trades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error actualizando operación')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Operación actualizada correctamente')
    },
    onError: () => toast.error('Error al actualizar operación'),
  })
}

function useDeleteTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando operación')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Operación eliminada correctamente')
    },
    onError: () => toast.error('Error al eliminar operación'),
  })
}

function useCreateBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error creando transacción')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Transacción creada correctamente')
    },
    onError: () => toast.error('Error al crear transacción'),
  })
}

function useUpdateBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/bank/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error actualizando transacción')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Transacción actualizada correctamente')
    },
    onError: () => toast.error('Error al actualizar transacción'),
  })
}

function useDeleteBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bank/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando transacción')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Transacción eliminada correctamente')
    },
    onError: () => toast.error('Error al eliminar transacción'),
  })
}

// ─── Sidebar Content ────────────────────────────────────────────────────────

function SidebarContent({ activeSection, setActiveSection, onNavigate }: {
  activeSection: Section
  setActiveSection: (s: Section) => void
  onNavigate?: () => void
}) {
  const items = [
    { id: 'dashboard' as Section, label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'trades' as Section, label: 'Compras/Ventas P2P', icon: ArrowLeftRight },
    { id: 'bank' as Section, label: 'Banca Local', icon: Building2 },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-lg font-bold tracking-tight">P2P Tracker</h2>
        <p className="text-xs text-muted-foreground mt-1">Rastreador de mercado P2P</p>
      </div>
      <Separator />
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? 'secondary' : 'ghost'}
            className={`w-full justify-start gap-3 ${activeSection === item.id ? 'font-semibold' : ''}`}
            onClick={() => {
              setActiveSection(item.id)
              onNavigate?.()
            }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <p className="text-xs text-muted-foreground text-center">v1.0.0</p>
      </div>
    </div>
  )
}

// ─── Trade Form Dialog ──────────────────────────────────────────────────────

function TradeFormDialog({
  open,
  onOpenChange,
  trade,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade?: Trade | null
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [type, setType] = useState(trade?.type || 'compra')
  const [asset, setAsset] = useState(trade?.asset || 'USDT')
  const [amount, setAmount] = useState(trade?.amount?.toString() || '')
  const [price, setPrice] = useState(trade?.price?.toString() || '')
  const [currency, setCurrency] = useState(trade?.currency || 'VES')
  const [platform, setPlatform] = useState(trade?.platform || 'P2P')
  const [counterparty, setCounterparty] = useState(trade?.counterparty || '')
  const [notes, setNotes] = useState(trade?.notes || '')
  const [date, setDate] = useState(trade ? formatDateForInput(trade.date) : format(new Date(), 'yyyy-MM-dd'))
  const [calendarOpen, setCalendarOpen] = useState(false)

  const total = useMemo(() => {
    const a = parseFloat(amount) || 0
    const p = parseFloat(price) || 0
    return a * p
  }, [amount, price])

  const resetForm = useCallback(() => {
    setType('compra')
    setAsset('USDT')
    setAmount('')
    setPrice('')
    setCurrency('VES')
    setPlatform('P2P')
    setCounterparty('')
    setNotes('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  const handleSubmit = () => {
    if (!type || !asset || !amount || !price) {
      toast.error('Complete todos los campos obligatorios')
      return
    }
    onSubmit({
      type,
      asset,
      amount,
      price,
      total,
      currency,
      platform,
      counterparty: counterparty || null,
      notes: notes || null,
      date,
    })
    onOpenChange(false)
    resetForm()
  }

  // Populate form when editing a trade - handled by key prop remount

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trade ? 'Editar Operación' : 'Nueva Operación'}</DialogTitle>
          <DialogDescription>
            {trade ? 'Modifique los datos de la operación' : 'Complete los datos de la nueva operación P2P'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-type">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="trade-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-asset">Activo *</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger id="trade-asset">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-amount">Cantidad *</Label>
              <Input id="trade-amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-price">Precio Unitario *</Label>
              <Input id="trade-price" type="number" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total (calculado)</Label>
            <div className="h-10 px-3 rounded-md border bg-muted flex items-center text-sm font-medium">
              {formatNumber(total)} {currency}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-currency">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="trade-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VES">VES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-platform">Plataforma</Label>
              <Input id="trade-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-counterparty">Contraparte</Label>
              <Input id="trade-counterparty" placeholder="Nombre del trader" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(parseISO(date), 'dd/MM/yyyy') : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? parseISO(date) : new Date()}
                    onSelect={(d) => {
                      if (d) {
                        setDate(format(d, 'yyyy-MM-dd'))
                        setCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trade-notes">Notas</Label>
            <Textarea id="trade-notes" placeholder="Notas adicionales..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Guardando...' : trade ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bank Form Dialog ───────────────────────────────────────────────────────

function BankFormDialog({
  open,
  onOpenChange,
  transaction,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: BankTransaction | null
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [type, setType] = useState(transaction?.type || 'entrada')
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [currency, setCurrency] = useState(transaction?.currency || 'VES')
  const [bank, setBank] = useState(transaction?.bank || '')
  const [concept, setConcept] = useState(transaction?.concept || '')
  const [reference, setReference] = useState(transaction?.reference || '')
  const [date, setDate] = useState(transaction ? formatDateForInput(transaction.date) : format(new Date(), 'yyyy-MM-dd'))
  const [calendarOpen, setCalendarOpen] = useState(false)

  const resetForm = useCallback(() => {
    setType('entrada')
    setAmount('')
    setCurrency('VES')
    setBank('')
    setConcept('')
    setReference('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  const handleSubmit = () => {
    if (!type || !amount) {
      toast.error('Complete todos los campos obligatorios')
      return
    }
    onSubmit({
      type,
      amount,
      currency,
      bank: bank || null,
      concept: concept || null,
      reference: reference || null,
      date,
    })
    onOpenChange(false)
    resetForm()
  }

  // Populate form when editing a transaction - handled by key prop remount

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transacción' : 'Nueva Transacción'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Modifique los datos de la transacción bancaria' : 'Complete los datos de la nueva transacción bancaria'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-type">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="bank-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-amount">Monto *</Label>
              <Input id="bank-amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-currency">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="bank-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VES">VES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-bank">Banco</Label>
              <Input id="bank-bank" placeholder="Nombre del banco" value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-concept">Concepto</Label>
              <Input id="bank-concept" placeholder="Descripción" value={concept} onChange={(e) => setConcept(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-reference">Referencia</Label>
              <Input id="bank-reference" placeholder="Nro. referencia" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(parseISO(date), 'dd/MM/yyyy') : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? parseISO(date) : new Date()}
                  onSelect={(d) => {
                    if (d) {
                      setDate(format(d, 'yyyy-MM-dd'))
                      setCalendarOpen(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Guardando...' : transaction ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dashboard Section ──────────────────────────────────────────────────────

function DashboardSection() {
  const { data: stats, isLoading } = useStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const monthlyData = stats.monthlyBreakdown.map((m) => ({
    ...m,
    name: m.month,
  }))

  const assetData = stats.assetDistribution.map((a) => ({
    name: a.asset,
    value: a.total,
  }))

  const barData = stats.monthlyBreakdown.map((m) => ({
    name: m.month,
    Compras: m.compras,
    Ventas: m.ventas,
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Compras</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(stats.totalCompras)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.countCompras} operaciones</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold text-orange-600">{formatNumber(stats.totalVentas)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.countVentas} operaciones</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats.netProfitLoss >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ganancia/Pérdida Neta</p>
                <p className={`text-2xl font-bold ${stats.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netProfitLoss >= 0 ? '+' : ''}{formatNumber(stats.netProfitLoss)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">CUP</p>
              </div>
              <div className={`h-12 w-12 rounded-full ${stats.netProfitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                <DollarSign className={`h-6 w-6 ${stats.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance Bancario</p>
                <p className={`text-2xl font-bold ${stats.bankBalance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                  {formatNumber(stats.bankBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Entradas: {formatNumber(stats.totalEntradas)} | Salidas: {formatNumber(stats.totalSalidas)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Profit/Loss Trend */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tendencia Ganancia/Pérdida Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Line type="monotone" dataKey="profitLoss" name="Ganancia/Pérdida" stroke="#0891b2" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Distribution Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribución por Activo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {assetData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchases vs Sales Bar Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Compras vs Ventas Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                  <Bar dataKey="Compras" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ventas" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Operaciones Recientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentTrades.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Activo</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-xs py-2">{formatDate(trade.date)}</TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge variant={trade.type === 'compra' ? 'default' : 'secondary'} className={`text-[10px] ${trade.type === 'compra' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}`}>
                            {trade.type === 'compra' ? 'Compra' : 'Venta'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-medium">{trade.asset}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatNumber(trade.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No hay operaciones registradas</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Bank Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Transacciones Bancarias Recientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentBankTransactions.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Banco</TableHead>
                      <TableHead className="text-xs text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentBankTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs py-2">{formatDate(tx.date)}</TableCell>
                        <TableCell className="text-xs py-2">
                          <Badge variant={tx.type === 'entrada' ? 'default' : 'secondary'} className={`text-[10px] ${tx.type === 'entrada' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                            {tx.type === 'entrada' ? 'Entrada' : 'Salida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-2">{tx.bank || '-'}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatNumber(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No hay transacciones bancarias registradas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit/Loss by Asset */}
      {stats.profitLossByAsset.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ganancia/Pérdida por Activo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Total Compras</TableHead>
                    <TableHead className="text-right">Total Ventas</TableHead>
                    <TableHead className="text-right">Ganancia/Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.profitLossByAsset.map((item) => (
                    <TableRow key={item.asset}>
                      <TableCell className="font-medium">{item.asset}</TableCell>
                      <TableCell className="text-right text-green-600">{formatNumber(item.compras)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatNumber(item.ventas)}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.profitLoss >= 0 ? '+' : ''}{formatNumber(item.profitLoss)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Trades Section ─────────────────────────────────────────────────────────

function TradesSection() {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<string>('')
  const [filterAsset, setFilterAsset] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filters = useMemo(() => ({
    type: filterType || undefined,
    asset: filterAsset || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  }), [filterType, filterAsset, filterStartDate, filterEndDate])

  const { data: trades, isLoading } = useTrades(filters)
  const createTrade = useCreateTrade()
  const updateTrade = useUpdateTrade()
  const deleteTrade = useDeleteTrade()

  const filteredTrades = useMemo(() => {
    if (!trades) return []
    const start = (page - 1) * pageSize
    return trades.slice(start, start + pageSize)
  }, [trades, page])

  const totalPages = useMemo(() => {
    if (!trades) return 1
    return Math.ceil(trades.length / pageSize)
  }, [trades])

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingTrade) {
      updateTrade.mutate({ id: editingTrade.id, ...data })
    } else {
      createTrade.mutate(data)
    }
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteTrade.mutate(deleteId, { onSettled: () => setDeleteId(null) })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Compras/Ventas P2P</h2>
          <p className="text-sm text-muted-foreground">Gestione sus operaciones de compra y venta</p>
        </div>
        <Button onClick={() => { setEditingTrade(null); setFormOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Operación
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Activo</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input placeholder="Filtrar activo" value={filterAsset} onChange={(e) => { setFilterAsset(e.target.value); setPage(1) }} className="pl-7 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1) }} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1) }} className="text-sm" />
            </div>
            <div className="space-y-1 flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setFilterType(''); setFilterAsset(''); setFilterStartDate(''); setFilterEndDate(''); setPage(1) }} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !trades || trades.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay operaciones registradas</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => { setEditingTrade(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Crear primera operación
              </Button>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Activo</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                    <TableHead className="text-xs text-right">Precio</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Plataforma</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Contraparte</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-xs py-2">{formatDate(trade.date)}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] ${trade.type === 'compra' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}`}>
                          {trade.type === 'compra' ? 'Compra' : 'Venta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2 font-medium">{trade.asset}</TableCell>
                      <TableCell className="text-xs py-2 text-right">{formatNumber(trade.amount)}</TableCell>
                      <TableCell className="text-xs py-2 text-right">{formatNumber(trade.price)}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium">{formatNumber(trade.total)}</TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">{trade.platform}</TableCell>
                      <TableCell className="text-xs py-2 hidden lg:table-cell">{trade.counterparty || '-'}</TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTrade(trade); setFormOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(trade.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {trades && trades.length > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, trades.length)} de {trades.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Trade Form Dialog */}
      <TradeFormDialog
        key={editingTrade?.id || 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        trade={editingTrade}
        onSubmit={handleSubmit}
        isPending={createTrade.isPending || updateTrade.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La operación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Bank Section ───────────────────────────────────────────────────────────

function BankSection() {
  const [filterType, setFilterType] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<BankTransaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filters = useMemo(() => ({
    type: filterType || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  }), [filterType, filterStartDate, filterEndDate])

  const { data: transactions, isLoading } = useBankTransactions(filters)
  const createTx = useCreateBankTransaction()
  const updateTx = useUpdateBankTransaction()
  const deleteTx = useDeleteBankTransaction()

  const filteredTx = useMemo(() => {
    if (!transactions) return []
    const start = (page - 1) * pageSize
    return transactions.slice(start, start + pageSize)
  }, [transactions, page])

  const totalPages = useMemo(() => {
    if (!transactions) return 1
    return Math.ceil(transactions.length / pageSize)
  }, [transactions])

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingTx) {
      updateTx.mutate({ id: editingTx.id, ...data })
    } else {
      createTx.mutate(data)
    }
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteTx.mutate(deleteId, { onSettled: () => setDeleteId(null) })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Banca Local</h2>
          <p className="text-sm text-muted-foreground">Gestione sus transacciones bancarias locales</p>
        </div>
        <Button onClick={() => { setEditingTx(null); setFormOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Transacción
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1) }} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1) }} className="text-sm" />
            </div>
            <div className="space-y-1 flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setFilterType(''); setFilterStartDate(''); setFilterEndDate(''); setPage(1) }} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay transacciones bancarias registradas</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => { setEditingTx(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Crear primera transacción
              </Button>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Moneda</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Banco</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Concepto</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Referencia</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs py-2">{formatDate(tx.date)}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] ${tx.type === 'entrada' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                          {tx.type === 'entrada' ? 'Entrada' : 'Salida'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-xs py-2 text-right font-medium ${tx.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'entrada' ? '+' : '-'}{formatNumber(tx.amount)}
                      </TableCell>
                      <TableCell className="text-xs py-2">{tx.currency}</TableCell>
                      <TableCell className="text-xs py-2 hidden md:table-cell">{tx.bank || '-'}</TableCell>
                      <TableCell className="text-xs py-2 hidden lg:table-cell">{tx.concept || '-'}</TableCell>
                      <TableCell className="text-xs py-2 hidden lg:table-cell">{tx.reference || '-'}</TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTx(tx); setFormOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(tx.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {transactions && transactions.length > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, transactions.length)} de {transactions.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bank Form Dialog */}
      <BankFormDialog
        key={editingTx?.id || 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTx}
        onSubmit={handleSubmit}
        isPending={createTx.isPending || updateTx.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La transacción bancaria será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main P2P Tracker Component ─────────────────────────────────────────────

export function P2PTracker() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        <SidebarContent activeSection={activeSection} setActiveSection={setActiveSection} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Menú de Navegación</SheetTitle>
              </SheetHeader>
              <SidebarContent
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            {activeSection === 'dashboard' && <LayoutDashboard className="h-4 w-4 text-muted-foreground" />}
            {activeSection === 'trades' && <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />}
            {activeSection === 'bank' && <Building2 className="h-4 w-4 text-muted-foreground" />}
            <h1 className="text-sm font-semibold">
              {activeSection === 'dashboard' && 'Panel Principal'}
              {activeSection === 'trades' && 'Compras/Ventas P2P'}
              {activeSection === 'bank' && 'Banca Local'}
            </h1>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeSection === 'dashboard' && <DashboardSection />}
          {activeSection === 'trades' && <TradesSection />}
          {activeSection === 'bank' && <BankSection />}
        </main>
      </div>
    </div>
  )
}

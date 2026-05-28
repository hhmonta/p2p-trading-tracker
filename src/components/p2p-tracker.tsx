'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// Local DB
import {
  listTrades,
  createTrade as createTradeDB,
  updateTrade as updateTradeDB,
  deleteTrade as deleteTradeDB,
  listBankTransactions,
  createBankTransaction as createBankTransactionDB,
  updateBankTransaction as updateBankTransactionDB,
  deleteBankTransaction as deleteBankTransactionDB,
  computeStats,
  type Trade,
  type BankTransaction,
  type Stats,
} from '@/lib/local-db'

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

// Custom hook to force re-render when local data changes
function useLocalData() {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(r => r + 1), [])
  return { revision, refresh }
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade?: Trade | null
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const [type, setType] = useState(trade?.type || 'compra')
  const [asset, setAsset] = useState(trade?.asset || 'USDT')
  const [amount, setAmount] = useState(trade?.amount?.toString() || '')
  const [price, setPrice] = useState(trade?.price?.toString() || '')
  const [currency, setCurrency] = useState(trade?.currency || 'VES')
  const [platform, setPlatform] = useState(trade?.platform || 'Binance')
  const [bank, setBank] = useState(trade?.bank || '')
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
    setPlatform('Binance')
    setBank('')
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
      bank: bank || null,
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
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="trade-platform">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Bybit">Bybit</SelectItem>
                  <SelectItem value="SkipShift">SkipShift</SelectItem>
                  <SelectItem value="Zinli">Zinli</SelectItem>
                  <SelectItem value="Wally">Wally</SelectItem>
                  <SelectItem value="Apolopay">Apolopay</SelectItem>
                  <SelectItem value="Skylo">Skylo</SelectItem>
                  <SelectItem value="Airtm">Airtm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-bank">Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger id="trade-bank">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banco de Venezuela">Banco de Venezuela</SelectItem>
                  <SelectItem value="Banesco">Banesco</SelectItem>
                  <SelectItem value="Mercantil">Mercantil</SelectItem>
                  <SelectItem value="BNC">BNC</SelectItem>
                  <SelectItem value="Provincial">Provincial</SelectItem>
                  <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-counterparty">Contraparte</Label>
              <Input id="trade-counterparty" placeholder="Nombre del trader" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <Button onClick={handleSubmit}>
            {trade ? 'Actualizar' : 'Crear'}
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: BankTransaction | null
  onSubmit: (data: Record<string, unknown>) => void
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
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger id="bank-bank">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banco de Venezuela">Banco de Venezuela</SelectItem>
                  <SelectItem value="Banesco">Banesco</SelectItem>
                  <SelectItem value="Mercantil">Mercantil</SelectItem>
                  <SelectItem value="BNC">BNC</SelectItem>
                  <SelectItem value="Provincial">Provincial</SelectItem>
                  <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                </SelectContent>
              </Select>
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
          <Button onClick={handleSubmit}>
            {transaction ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dashboard Section ──────────────────────────────────────────────────────

function DashboardSection({ revision }: { revision: number }) {
  const stats = useMemo(() => computeStats(), [revision])

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
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Total Compras</p>
                <p className="text-lg font-bold text-green-600 truncate">{formatNumber(stats.totalComprasUSDT)}</p>
                <p className="text-[10px] text-muted-foreground">{stats.countCompras} ops · USDT</p>
              </div>
              <div className="h-8 w-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Total Ventas</p>
                <p className="text-lg font-bold text-orange-600 truncate">{formatNumber(stats.totalVentasUSDT)}</p>
                <p className="text-[10px] text-muted-foreground">{stats.countVentas} ops · USDT</p>
              </div>
              <div className="h-8 w-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats.netProfitLossUSDT >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Ganancia/Pérdida</p>
                <p className={`text-lg font-bold ${stats.netProfitLossUSDT >= 0 ? 'text-green-600' : 'text-red-600'} truncate`}>
                  {stats.netProfitLossUSDT >= 0 ? '+' : ''}{formatNumber(stats.netProfitLossUSDT)}
                </p>
                <p className="text-[10px] text-muted-foreground">USDT</p>
              </div>
              <div className={`h-8 w-8 shrink-0 rounded-full ${stats.netProfitLossUSDT >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                <DollarSign className={`h-4 w-4 ${stats.netProfitLossUSDT >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Balance Bancario</p>
                <p className={`text-lg font-bold ${stats.bankBalance >= 0 ? 'text-cyan-600' : 'text-red-600'} truncate`}>
                  {formatNumber(stats.bankBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground">VES</p>
              </div>
              <div className="h-8 w-8 shrink-0 rounded-full bg-cyan-100 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Monthly Profit/Loss Trend */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Tendencia Ganancia/Pérdida
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Line type="monotone" dataKey="profitLoss" name="Ganancia/Pérdida" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-xs">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Distribution Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <PieChartIcon className="h-3 w-3" />
              Distribución por Activo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={assetData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {assetData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-xs">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchases vs Sales Bar Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              Compras vs Ventas Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Compras" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Ventas" fill="#ea580c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-xs">
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
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Activo</TableHead>
                    <TableHead className="text-xs text-right">Compras (USDT)</TableHead>
                    <TableHead className="text-xs text-right">Ventas (USDT)</TableHead>
                    <TableHead className="text-xs text-right">Ganancia/Pérdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.profitLossByAsset.map((item) => (
                    <TableRow key={item.asset}>
                      <TableCell className="text-xs py-2 font-medium">{item.asset}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-green-600">{formatNumber(item.comprasAmount)}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-orange-600">{formatNumber(item.ventasAmount)}</TableCell>
                      <TableCell className={`text-xs py-2 text-right font-semibold ${item.profitLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.profitLossAmount >= 0 ? '+' : ''}{formatNumber(item.profitLossAmount)} USDT
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

function TradesSection({ revision, refresh }: { revision: number; refresh: () => void }) {
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

  const trades = useMemo(() => listTrades(filters), [revision, filters])

  const filteredTrades = useMemo(() => {
    const start = (page - 1) * pageSize
    return trades.slice(start, start + pageSize)
  }, [trades, page])

  const totalPages = useMemo(() => {
    return Math.ceil(trades.length / pageSize)
  }, [trades])

  const handleSubmit = (data: Record<string, unknown>) => {
    try {
      if (editingTrade) {
        updateTradeDB(editingTrade.id, data)
        toast.success('Operación actualizada correctamente')
      } else {
        const trade = createTradeDB(data)
        // Auto-create bank transaction from P2P trade
        // Compra = money leaves bank (salida), Venta = money enters bank (entrada)
        const bankTxType = trade.type === 'compra' ? 'salida' : 'entrada'
        if (trade.bank && trade.total > 0) {
          createBankTransactionDB({
            type: bankTxType,
            amount: trade.total.toString(),
            currency: trade.currency,
            bank: trade.bank,
            concept: `${trade.type === 'compra' ? 'Compra' : 'Venta'} P2P - ${trade.amount} ${trade.asset}`,
            reference: null,
            date: trade.date,
          })
          toast.success(`Operación creada + movimiento bancario registrado`)
        } else {
          toast.success('Operación creada correctamente')
        }
      }
      refresh()
    } catch {
      toast.error(editingTrade ? 'Error al actualizar operación' : 'Error al crear operación')
    }
  }

  const handleDelete = () => {
    if (deleteId) {
      try {
        deleteTradeDB(deleteId)
        toast.success('Operación eliminada correctamente')
        refresh()
      } catch {
        toast.error('Error al eliminar operación')
      }
      setDeleteId(null)
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
          {trades.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay operaciones registradas</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => { setEditingTrade(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Crear primera operación
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Activo</TableHead>
                    <TableHead className="text-xs text-right">Cantidad</TableHead>
                    <TableHead className="text-xs text-right">Precio</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Plataforma</TableHead>
                    <TableHead className="text-xs">Banco</TableHead>
                    <TableHead className="text-xs">Contraparte</TableHead>
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
                      <TableCell className="text-xs py-2">{trade.platform}</TableCell>
                      <TableCell className="text-xs py-2">{trade.bank || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{trade.counterparty || '-'}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {trades.length > pageSize && (
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

function BankSection({ revision, refresh }: { revision: number; refresh: () => void }) {
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

  const transactions = useMemo(() => listBankTransactions(filters), [revision, filters])

  const filteredTx = useMemo(() => {
    const start = (page - 1) * pageSize
    return transactions.slice(start, start + pageSize)
  }, [transactions, page])

  const totalPages = useMemo(() => {
    return Math.ceil(transactions.length / pageSize)
  }, [transactions])

  const bankStats = useMemo(() => {
    const allTx = listBankTransactions()
    const entradas = allTx.filter(t => t.type === 'entrada')
    const salidas = allTx.filter(t => t.type === 'salida')
    const totalEntradas = entradas.reduce((sum, t) => sum + t.amount, 0)
    const totalSalidas = salidas.reduce((sum, t) => sum + t.amount, 0)
    const balance = totalEntradas - totalSalidas

    // Breakdown by bank
    const bankMap = new Map<string, { entradas: number; salidas: number; balance: number }>()
    for (const tx of allTx) {
      const bankName = tx.bank || 'Sin Banco'
      const entry = bankMap.get(bankName) || { entradas: 0, salidas: 0, balance: 0 }
      if (tx.type === 'entrada') entry.entradas += tx.amount
      else entry.salidas += tx.amount
      entry.balance = entry.entradas - entry.salidas
      bankMap.set(bankName, entry)
    }
    const byBank = Array.from(bankMap.entries()).map(([bank, data]) => ({ bank, ...data }))

    // Breakdown by currency
    const currMap = new Map<string, { entradas: number; salidas: number; balance: number }>()
    for (const tx of allTx) {
      const curr = tx.currency || 'VES'
      const entry = currMap.get(curr) || { entradas: 0, salidas: 0, balance: 0 }
      if (tx.type === 'entrada') entry.entradas += tx.amount
      else entry.salidas += tx.amount
      entry.balance = entry.entradas - entry.salidas
      currMap.set(curr, entry)
    }
    const byCurrency = Array.from(currMap.entries()).map(([currency, data]) => ({ currency, ...data }))

    return { totalEntradas, totalSalidas, balance, byBank, byCurrency }
  }, [revision])

  const handleSubmit = (data: Record<string, unknown>) => {
    try {
      if (editingTx) {
        updateBankTransactionDB(editingTx.id, data)
        toast.success('Transacción actualizada correctamente')
      } else {
        createBankTransactionDB(data)
        toast.success('Transacción creada correctamente')
      }
      refresh()
    } catch {
      toast.error(editingTx ? 'Error al actualizar transacción' : 'Error al crear transacción')
    }
  }

  const handleDelete = () => {
    if (deleteId) {
      try {
        deleteBankTransactionDB(deleteId)
        toast.success('Transacción eliminada correctamente')
        refresh()
      } catch {
        toast.error('Error al eliminar transacción')
      }
      setDeleteId(null)
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">Total Entradas</p>
                <p className="text-base font-bold text-green-600 truncate">{formatNumber(bankStats.totalEntradas)}</p>
              </div>
              <div className="h-7 w-7 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">Total Salidas</p>
                <p className="text-base font-bold text-red-600 truncate">{formatNumber(bankStats.totalSalidas)}</p>
              </div>
              <div className="h-7 w-7 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${bankStats.balance >= 0 ? 'border-l-cyan-500' : 'border-l-red-500'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">Balance</p>
                <p className={`text-base font-bold ${bankStats.balance >= 0 ? 'text-cyan-600' : 'text-red-600'} truncate`}>
                  {bankStats.balance >= 0 ? '+' : ''}{formatNumber(bankStats.balance)}
                </p>
              </div>
              <div className={`h-7 w-7 shrink-0 rounded-full ${bankStats.balance >= 0 ? 'bg-cyan-100' : 'bg-red-100'} flex items-center justify-center`}>
                <Wallet className={`h-3.5 w-3.5 ${bankStats.balance >= 0 ? 'text-cyan-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Breakdown */}
      {bankStats.byBank.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Resumen por Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Banco</TableHead>
                    <TableHead className="text-xs text-right">Entradas</TableHead>
                    <TableHead className="text-xs text-right">Salidas</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankStats.byBank.map((item) => (
                    <TableRow key={item.bank}>
                      <TableCell className="text-xs py-2 font-medium">{item.bank}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-green-600">{formatNumber(item.entradas)}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-red-600">{formatNumber(item.salidas)}</TableCell>
                      <TableCell className={`text-xs py-2 text-right font-semibold ${item.balance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                        {item.balance >= 0 ? '+' : ''}{formatNumber(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currency Breakdown */}
      {bankStats.byCurrency.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Resumen por Moneda
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <Table className="min-w-[350px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Moneda</TableHead>
                    <TableHead className="text-xs text-right">Entradas</TableHead>
                    <TableHead className="text-xs text-right">Salidas</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankStats.byCurrency.map((item) => (
                    <TableRow key={item.currency}>
                      <TableCell className="text-xs py-2 font-medium">{item.currency}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-green-600">{formatNumber(item.entradas)}</TableCell>
                      <TableCell className="text-xs py-2 text-right text-red-600">{formatNumber(item.salidas)}</TableCell>
                      <TableCell className={`text-xs py-2 text-right font-semibold ${item.balance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                        {item.balance >= 0 ? '+' : ''}{formatNumber(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay transacciones bancarias registradas</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => { setEditingTx(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Crear primera transacción
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Moneda</TableHead>
                    <TableHead className="text-xs">Banco</TableHead>
                    <TableHead className="text-xs">Concepto</TableHead>
                    <TableHead className="text-xs">Referencia</TableHead>
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
                      <TableCell className="text-xs py-2">{tx.bank || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{tx.concept || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{tx.reference || '-'}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {transactions.length > pageSize && (
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
  const { revision, refresh } = useLocalData()

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
          {activeSection === 'dashboard' && <DashboardSection revision={revision} />}
          {activeSection === 'trades' && <TradesSection revision={revision} refresh={refresh} />}
          {activeSection === 'bank' && <BankSection revision={revision} refresh={refresh} />}
        </main>
      </div>
    </div>
  )
}

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const trades = await db.trade.findMany({ orderBy: { date: 'desc' } })
    const bankTransactions = await db.bankTransaction.findMany({ orderBy: { date: 'desc' } })

    // Total purchases
    const compras = trades.filter((t) => t.type === 'compra')
    const totalCompras = compras.reduce((sum, t) => sum + t.total, 0)
    const countCompras = compras.length

    // Total sales
    const ventas = trades.filter((t) => t.type === 'venta')
    const totalVentas = ventas.reduce((sum, t) => sum + t.total, 0)
    const countVentas = ventas.length

    // Net profit/loss
    const netProfitLoss = totalVentas - totalCompras

    // Profit/loss by asset
    const assetMap = new Map<string, { compras: number; ventas: number }>()
    for (const trade of trades) {
      const existing = assetMap.get(trade.asset) || { compras: 0, ventas: 0 }
      if (trade.type === 'compra') {
        existing.compras += trade.total
      } else {
        existing.ventas += trade.total
      }
      assetMap.set(trade.asset, existing)
    }
    const profitLossByAsset = Array.from(assetMap.entries()).map(([asset, data]) => ({
      asset,
      compras: data.compras,
      ventas: data.ventas,
      profitLoss: data.ventas - data.compras,
    }))

    // Monthly breakdown
    const monthlyMap = new Map<string, { compras: number; ventas: number; month: string }>()
    for (const trade of trades) {
      const d = new Date(trade.date)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyMap.get(monthKey) || { compras: 0, ventas: 0, month: monthKey }
      if (trade.type === 'compra') {
        existing.compras += trade.total
      } else {
        existing.ventas += trade.total
      }
      monthlyMap.set(monthKey, existing)
    }
    const monthlyBreakdown = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, profitLoss: m.ventas - m.compras }))

    // Bank balance
    const entradas = bankTransactions.filter((t) => t.type === 'entrada')
    const salidas = bankTransactions.filter((t) => t.type === 'salida')
    const totalEntradas = entradas.reduce((sum, t) => sum + t.amount, 0)
    const totalSalidas = salidas.reduce((sum, t) => sum + t.amount, 0)
    const bankBalance = totalEntradas - totalSalidas

    // Recent trades (last 5)
    const recentTrades = trades.slice(0, 5)

    // Recent bank transactions (last 5)
    const recentBankTransactions = bankTransactions.slice(0, 5)

    // Asset distribution for pie chart
    const assetDistribution = Array.from(assetMap.entries()).map(([asset, data]) => ({
      asset,
      total: data.compras + data.ventas,
    }))

    return NextResponse.json({
      totalCompras,
      countCompras,
      totalVentas,
      countVentas,
      netProfitLoss,
      profitLossByAsset,
      monthlyBreakdown,
      bankBalance,
      totalEntradas,
      totalSalidas,
      recentTrades,
      recentBankTransactions,
      assetDistribution,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}

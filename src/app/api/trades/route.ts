import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const asset = searchParams.get('asset')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (asset) where.asset = asset
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const trades = await db.trade.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({ error: 'Error al obtener operaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, asset, amount, price, total, currency, platform, bank, counterparty, notes, date } = body

    if (!type || !asset || amount === undefined || price === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const trade = await db.trade.create({
      data: {
        type,
        asset,
        amount: parseFloat(amount),
        price: parseFloat(price),
        total: total ? parseFloat(total) : parseFloat(amount) * parseFloat(price),
        currency: currency || 'VES',
        platform: platform || 'Binance',
        bank: bank || null,
        counterparty: counterparty || null,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(trade, { status: 201 })
  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json({ error: 'Error al crear operación' }, { status: 500 })
  }
}

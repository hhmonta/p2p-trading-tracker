import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const transactions = await db.bankTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json({ error: 'Error al obtener transacciones bancarias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, currency, concept, reference, bank, date } = body

    if (!type || amount === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const transaction = await db.bankTransaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        currency: currency || 'CUP',
        concept: concept || null,
        reference: reference || null,
        bank: bank || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating bank transaction:', error)
    return NextResponse.json({ error: 'Error al crear transacción bancaria' }, { status: 500 })
  }
}

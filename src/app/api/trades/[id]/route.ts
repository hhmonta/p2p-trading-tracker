import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, asset, amount, price, total, currency, platform, bank, counterparty, notes, date } = body

    const existingTrade = await db.trade.findUnique({ where: { id } })
    if (!existingTrade) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    const trade = await db.trade.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(asset !== undefined && { asset }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(total !== undefined && { total: parseFloat(total) }),
        ...(currency !== undefined && { currency }),
        ...(platform !== undefined && { platform }),
        ...(bank !== undefined && { bank: bank || null }),
        ...(counterparty !== undefined && { counterparty: counterparty || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    })

    return NextResponse.json(trade)
  } catch (error) {
    console.error('Error updating trade:', error)
    return NextResponse.json({ error: 'Error al actualizar operación' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingTrade = await db.trade.findUnique({ where: { id } })
    if (!existingTrade) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    await db.trade.delete({ where: { id } })
    return NextResponse.json({ message: 'Operación eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting trade:', error)
    return NextResponse.json({ error: 'Error al eliminar operación' }, { status: 500 })
  }
}

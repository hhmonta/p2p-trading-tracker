import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, amount, currency, concept, reference, bank, date } = body

    const existing = await db.bankTransaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    const transaction = await db.bankTransaction.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(currency !== undefined && { currency }),
        ...(concept !== undefined && { concept: concept || null }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(bank !== undefined && { bank: bank || null }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error updating bank transaction:', error)
    return NextResponse.json({ error: 'Error al actualizar transacción' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.bankTransaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    await db.bankTransaction.delete({ where: { id } })
    return NextResponse.json({ message: 'Transacción eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting bank transaction:', error)
    return NextResponse.json({ error: 'Error al eliminar transacción' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const response = await fetch(`https://api.postalpincode.in/pincode/${code}`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([{ Status: 'Error', PostOffice: null }])
  }
}
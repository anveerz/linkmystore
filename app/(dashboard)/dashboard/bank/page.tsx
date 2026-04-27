import { redirect } from 'next/navigation'

export default function BankPage() {
  redirect('/dashboard/payments')
}

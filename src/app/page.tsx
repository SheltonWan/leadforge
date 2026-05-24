import { redirect } from 'next/navigation'

// Root path redirects to the main dashboard.
export default function Home() {
  redirect('/dashboard')
}

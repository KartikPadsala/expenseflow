import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Users, Receipt, PieChart, Shield, Zap } from 'lucide-react';

const features = [
  { icon: Users, title: 'Group Expenses', description: 'Create groups for trips, roommates, couples, and more.' },
  { icon: Receipt, title: 'Smart Splitting', description: 'Equal, percentage, shares, or custom splits — your choice.' },
  { icon: Zap, title: 'Debt Simplification', description: 'Our algorithm minimizes the number of transactions to settle.' },
  { icon: PieChart, title: 'Analytics', description: 'Beautiful charts showing your spending patterns and trends.' },
  { icon: Shield, title: 'Secure & Private', description: 'End-to-end encryption, JWT auth, and audit logs.' },
  { icon: Wallet, title: 'Multi-Currency', description: 'Track expenses in 30+ currencies with live exchange rates.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">ExpenseFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/auth/register">
            <Button>Get Started Free</Button>
          </Link>
        </div>
      </nav>

      <section className="text-center py-24 px-6 max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Split expenses with friends,{' '}
          <span className="text-primary">effortlessly.</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10">
          ExpenseFlow is a free, open-source alternative to Splitwise. Track shared expenses,
          split bills any way you want, and settle debts with friends and groups.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register">
            <Button size="lg">Start for free</Button>
          </Link>
          <Link href="https://github.com/KartikPadsala/expenseflow" target="_blank">
            <Button size="lg" variant="outline">View on GitHub</Button>
          </Link>
        </div>
      </section>

      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to split expenses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to simplify your finances?</h2>
        <p className="text-muted-foreground mb-8">Join thousands of users who track expenses with ExpenseFlow.</p>
        <Link href="/auth/register">
          <Button size="lg">Create free account</Button>
        </Link>
      </section>
    </div>
  );
}

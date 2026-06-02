'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegister } from '@/hooks/use-auth';

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(2).max(50),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Must contain uppercase, lowercase, number, and special character',
  ),
});

export default function RegisterPage() {
  const { mutate: register, isPending, error } = useRegister();
  const { register: formRegister, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start tracking expenses with your friends for free</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => register(data))} className="space-y-4">
            {[
              { name: 'displayName' as const, label: 'Full Name', placeholder: 'John Doe', type: 'text' },
              { name: 'email' as const, label: 'Email', placeholder: 'you@example.com', type: 'email' },
              { name: 'username' as const, label: 'Username', placeholder: 'johndoe', type: 'text' },
              { name: 'password' as const, label: 'Password', placeholder: '••••••••', type: 'password' },
            ].map(({ name, label, placeholder, type }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input type={type} placeholder={placeholder} {...formRegister(name)} />
                {errors[name] && <p className="text-sm text-destructive">{errors[name]?.message}</p>}
              </div>
            ))}
            {error && <p className="text-sm text-destructive">Registration failed. Please try again.</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

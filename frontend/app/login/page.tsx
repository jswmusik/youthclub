'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect happens automatically in AuthContext
    } catch (err) {
      setError('Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EBEBFE] via-white to-[#EBEBFE]/50 p-4">
      <div className="w-full max-w-md">
        <Card className="border border-gray-100 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto mb-4 mt-6 flex items-center justify-center">
              <Image
                src="/ua-logo-stylized.png"
                alt="Ungdomsappen Logo"
                width={120}
                height={120}
                className="object-contain"
                priority
              />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-[#121213]">Welcome Back</CardTitle>
            <CardDescription className="text-gray-500 text-base">
              Sign in to Ungdomsappen
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#4D4DA4] hover:bg-[#FF5485] text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center pt-2">
              <a 
                href="#" 
                className="text-sm text-gray-500 hover:text-[#4D4DA4] transition-colors font-medium"
              >
                Forgot password?
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Printer } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Printing') navigate('/printing');
      else if (user.role === 'Factory') navigate('/factory');
      else if (user.role === 'Client') navigate('/client');
    }
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Printer className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">ID Print SaaS</h2>
          </div>
          
          <div className="mt-10">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Please sign in to your account to continue.
            </p>
          </div>

          <div className="mt-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium leading-6 text-slate-900">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-lg border-0 py-2.5 px-3.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border-0 py-2.5 px-3.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all">
                  Sign in
                </Button>
              </div>
            </form>

            <div className="mt-10">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-white px-6 text-slate-500">Demo Accounts</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button onClick={() => login('admin@idprint.com', 'password123')} className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 focus-visible:ring-transparent transition-all">
                  Admin
                </button>
                <button onClick={() => login('print@idprint.com', 'password123')} className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 focus-visible:ring-transparent transition-all">
                  Printing
                </button>
                <button onClick={() => login('factory@idprint.com', 'password123')} className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 focus-visible:ring-transparent transition-all">
                  Factory
                </button>
                <button onClick={() => login('client@school.edu', 'password123')} className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 focus-visible:ring-transparent transition-all">
                  Client
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Image/Graphic */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-900">
        <div className="absolute inset-0 h-full w-full object-cover bg-gradient-to-br from-blue-600 to-slate-900 opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
              Streamline your ID card production.
            </h2>
            <p className="text-lg leading-8 text-slate-300">
              A complete SaaS solution for managing orders, printing, factory workflow, and client delivery.
            </p>
            
            <div className="mt-12 grid grid-cols-2 gap-8 text-left">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-lg border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">10x</div>
                <div className="text-sm text-slate-300">Faster order processing and tracking</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-lg border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-slate-300">Visibility across all production stages</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

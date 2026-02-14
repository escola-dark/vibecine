import { FormEvent, useState } from 'react';
import heroBg from '@/assets/hero-bg.jpg';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, isSigningIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(email, password, rememberMe);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-background/80" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          VIBECINES
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Faça login para acessar o dashboard. Apenas o admin pode importar/atualizar a lista M3U.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Senha</label>
            <input
              type="password"
              className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
            Manter conectado
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
          >
            {isSigningIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
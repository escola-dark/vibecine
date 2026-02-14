import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroBg from '@/assets/hero-bg.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { getLastRoute, hasRememberChoice, setRememberChoice } from '@/lib/session';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isSigningIn, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepConnected, setKeepConnected] = useState(hasRememberChoice());

  useEffect(() => {
    if (isAuthenticated) {
      const destination = hasRememberChoice() ? getLastRoute() : '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const success = await login(email, password, keepConnected);
    if (!success) return;

    setRememberChoice(keepConnected);
    navigate(keepConnected ? getLastRoute() : '/', { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-background/80" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-bold text-primary mb-2 text-center" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          VIBECINES
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Faça o login para acessar o melhor acervo de filmes e séries.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Senha</label>
            <input
              type="password"
              className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={keepConnected}
              onChange={(e) => setKeepConnected(e.target.checked)}
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



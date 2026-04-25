import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro no login");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-sm border border-[var(--border)]">
        <div className="text-center">
          <h2 className="text-3xl font-serif italic text-[var(--accent)] tracking-tight">Bem-vindo</h2>
          <p className="text-[var(--text-muted)] mt-2">Faça o login para entrar no sistema</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 text-sm text-[var(--error)] bg-white border border-[var(--error)] rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 bg-white border border-[var(--border)] rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 bg-white border border-[var(--border)] rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full py-2.5 px-4 text-white font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

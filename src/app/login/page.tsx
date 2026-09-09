"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] px-4">
      <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg">₵</div>
          <div>
            <div className="font-bold leading-none">Gestor</div>
            <div className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase">Gastos & Ingresos</div>
          </div>
        </div>
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mt-1">Tus datos ahora están aislados por usuario. El saldo inicia en cero.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <button disabled={loading} className="w-full py-3 rounded-full bg-slate-900 text-white font-bold hover:bg-black disabled:opacity-60">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">¿No tienes cuenta? </span>
          <a href="/register" className="font-semibold text-indigo-600 hover:underline">Crear cuenta</a>
        </div>
        <div className="mt-4 text-center text-[11px] text-slate-400">Cada usuario empieza con ingresos y gastos en S/ 0.00</div>
      </div>
    </div>
  );
}

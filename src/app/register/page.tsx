"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");
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
        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <p className="text-sm text-slate-500 mt-1">Empieza con saldo cero y lleva tus finanzas al día.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Nombre (opcional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Contraseña (mín 6)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
          <button disabled={loading} className="w-full py-3 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">¿Ya tienes cuenta? </span>
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">Iniciar sesión</a>
        </div>
      </div>
    </div>
  );
}

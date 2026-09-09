"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// ───────────────────────────────────────────────────────── Types
type TxType = "expense" | "income";
type Currency = "PEN" | "USD" | "EUR";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TxType;
};

type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  description: string;
  date: string; // YYYY-MM-DD
  note?: string | null;
  category?: Category;
};

type Budget = Record<string, number>;

// ───────────────────────────────────────────────────────── Constants
const CURRENCIES: Record<Currency, { symbol: string; label: string }> = {
  PEN: { symbol: "S/", label: "Soles" },
  USD: { symbol: "$", label: "Dólares" },
  EUR: { symbol: "€", label: "Euros" },
};

// ───────────────────────────────────────────────────────── Helpers
function formatMoney(amount: number, cur: Currency) {
  return `${CURRENCIES[cur].symbol} ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}
function isSameMonth(dateStr: string, ym: string) {
  return dateStr.slice(0, 7) === ym;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ───────────────────────────────────────────────────────── Charts
function DonutChart({ data, total, currency }: { data: { label: string; value: number; color: string; icon: string }[]; total: number; currency: Currency }) {
  if (data.length === 0) return <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm">Sin gastos este mes</div>;
  const radius = 62;
  const stroke = 18;
  const circ = 2 * Math.PI * radius;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
          <circle cx={80} cy={80} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {data.map((d) => {
            const len = total > 0 ? (d.value / total) * circ : 0;
            acc += len;
            return (
              <circle key={d.label} cx={80} cy={80} r={radius} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={circ - acc + len} strokeLinecap="round" />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] tracking-widest font-semibold text-slate-400 uppercase">Gastos</span>
          <span className="text-[16px] font-bold text-slate-900">{formatMoney(total, currency)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 max-h-[160px] overflow-auto pr-1">
        {data.slice().sort((a, b) => b.value - a.value).map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-[13px]">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] shrink-0" style={{ background: d.color + "18", border: `1px solid ${d.color}30` }}>{d.icon}</span>
            <span className="flex-1 truncate text-slate-700 font-medium">{d.label}</span>
            <span className="font-semibold text-slate-900">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBars({ months, currency }: { months: { ym: string; income: number; expense: number }[]; currency: Currency }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  return (
    <div className="flex items-end gap-2 h-[140px] pt-4">
      {months.map((m) => (
        <div key={m.ym} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex gap-1 items-end justify-center w-full h-[96px]">
            <div className="flex-1 rounded-t-md bg-emerald-500/90" style={{ height: `${(m.income / max) * 96}px`, minHeight: m.income ? 4 : 0 }} title={`Ingresos ${formatMoney(m.income, currency)}`} />
            <div className="flex-1 rounded-t-md bg-rose-500/90" style={{ height: `${(m.expense / max) * 96}px`, minHeight: m.expense ? 4 : 0 }} title={`Gastos ${formatMoney(m.expense, currency)}`} />
          </div>
          <span className="text-[11px] font-medium text-slate-500">{new Date(m.ym + "-01").toLocaleDateString("es-PE", { month: "short" })}</span>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────── Main
export default function Page() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget>({});
  const [currency, setCurrency] = useState<Currency>("PEN");
  const [user, setUser] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"inicio" | "transacciones" | "estadisticas" | "presupuesto">("inicio");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TxType>("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCat, setFormCat] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(todayStr());
  const [formNote, setFormNote] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [meRes, catRes, txRes, budRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/categories"), fetch("/api/transactions"), fetch("/api/budgets")]);
      if (meRes.status === 401) { router.push("/login"); return; }
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }
      if (!catRes.ok) throw new Error("Error categorías");
      if (txRes.status === 401) { router.push("/login"); return; }
      if (!txRes.ok) throw new Error("Error transacciones");
      const cats: Category[] = await catRes.json();
      const txs: Transaction[] = await txRes.json();
      const buds: { categoryId: string; limit: number }[] = budRes.ok ? await budRes.json() : [];
      setCategories(cats);
      setTransactions(txs);
      const map: Budget = {};
      buds.forEach((b) => (map[b.categoryId] = b.limit));
      setBudgets(map);
      // set default formCat if empty
      if (cats.length && !formCat) {
        const firstExpense = cats.find((c) => c.type === "expense");
        if (firstExpense) setFormCat(firstExpense.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchAll();
    const c = localStorage.getItem("gg:currency") as Currency | null;
    if (c) setCurrency(c);
  }, [fetchAll]);

  useEffect(() => {
    localStorage.setItem("gg:currency", currency);
  }, [currency]);

  // keep formCat in sync when switching type
  useEffect(() => {
    if (!categories.length) return;
    const valid = categories.find((c) => c.id === formCat && c.type === formType);
    if (!valid) {
      const first = categories.find((c) => c.type === formType);
      if (first) setFormCat(first.id);
    }
  }, [formType, categories, formCat]);

  const monthTxs = useMemo(() => transactions.filter((t) => isSameMonth(t.date, month)), [transactions, month]);
  const totals = useMemo(() => {
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [monthTxs]);

  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>();
    monthTxs.filter((t) => t.type === "expense").forEach((t) => map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount));
    return Array.from(map.entries())
      .map(([id, value]) => {
        const cat = categories.find((c) => c.id === id);
        return { id, label: cat?.name ?? id, value, color: cat?.color ?? "#94a3b8", icon: cat?.icon ?? "•" };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTxs, categories]);

  const last6Months = useMemo(() => {
    const arr: { ym: string; income: number; expense: number }[] = [];
    const base = new Date(month + "-01");
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const txs = transactions.filter((t) => t.date.slice(0, 7) === ym);
      arr.push({ ym, income: txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), expense: txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) });
    }
    return arr;
  }, [transactions, month]);

  const filteredList = useMemo(() => {
    let list = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q));
    }
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (filterCat !== "all") list = list.filter((t) => t.categoryId === filterCat);
    list.sort((a, b) => {
      if (sortBy === "date_desc") return b.date.localeCompare(a.date);
      if (sortBy === "date_asc") return a.date.localeCompare(b.date);
      if (sortBy === "amount_desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return list;
  }, [transactions, search, filterType, filterCat, sortBy]);

  const grouped = useMemo(() => {
    const g = new Map<string, Transaction[]>();
    for (const t of filteredList) {
      if (!g.has(t.date)) g.set(t.date, []);
      g.get(t.date)!.push(t);
    }
    return Array.from(g.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredList]);

  function openAdd(type: TxType) {
    setEditing(null);
    setFormType(type);
    setFormAmount("");
    setFormDesc("");
    setFormNote("");
    setFormDate(todayStr());
    const first = categories.find((c) => c.type === type);
    if (first) setFormCat(first.id);
    setShowModal(true);
  }
  function openEdit(tx: Transaction) {
    setEditing(tx);
    setFormType(tx.type);
    setFormAmount(String(tx.amount));
    setFormCat(tx.categoryId);
    setFormDesc(tx.description);
    setFormNote(tx.note ?? "");
    setFormDate(tx.date);
    setShowModal(true);
  }

  async function handleSave() {
    const amount = parseFloat(formAmount.replace(",", "."));
    if (!amount || amount <= 0) return alert("Ingresa un monto válido");
    if (!formDesc.trim()) return alert("Agrega una descripción");
    if (!formCat) return alert("Selecciona categoría");
    setSaving(true);
    try {
      const payload = { type: formType, amount, categoryId: formCat, description: formDesc.trim(), date: formDate, note: formNote.trim() || null };
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      const saved: Transaction = await res.json();
      if (editing) setTransactions((prev) => prev.map((t) => (t.id === editing.id ? saved : t)));
      else setTransactions((prev) => [saved, ...prev]);
      setShowModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta transacción?")) return;
    const prev = transactions;
    setTransactions((p) => p.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
    } catch (e) {
      setTransactions(prev);
      alert(e instanceof Error ? e.message : "Error");
    }
  }

   async function updateBudget(categoryId: string, limit: number) {
    setBudgets((prev) => ({ ...prev, [categoryId]: limit }));
    try {
      const res = await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, limit }) });
      if (!res.ok) throw new Error("Error presupuesto");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const catForForm = categories.filter((c) => c.type === formType);

  function shiftMonth(dir: number) {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + dir);
    setMonth(d.toISOString().slice(0, 7));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <div className="mt-3 text-sm font-semibold text-slate-600">Cargando datos desde Postgres…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f9fb] text-slate-900">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-[18px]">₵</div>
            <div className="hidden sm:block">
              <div className="font-bold leading-none tracking-tight">Gestor</div>
              <div className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase -mt-0.5">Gastos & Ingresos</div>
            </div>
            <span className="sm:hidden font-bold">Gestor</span>
            {error && <span className="hidden sm:inline text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full p-1">
              <button onClick={() => shiftMonth(-1)} className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-600">‹</button>
              <span className="px-2 text-sm font-semibold capitalize min-w-[150px] text-center">{monthLabel(month)}</span>
              <button onClick={() => shiftMonth(1)} className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-600">›</button>
            </div>
            <div className="md:hidden flex items-center gap-1 bg-slate-100 rounded-full px-2 py-1">
              <button onClick={() => shiftMonth(-1)} className="px-1">‹</button>
              <span className="text-xs font-semibold capitalize">{monthLabel(month)}</span>
              <button onClick={() => shiftMonth(1)} className="px-1">›</button>
            </div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="h-8 rounded-full bg-white border border-slate-200 px-3 text-xs font-semibold">
              <option value="PEN">S/ PEN</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right leading-none">
                  <div className="text-xs font-bold">{user.name || user.email.split("@")[0]}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs" title="Cerrar sesión">
                  ↪
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white items-center justify-center text-xs font-bold">PG</div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden lg:block sticky top-[88px] h-fit">
          <nav className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1">
            {[
              { id: "inicio", label: "Inicio", icon: "◧", desc: "Resumen" },
              { id: "transacciones", label: "Transacciones", icon: "≡", desc: `${transactions.length} movs.` },
              { id: "estadisticas", label: "Estadísticas", icon: "◈", desc: "Gráficos" },
              { id: "presupuesto", label: "Presupuestos", icon: "◎", desc: "Límites" },
            ].map((it) => (
              <button key={it.id} onClick={() => setActiveTab(it.id as never)} className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition ${activeTab === it.id ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${activeTab === it.id ? "bg-white/15" : "bg-slate-100"}`}>{it.icon}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold leading-none">{it.label}</span>
                  <span className={`block text-[11px] ${activeTab === it.id ? "text-white/60" : "text-slate-500"}`}>{it.desc}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="mt-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-4 text-white">
            <div className="text-sm font-semibold">Postgres conectado ✓</div>
            <div className="text-xs opacity-80 mt-1 leading-relaxed">Datos guardados en <code>gestordegastos</code> @ EC2. Exporta cuando quieras.</div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `gastos-${month}.json`;
                a.click();
              }}
              className="mt-3 w-full bg-white text-indigo-600 rounded-full py-2 text-xs font-bold"
            >
              Exportar JSON
            </button>
            <button onClick={fetchAll} className="mt-2 w-full bg-white/15 text-white rounded-full py-1.5 text-xs font-semibold">
              Recargar
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {activeTab === "inicio" && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-4">
                <div className="relative overflow-hidden rounded-[24px] bg-slate-900 text-white p-6 sm:p-7">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -right-6 bottom-0 w-56 h-56 bg-indigo-500/20 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] tracking-[0.14em] font-semibold text-white/60 uppercase">Saldo actual · {monthLabel(month)}</div>
                        <div className="mt-2 text-[32px] sm:text-[38px] font-extrabold tracking-tight leading-none">{formatMoney(totals.balance, currency)}</div>
                        <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${totals.balance >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          <span>{totals.balance >= 0 ? "▲" : "▼"}</span> {totals.balance >= 0 ? "Ahorro positivo" : "Gastas más de lo que ingresas"}
                        </div>
                      </div>
                      <button onClick={() => setShowCatModal(true)} className="hidden sm:inline-flex bg-white text-slate-900 rounded-full px-4 py-2 text-xs font-bold hover:bg-slate-100">
                        + Nuevo
                      </button>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px]">↑</span> Ingresos
                        </div>
                        <div className="mt-1 text-lg font-bold">{formatMoney(totals.income, currency)}</div>
                        <div className="text-[11px] text-white/60">{monthTxs.filter((t) => t.type === "income").length} movimientos</div>
                      </div>
                      <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                          <span className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white text-[11px]">↓</span> Gastos
                        </div>
                        <div className="mt-1 text-lg font-bold">{formatMoney(totals.expense, currency)}</div>
                        <div className="text-[11px] text-white/60">{monthTxs.filter((t) => t.type === "expense").length} movimientos</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => openAdd("expense")} className="flex-1 bg-white text-slate-900 rounded-full py-2.5 text-sm font-bold">− Agregar gasto</button>
                      <button onClick={() => openAdd("income")} className="flex-1 bg-emerald-500 text-white rounded-full py-2.5 text-sm font-bold">+ Agregar ingreso</button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-[24px] border border-slate-200 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Gastos por categoría</h3>
                    <span className="text-xs text-slate-500">{expenseByCat.length} categorías</span>
                  </div>
                  <div className="mt-4">
                    <DonutChart data={expenseByCat} total={totals.expense} currency={currency} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Evolución · últimos 6 meses</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ingresos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Gastos
                      </span>
                    </div>
                  </div>
                  <MiniBars months={last6Months} currency={currency} />
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>Prom. ingresos {formatMoney(last6Months.reduce((s, m) => s + m.income, 0) / 6, currency)}</span>
                    <span>Prom. gastos {formatMoney(last6Months.reduce((s, m) => s + m.expense, 0) / 6, currency)}</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Presupuesto del mes</h3>
                    <button onClick={() => setActiveTab("presupuesto")} className="text-xs font-semibold text-indigo-600 hover:underline">
                      Editar →
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {Object.entries(budgets)
                      .slice(0, 5)
                      .map(([catId, limit]) => {
                        const cat = categories.find((c) => c.id === catId);
                        const spent = monthTxs.filter((t) => t.type === "expense" && t.categoryId === catId).reduce((s, t) => s + t.amount, 0);
                        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                        const over = spent > limit;
                        return (
                          <div key={catId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: (cat?.color ?? "#e2e8f0") + "18" }}>
                                  {cat?.icon ?? "•"}
                                </span>
                                {cat?.name ?? catId}
                              </span>
                              <span className={`font-semibold ${over ? "text-rose-600" : "text-slate-700"}`}>{formatMoney(spent, currency)} / {formatMoney(limit, currency)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    {Object.keys(budgets).length === 0 && <div className="text-sm text-slate-500">Sin presupuestos. Crea uno en la pestaña Presupuestos.</div>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200">
                <div className="p-5 flex items-center justify-between">
                  <h3 className="font-bold">Movimientos recientes</h3>
                  <button onClick={() => setActiveTab("transacciones")} className="text-xs font-semibold bg-slate-900 text-white rounded-full px-3 py-1.5">
                    Ver todo
                  </button>
                </div>
                <div className="px-2 pb-2">
                  {monthTxs.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-sm">No hay movimientos en {monthLabel(month)}. ¡Agrega tu primer gasto!</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {monthTxs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((t) => {
                        const cat = categories.find((c) => c.id === t.categoryId);
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] shrink-0" style={{ background: (cat?.color ?? "#e2e8f0") + "18", border: `1px solid ${cat?.color ?? "#e2e8f0"}30` }}>{cat?.icon ?? "•"}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{t.description}</div>
                              <div className="text-xs text-slate-500 truncate">{cat?.name} · {new Date(t.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} {t.note ? `· ${t.note}` : ""}</div>
                            </div>
                            <div className={`text-sm font-bold shrink-0 ${t.type === "expense" ? "text-rose-600" : "text-emerald-600"}`}>{t.type === "expense" ? "−" : "+"}{formatMoney(t.amount, currency)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "transacciones" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_auto_auto_auto] gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as never)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium">
                    <option value="all">Todos</option>
                    <option value="expense">Gastos</option>
                    <option value="income">Ingresos</option>
                  </select>
                  <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium">
                    <option value="all">Todas categorías</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as never)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium">
                    <option value="date_desc">Fecha ↓</option>
                    <option value="date_asc">Fecha ↑</option>
                    <option value="amount_desc">Monto ↓</option>
                    <option value="amount_asc">Monto ↑</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold">{filteredList.length} resultados</span>
                  <span className="text-slate-300">·</span>
                  <span>Ingresos {formatMoney(filteredList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), currency)}</span>
                  <span className="text-slate-300">·</span>
                  <span>Gastos {formatMoney(filteredList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), currency)}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => openAdd("expense")} className="bg-slate-900 text-white rounded-full px-3 py-1.5 font-semibold">+ Gasto</button>
                    <button onClick={() => openAdd("income")} className="bg-emerald-600 text-white rounded-full px-3 py-1.5 font-semibold">+ Ingreso</button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {grouped.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">No se encontraron movimientos. Prueba otros filtros o agrega datos reales.</div>
                ) : (
                  grouped.map(([date, items]) => {
                    const dayTotal = items.reduce((s, t) => s + (t.type === "expense" ? -t.amount : t.amount), 0);
                    return (
                      <div key={date} className="border-b last:border-b-0 border-slate-100">
                        <div className="sticky top-0 bg-slate-50/80 backdrop-blur px-4 py-2 flex items-center justify-between text-xs border-y border-slate-100">
                          <span className="font-bold uppercase tracking-widest text-slate-600">{new Date(date).toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span>
                          <span className={`font-bold ${dayTotal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{dayTotal >= 0 ? "+" : ""}{formatMoney(dayTotal, currency)}</span>
                        </div>
                        {items.map((t) => {
                          const cat = categories.find((c) => c.id === t.categoryId);
                          return (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: (cat?.color ?? "#e2e8f0") + "18" }}>{cat?.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{t.description}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat?.color }} /> {cat?.name}
                                  </span>
                                  {t.note && <span>· {t.note}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={`text-sm font-extrabold ${t.type === "expense" ? "text-slate-900" : "text-emerald-600"}`}>{t.type === "expense" ? "− " : "+ "}{formatMoney(t.amount, currency)}</div>
                              </div>
                              <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-900 hover:text-white flex items-center justify-center text-xs">✎</button>
                                <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-rose-600 hover:text-white flex items-center justify-center text-xs">×</button>
                              </div>
                              <div className="sm:hidden flex gap-1">
                                <button onClick={() => openEdit(t)} className="text-xs px-2 py-1 rounded-full bg-slate-100">Editar</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "estadisticas" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] tracking-widest font-bold text-slate-500 uppercase">Total ingresos (mes)</div>
                  <div className="mt-1 text-xl font-extrabold text-emerald-600">{formatMoney(totals.income, currency)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] tracking-widest font-bold text-slate-500 uppercase">Total gastos (mes)</div>
                  <div className="mt-1 text-xl font-extrabold text-rose-600">{formatMoney(totals.expense, currency)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] tracking-widest font-bold text-slate-500 uppercase">Tasa ahorro</div>
                  <div className="mt-1 text-xl font-extrabold">{totals.income ? ((totals.balance / totals.income) * 100).toFixed(1) : "0"}%</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] tracking-widest font-bold text-slate-500 uppercase">Ticket promedio</div>
                  <div className="mt-1 text-xl font-extrabold">{formatMoney(monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) / Math.max(1, monthTxs.filter((t) => t.type === "expense").length), currency)}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="font-bold">Distribución de gastos</h3>
                  <p className="text-xs text-slate-500">Mes de {monthLabel(month)}</p>
                  <div className="mt-6"><DonutChart data={expenseByCat} total={totals.expense} currency={currency} /></div>
                  <div className="mt-6 space-y-2">{expenseByCat.map((d) => (<div key={d.id} className="flex items-center gap-3 text-sm"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="flex-1 font-medium">{d.label}</span><span className="font-semibold">{formatMoney(d.value, currency)}</span><span className="text-xs text-slate-500 w-10 text-right">{((d.value / Math.max(1, totals.expense)) * 100).toFixed(0)}%</span></div>))}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="font-bold">Ingresos vs Gastos</h3>
                  <p className="text-xs text-slate-500">Últimos 6 meses</p>
                  <MiniBars months={last6Months} currency={currency} />
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-700">Detalle mensual</div>
                    <div className="mt-2 space-y-1.5">{last6Months.map((m) => (<div key={m.ym} className="flex items-center justify-between text-xs"><span className="font-medium capitalize">{new Date(m.ym + "-01").toLocaleDateString("es-PE", { month: "long", year: "numeric" })}</span><span className="flex gap-3"><span className="text-emerald-600 font-semibold">+{formatMoney(m.income, currency)}</span><span className="text-rose-600 font-semibold">−{formatMoney(m.expense, currency)}</span><span className={`font-bold ${m.income - m.expense >= 0 ? "text-slate-900" : "text-rose-600"}`}>{formatMoney(m.income - m.expense, currency)}</span></span></div>))}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "presupuesto" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Presupuestos por categoría</h3>
                    <p className="text-sm text-slate-500 max-w-[560px]">Define límites mensuales. Se guardan en Postgres.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 font-medium">Mes:</span>
                    <span className="bg-slate-900 text-white rounded-full px-3 py-1 font-semibold capitalize">{monthLabel(month)}</span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.filter((c) => c.type === "expense").map((cat) => {
                    const limit = budgets[cat.id] ?? 0;
                    const spent = monthTxs.filter((t) => t.type === "expense" && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
                    const pct = limit > 0 ? (spent / limit) * 100 : 0;
                    const remaining = limit - spent;
                    return (
                      <div key={cat.id} className="rounded-2xl border border-slate-200 p-4 hover:shadow-sm transition bg-white">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm" style={{ background: cat.color + "18", border: `1px solid ${cat.color}30` }}>{cat.icon}</span>
                            <span className="font-semibold text-sm">{cat.name}</span>
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${pct >= 100 ? "bg-rose-100 text-rose-700" : pct >= 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{pct ? `${pct.toFixed(0)}%` : "—"}</span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#f43f5e" : pct >= 80 ? "#f59e0b" : cat.color }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Gastado <b className="text-slate-900">{formatMoney(spent, currency)}</b> de {formatMoney(limit || 0, currency)}</span>
                          <span className={remaining < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold"}>{remaining >= 0 ? `Quedan ${formatMoney(remaining, currency)}` : `Excedido ${formatMoney(Math.abs(remaining), currency)}`}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">Límite</span>
                          <input type="number" value={limit || ""} placeholder="0" onChange={(e) => updateBudget(cat.id, parseFloat(e.target.value) || 0)} className="ml-auto w-28 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <span className="text-xs text-slate-500">{CURRENCIES[currency].symbol}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={async () => {
                      const preset: Budget = {};
                      const findId = (name: string) => categories.find((c) => c.name === name)?.id;
                      const v: Record<string, number> = { Vivienda: 900, Alimentos: 600, Transporte: 300, Ocio: 250, Compras: 400 };
                      for (const [n, lim] of Object.entries(v)) {
                        const id = findId(n);
                        if (id) preset[id] = lim;
                      }
                      setBudgets(preset);
                      await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budgets: preset }) });
                    }}
                    className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                  >
                    Restaurar ejemplo
                  </button>
                  <button
                    onClick={async () => {
                      setBudgets({});
                      await fetch("/api/budgets", { method: "DELETE" });
                    }}
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
                  >
                    Limpiar todo
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h4 className="font-bold">Categorías en BD</h4>
                <p className="text-xs text-slate-500 mt-1">Gestionadas en Postgres. Todas las transacciones ya usan IDs reales.</p>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {categories.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 p-3 flex flex-col items-center text-center gap-1 bg-slate-50/50">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.color + "18" }}>{c.icon}</span>
                      <span className="text-xs font-semibold">{c.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: c.color, color: "white" }}>{c.type === "expense" ? "Gasto" : "Ingreso"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {[
            { id: "inicio", label: "Inicio", icon: "◧" },
            { id: "transacciones", label: "Movs", icon: "≡" },
            { id: "estadisticas", label: "Gráficos", icon: "◈" },
            { id: "presupuesto", label: "Presup.", icon: "◎" },
          ].map((it) => (
            <button key={it.id} onClick={() => setActiveTab(it.id as never)} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl ${activeTab === it.id ? "bg-slate-900 text-white" : "text-slate-500"}`}>
              <span className="text-base leading-none">{it.icon}</span>
              <span className="text-[11px] font-semibold">{it.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="fixed bottom-[84px] lg:bottom-6 right-4 sm:right-6 flex flex-col gap-2 z-20">
        <button onClick={() => openAdd("income")} className="hidden sm:inline-flex w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg items-center justify-center text-xl hover:bg-emerald-700" title="Agregar ingreso">+</button>
        <button onClick={() => openAdd("expense")} className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-black">＋</button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full sm:max-w-[520px] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold">{editing ? "Editar movimiento" : "Nuevo movimiento"} <span className="text-xs font-normal text-slate-500 ml-1">→ Postgres</span></h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full">
                <button onClick={() => setFormType("expense")} className={`py-2.5 rounded-full text-sm font-bold transition ${formType === "expense" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>− Gasto</button>
                <button onClick={() => setFormType("income")} className={`py-2.5 rounded-full text-sm font-bold transition ${formType === "income" ? "bg-emerald-600 text-white shadow" : "text-slate-600"}`}>+ Ingreso</button>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Monto</label>
                <div className="mt-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">{CURRENCIES[currency].symbol}</span>
                  <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[22px] font-extrabold" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Categoría</label>
                <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {catForForm.map((c) => (
                    <button key={c.id} onClick={() => setFormCat(c.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition ${formCat === c.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: formCat === c.id ? "rgba(255,255,255,0.15)" : c.color + "18" }}>{c.icon}</span>
                      <span className="text-[11px] font-semibold leading-none text-center">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Descripción</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder={formType === "expense" ? "Ej: Supermercado, Alquiler..." : "Ej: Sueldo, Freelance..."} className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1 w-full px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nota (opcional)</label>
                  <input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Detalle..." className="mt-1 w-full px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-full border border-slate-200 font-semibold bg-white" disabled={saving}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} className={`flex-1 py-3 rounded-full font-bold text-white disabled:opacity-60 ${formType === "expense" ? "bg-slate-900 hover:bg-black" : "bg-emerald-600 hover:bg-emerald-700"}`}>{saving ? "Guardando..." : editing ? "Guardar cambios" : formType === "expense" ? "Agregar gasto" : "Agregar ingreso"}</button>
              </div>
              {editing && (<button onClick={() => { handleDelete(editing.id); setShowModal(false); }} className="w-full py-2 text-sm font-semibold text-rose-600 hover:underline">Eliminar movimiento</button>)}
            </div>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCatModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold">Datos reales en Postgres ✓</h3>
            <p className="text-sm text-slate-600 mt-1">Todo se guarda en tu BD <code>gestordegastos</code> en EC2. Ya puedes agregar datos reales.</p>
            <button onClick={() => setShowCatModal(false)} className="mt-4 w-full py-2.5 rounded-full bg-slate-900 text-white font-semibold">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

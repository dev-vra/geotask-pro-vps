"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("geotask_user");
    if (saved) router.push("/");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (res.ok) {
        localStorage.setItem("geotask_user", JSON.stringify(data));
        router.push("/");
      } else {
        setError(data.error || "Credenciais inválidas");
      }
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(152,175,59,0.15)_0%,transparent_70%)] -top-32 -right-20 blur-[60px] pointer-events-none animate-pulse-soft" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.08)_0%,transparent_70%)] -bottom-16 -left-16 blur-[60px] pointer-events-none animate-pulse-soft" style={{ animationDelay: '1s' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(152,175,59,0.08)_0%,transparent_70%)] top-1/2 left-1/3 blur-[80px] pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-[420px] mx-4 p-10 sm:p-11 glass rounded-3xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_20px_60px_-12px_rgba(0,0,0,0.1)] relative z-10 animate-fade-in-up">
        {/* Logo + heading */}
        <div className="text-center mb-9">
          <div className="flex items-center justify-center mb-5">
            <Image
              src="/logo.png"
              alt="Geogis Logo"
              width={160}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-1.5 tracking-tight font-display">
            Bem-vindo ao GeoTask Pro
          </h1>
          <p className="text-slate-500 text-sm">
            Faça login para acessar o painel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          {/* Email */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full py-3 px-3.5 pl-11 bg-slate-50 border-[1.5px] border-slate-200 rounded-xl text-slate-800 text-[15px] outline-none transition-all duration-200 input-focus-ring placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full py-3 px-3.5 pl-11 pr-11 bg-slate-50 border-[1.5px] border-slate-200 rounded-xl text-slate-800 text-[15px] outline-none transition-all duration-200 input-focus-ring placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-slate-400 flex items-center hover:text-slate-600 transition-colors"
              >
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 py-2.5 px-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[13px] animate-shake">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-white border-none rounded-xl text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2.5 mt-1 tracking-tight transition-all duration-200 animate-fade-in-up ${
              loading
                ? "bg-primary-light cursor-not-allowed"
                : "btn-primary"
            }`}
            style={{ animationDelay: '0.2s' }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-7">
          © {new Date().getFullYear()} Geogis. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorPt } from "@/lib/auth-errors";
import { confirmUrl } from "@/lib/site";
import { AuthShell, Notice } from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "link" ? "Link inválido ou expirado. Peça outro." : "");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(authErrorPt(error.message));
        setBusy(false);
        return;
      }
      router.replace("/hoje");
      router.refresh();
    } else {
      // shouldCreateUser: false -> magic link never creates accounts; joining needs an invite.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: confirmUrl() },
      });
      setBusy(false);
      if (error) setError(authErrorPt(error.message));
      else setSent(true);
    }
  }

  if (sent) {
    return (
      <Notice title="Confira seu e-mail">
        Enviamos um link de acesso para <b>{email}</b>. Abra no mesmo celular. No iPhone com o app instalado,
        prefira entrar com senha: o link abre no Safari, fora do app.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div role="tablist" aria-label="Forma de entrar" className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(["password", "magic"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-lg text-sm font-semibold transition-colors duration-150 ${mode === m ? "bg-raised text-fg" : "text-muted hover:text-fg"}`}
          >
            {m === "password" ? "Senha" : "Link por e-mail"}
          </button>
        ))}
      </div>
      {mode === "magic" && (
        <p className="text-sm text-muted">Enviamos um link de acesso para o seu e-mail. No iPhone com o app instalado, prefira a senha.</p>
      )}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? "login-error" : undefined} />
      </div>
      {mode === "password" && (
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={error ? "login-error" : undefined} />
        </div>
      )}
      {error && (
        <p id="login-error" role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Entrando…" : mode === "password" ? "Entrar" : "Enviar link"}
      </button>
      <div className="border-t border-divider pt-4">
        <p className="mb-2 text-sm text-muted">Recebeu um código de convite?</p>
        <Link href="/join" className="btn-secondary w-full">
          Entrar no grupo
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell subtitle="Entre para fazer o check-in de hoje">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, LockKeyhole, LogOut, Mail } from "lucide-react";
import type { AuthProvider } from "@netlify/identity";
import type { CollectorController } from "@/lib/client/useCollector";

export default function AuthPanel({ collector }: { collector: CollectorController }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { auth, loading } = collector;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    const email = String(values.get("email") ?? "").trim();
    form.reset();
    if (auth.callback) await collector.completeAccount(password);
    else if (mode === "signup") await collector.signup(email, password);
    else await collector.login(email, password);
  }

  if (!auth.ready) return <p className="collector-status" role="status">Checking collector sign-in…</p>;
  if (!auth.available) return <div className="collector-auth-offline">
    <LockKeyhole size={22} /><div><h3>Sign in on the hosted app</h3><p>Accounts need the hosted Netlify app. Your guest profile and local collection still work here.</p></div>
  </div>;
  if (auth.signedIn && !auth.callback) return <div className="collector-signed-in">
    <span><span className="status-dot" /> Collector account connected</span>
    <button type="button" className="text-button" onClick={() => void collector.logout()} disabled={loading}><LogOut size={15} /> Sign out</button>
  </div>;

  const providers = Object.entries(auth.settings?.providers ?? {}).filter(([provider, enabled]) => enabled === true && provider !== "email");
  const emailEnabled = auth.settings?.providers.email === true;
  const creating = mode === "signup" && !auth.settings?.disableSignup;

  return <section className="collector-auth" aria-label="Collector sign-in">
    <div className="collector-section-title"><KeyRound size={18} /><h3>{auth.callback ? "Finish your account" : "Join the street-saving squad"}</h3></div>
    <p className="collector-copy">{auth.callback ? "Set a new password to continue." : "Sign in before scanning a real photo to build a community score."}</p>
    {!auth.callback && <>
      {providers.length > 0 && <div className="collector-provider-buttons">
        {providers.map(([provider]) => <button key={provider} type="button" className="button button-outline" disabled={loading} onClick={() => void collector.oauth(provider as AuthProvider)}>
          Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}<ArrowRight size={15} />
        </button>)}
      </div>}
      {emailEnabled && <div className="collector-auth-tabs" role="group" aria-label="Email account action">
        <button type="button" aria-pressed={!creating} onClick={() => setMode("login")}>Sign in</button>
        {!auth.settings?.disableSignup && <button type="button" aria-pressed={creating} onClick={() => setMode("signup")}>Create account</button>}
      </div>}
    </>}
    {(emailEnabled || auth.callback) && <form className="collector-auth-form" onSubmit={event => void submit(event)}>
      <fieldset disabled={loading}>
        {!auth.callback && <label className="field-label">Email address
          <input name="email" type="email" autoComplete="username" maxLength={254} required placeholder="you@example.com" />
        </label>}
        <label className="field-label">{creating || auth.callback ? "Choose a password" : "Password"}
          <input name="password" type="password" autoComplete={creating || auth.callback ? "new-password" : "current-password"} minLength={creating || auth.callback ? 8 : 1} maxLength={128} required />
        </label>
        <button type="submit" className="button button-light full-width"><Mail size={17} />{loading ? "Please wait…" : auth.callback ? "Save password" : creating ? "Create collector account" : "Sign in with email"}<ArrowRight size={17} /></button>
      </fieldset>
    </form>}
    {!emailEnabled && providers.length === 0 && !auth.callback && <p className="notice">Sign-in is not enabled for this hosted app yet. You can keep your profile on this device.</p>}
    {creating && <p className="collector-fine-print">{auth.settings?.autoconfirm ? "Your account will be ready after signup." : "We will send a confirmation link to the address you enter."} Publishing your score is a separate choice.</p>}
  </section>;
}

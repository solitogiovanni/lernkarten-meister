import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email || "giovanni.solito@gmail.com",
      { redirectTo: `${window.location.origin}/` }
    );
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Recovery link sent to giovanni.solito@gmail.com");
      setMode("login");
    }
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setMode("login");
      setNewPassword("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || mode === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm p-6">
          <h1 className="text-2xl font-bold mb-1">
            Wort<span className="text-primary">schatz</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" && "Sign in to continue"}
            {mode === "forgot" && "Send a recovery link"}
            {mode === "reset" && "Set a new password"}
          </p>

          {mode === "login" && (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign in
              </Button>
              <button type="button" onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center">
                Forgot password?
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A recovery link will be sent to <strong>giovanni.solito@gmail.com</strong>.
              </p>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send recovery link
              </Button>
              <button type="button" onClick={() => setMode("login")}
                className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center">
                Back to sign in
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={onReset} className="space-y-4">
              <div>
                <Label htmlFor="newpw">New password</Label>
                <Input id="newpw" type="password" autoComplete="new-password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Update password
              </Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => supabase.auth.signOut()}
      className="px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1"
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

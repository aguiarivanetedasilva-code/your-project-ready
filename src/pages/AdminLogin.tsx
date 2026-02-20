import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: "Erro no login", description: error.message, variant: "destructive" });
        return;
      }

      if (data.user) {
        // Check if user has admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin");

        if (roles && roles.length > 0) {
          navigate("/admin");
        } else {
          toast({ title: "Acesso negado", description: "Você não tem permissão de administrador.", variant: "destructive" });
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      toast({ title: "Erro", description: "Erro inesperado. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="bg-background rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Faça login para acessar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-foreground text-primary font-bold rounded-lg hover:bg-foreground/90"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

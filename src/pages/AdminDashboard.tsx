import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LogOut, DollarSign, Car, TrendingUp, Clock, RefreshCw,
} from "lucide-react";

interface Transaction {
  id: string;
  transaction_id: string;
  placa: string;
  amount: number;
  net_amount: number | null;
  fees: number | null;
  status: string;
  payment_method: string;
  invoice_url: string | null;
  created_at: string;
}

interface VehicleLookup {
  id: string;
  placa: string;
  created_at: string;
  user_agent: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lookups, setLookups] = useState<VehicleLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "vehicles">("dashboard");

  const fetchData = async () => {
    setLoading(true);
    const [txRes, lookupRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_lookups").select("*").order("created_at", { ascending: false }),
    ]);
    setTransactions(txRes.data || []);
    setLookups(lookupRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
        return;
      }
      fetchData();
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const paidTransactions = transactions.filter((t) => t.status === "PAID");
  const pendingTransactions = transactions.filter((t) => t.status === "PENDING");
  const conversionRate = transactions.length > 0 ? (paidTransactions.length / transactions.length) * 100 : 0;

  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR");
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "transactions" as const, label: "Transações" },
    { key: "vehicles" as const, label: "Veículos" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-foreground text-primary px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Painel Administrativo</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary hover:text-primary/80 hover:bg-foreground/80">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </header>

      {/* Tabs */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "dashboard" && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Receita Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
              </div>

              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Transações</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
              </div>

              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Pendentes</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{pendingTransactions.length}</p>
              </div>

              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Car className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Consultas</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{lookups.length}</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-background rounded-xl border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Transações Recentes</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.transaction_id}</TableCell>
                        <TableCell className="font-bold">{tx.placa}</TableCell>
                        <TableCell>{formatCurrency(tx.amount)}</TableCell>
                        <TableCell>{statusBadge(tx.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma transação ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {activeTab === "transactions" && (
          <div className="bg-background rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Todas as Transações</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transação</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Taxas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.transaction_id}</TableCell>
                      <TableCell className="font-bold">{tx.placa}</TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>{tx.net_amount ? formatCurrency(tx.net_amount) : "-"}</TableCell>
                      <TableCell>{tx.fees ? formatCurrency(tx.fees) : "-"}</TableCell>
                      <TableCell>{statusBadge(tx.status)}</TableCell>
                      <TableCell>{tx.payment_method}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                      <TableCell>
                        {tx.invoice_url ? (
                          <a href={tx.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                            Ver
                          </a>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="bg-background rounded-xl border border-border">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Consultas de Veículos</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lookups.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-bold">{l.placa}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{l.user_agent || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {lookups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma consulta encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

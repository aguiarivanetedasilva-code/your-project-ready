import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LogOut, DollarSign, Car, TrendingUp, Clock, RefreshCw, Smartphone, Wifi, MapPin, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import DeviceMap from "@/components/DeviceMap";

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

interface DeviceSession {
  id: string;
  placa: string;
  ip_address: string | null;
  user_agent: string | null;
  device_model: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  action: string;
  page_visited: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lookups, setLookups] = useState<VehicleLookup[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "vehicles" | "devices">("dashboard");

  const fetchData = async () => {
    setLoading(true);
    const [txRes, lookupRes, deviceRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicle_lookups").select("*").order("created_at", { ascending: false }),
      supabase.from("device_sessions").select("*").order("created_at", { ascending: false }),
    ]);
    console.log("[AdminDash] txRes:", txRes.data?.length, txRes.error);
    console.log("[AdminDash] lookupRes:", lookupRes.data?.length, lookupRes.error);
    console.log("[AdminDash] deviceRes:", deviceRes.data?.length, deviceRes.error);
    setTransactions(txRes.data || []);
    setLookups(lookupRes.data || []);
    setDevices((deviceRes.data as DeviceSession[]) || []);
    setLoading(false);
  };

  // Filter to only show devices active in the last 5 minutes, deduplicated by IP + placa
  const activeDevices = (() => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = devices.filter((d) => new Date(d.created_at) > fiveMinAgo);
    // Keep only the most recent entry per unique IP + placa combo
    const seen = new Map<string, DeviceSession>();
    for (const d of recent) {
      const key = `${d.ip_address || ''}_${d.placa}`;
      const existing = seen.get(key);
      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
        seen.set(key, d);
      }
    }
    return Array.from(seen.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
        return;
      }
      fetchData();
    });

    // Realtime subscription for device_sessions
    const channel = supabase
      .channel('device-sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_sessions' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setDevices((prev) => prev.filter((d) => d.id !== (payload.old as DeviceSession).id));
          } else {
            setDevices((prev) => {
              const filtered = prev.filter((d) => d.id !== (payload.new as DeviceSession).id);
              return [payload.new as DeviceSession, ...filtered];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          supabase.from("transactions").select("*").order("created_at", { ascending: false }).then(({ data }) => {
            if (data) setTransactions(data);
          });
        }
      )
      .subscribe();

    // Polling fallback every 15 seconds
    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    // Re-render every 30s to prune stale devices from activeDevices
    const pruneInterval = setInterval(() => {
      setDevices((prev) => [...prev]);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearInterval(pruneInterval);
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const handleClearPanel = async () => {
    setLoading(true);
    const [txDel, lookDel, devDel] = await Promise.all([
      supabase.from("transactions").delete().gte("created_at", "1970-01-01"),
      supabase.from("vehicle_lookups").delete().gte("created_at", "1970-01-01"),
      supabase.from("device_sessions").delete().gte("created_at", "1970-01-01"),
    ]);
    console.log("[AdminDash] Delete results:", txDel.error, lookDel.error, devDel.error);
    if (!txDel.error && !lookDel.error && !devDel.error) {
      setTransactions([]);
      setLookups([]);
      setDevices([]);
    } else {
      // If delete failed, refetch to show actual state
      await fetchData();
    }
    setLoading(false);
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const paidTransactions = transactions.filter((t) => t.status === "PAID");
  const pendingTransactions = transactions.filter((t) => t.status === "PENDING");
  const conversionRate = transactions.length > 0 ? (paidTransactions.length / transactions.length) * 100 : 0;
  const totalVisits = devices.filter((d) => d.action === "page_visit").length;
  const totalPixCopies = devices.filter((d) => d.action === "pix_copy").length;
  const onlineDevices = activeDevices.length;

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
    { key: "devices" as const, label: "Dispositivos" },
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
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todo o painel?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso apagará todas as transações, consultas de veículos e sessões de dispositivos. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearPanel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "dashboard" && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Visitas</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalVisits}</p>
              </div>

              <div className="bg-background rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <span className="text-sm text-muted-foreground">Online Agora</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{onlineDevices}</p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 5 minutos</p>
              </div>

              <div className="bg-background rounded-xl border border-border p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Pix Copiados</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalPixCopies}</p>
                {totalPixCopies > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pix Copiados Recentes */}
            <div className="bg-background rounded-xl border border-border mb-6">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">🟢 Pix Copiados Recentes</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Página</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.filter((d) => d.action === "pix_copy").slice(0, 10).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-bold">{d.placa}</TableCell>
                        <TableCell className="text-xs">{d.device_model || "-"}</TableCell>
                        <TableCell className="text-xs">{[d.city, d.region].filter(Boolean).join(", ") || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{d.page_visited || "/pix"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {devices.filter((d) => d.action === "pix_copy").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum Pix copiado ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

        {activeTab === "devices" && (
          <div className="space-y-6">
            {/* Map */}
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <h2 className="text-lg font-bold text-foreground">Mapa de Clientes</h2>
              </div>
              <DeviceMap devices={activeDevices} />
            </div>

            {/* Table */}
            <div className="bg-background rounded-xl border border-border">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Dispositivos em Tempo Real
                </h2>
                <span className="text-sm text-muted-foreground">
                  {activeDevices.length} online agora
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Página</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeDevices.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs">Online</span>
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">{d.placa}</TableCell>
                        <TableCell className="font-mono text-xs">{d.ip_address || "-"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs">{d.device_model || "Desconhecido"}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {[d.city, d.region, d.country].filter(Boolean).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {d.page_visited || "/"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            d.action === "pix_copy" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {d.action === "pix_copy" ? "Copiou Pix" : "Visita"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {activeDevices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum dispositivo online no momento
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

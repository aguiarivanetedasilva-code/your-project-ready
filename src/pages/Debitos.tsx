import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, AlertTriangle, ChevronDown } from "lucide-react";

const Debitos = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const placa = searchParams.get("placa") || "ABC1D23";

  const [showModal, setShowModal] = useState(true);
  const [selectedDebitos, setSelectedDebitos] = useState<string[]>([]);
  const [expandTotal, setExpandTotal] = useState(false);

  const now = new Date();
  const dia = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const debitos = [
    {
      id: "1",
      placa,
      data: "13/02/2026",
      concessionaria: "CCR RioSP",
      vencimento: "16/02/2026",
      valor: 67.19,
      taxas: 0,
    },
  ];

  const total = debitos
    .filter((d) => selectedDebitos.includes(d.id))
    .reduce((sum, d) => sum + d.valor + d.taxas, 0);

  const toggleDebito = (id: string) => {
    setSelectedDebitos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedDebitos.length === debitos.length) {
      setSelectedDebitos([]);
    } else {
      setSelectedDebitos(debitos.map((d) => d.id));
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-4 flex items-center">
        <button onClick={() => navigate("/")} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground mx-auto pr-10">Débitos</h1>
      </header>

      {/* Hero Banner */}
      <div className="relative h-40">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 flex items-end h-full justify-center pb-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg">🚗</span>
            <span className="text-sm font-bold">Seus veículos:</span>
          </div>
        </div>
      </div>

      {/* Centered Content */}
      <div className="max-w-xl mx-auto px-4">
        {/* Placa Input Display */}
        <div className="-mt-5 relative z-10">
          <div className="bg-background rounded-lg border border-border px-4 py-3 shadow-sm">
            <span className="text-sm font-bold text-foreground tracking-wider">{placa}</span>
          </div>
        </div>

        {/* Débitos Header */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-base font-semibold text-foreground">Débitos</h2>
          <span className="text-xs text-muted-foreground">
            Atualizado em: <span className="font-bold text-foreground">16/02/2026 - {hora}</span>
          </span>
        </div>

        {/* Select All */}
        <label className="flex items-center gap-3 py-3 border-b border-border cursor-pointer">
          <Checkbox
            checked={selectedDebitos.length === debitos.length && debitos.length > 0}
            onCheckedChange={selectAll}
            className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
          />
          <span className="text-sm text-foreground">
            Selecionar {debitos.length} passagens em aberto
          </span>
        </label>

        {/* Debito Items */}
        {debitos.map((debito) => (
          <label
            key={debito.id}
            className="flex items-start gap-3 py-4 border-b border-border cursor-pointer"
          >
            <Checkbox
              checked={selectedDebitos.includes(debito.id)}
              onCheckedChange={() => toggleDebito(debito.id)}
              className="mt-1 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{debito.placa}</span>
                <span className="text-xs border border-destructive text-destructive px-2 py-0.5 rounded font-medium">
                  Venceu em {debito.vencimento}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground">CCR Rodovias</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-destructive">
                  R$ {debito.valor.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-muted-foreground">
                  Multa + Juros: R$ {debito.taxas.toFixed(2).replace(".", ",")} + R$ 0,00
                </span>
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-sm text-foreground">
                  Total: <span className="font-bold">{debito.valor.toFixed(2).replace(".", ",")}</span>
                </span>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Total Footer */}
      <div className="max-w-xl mx-auto px-4 mt-8 mb-10">
        <div className="bg-background rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.1)]">
          <button
            className="w-full flex items-center justify-between px-6 py-4"
            onClick={() => setExpandTotal(!expandTotal)}
          >
            <span className="text-sm text-muted-foreground">Total a pagar:</span>
            <ChevronDown className={`w-5 h-5 text-foreground transition-transform ${expandTotal ? "rotate-180" : ""}`} />
          </button>
          {expandTotal && (
            <div className="px-6 py-2 text-xs text-muted-foreground border-t border-border">
              {debitos
                .filter((d) => selectedDebitos.includes(d.id))
                .map((d) => (
                  <div key={d.id} className="flex justify-between py-1">
                    <span>{d.placa} - {d.data}</span>
                    <span>R$ {(d.valor + d.taxas).toFixed(2).replace(".", ",")}</span>
                  </div>
                ))}
            </div>
          )}
          <div className="border-t border-border" />
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-lg font-bold text-foreground">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
            <Button
              disabled={selectedDebitos.length === 0}
              className="bg-foreground text-primary font-semibold px-6 py-2.5 rounded-full hover:bg-foreground/90 border border-foreground"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>

      {/* Attention Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-background rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-border rounded-full" />
            </div>

            {/* Warning Icon + Title */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-xl font-bold text-destructive uppercase">Atenção</h2>
            </div>

            {/* Subtitle */}
            <p className="text-center text-sm text-foreground mb-4">
              <span className="font-bold">Débitos em aberto encontrados</span>{" "}
              <span className="text-muted-foreground">({placa})</span>
            </p>

            {/* Warning Text */}
            <p className="text-center text-sm text-foreground mb-6">
              <span className="font-bold text-destructive">
                Hoje, {dia} às {hora}
              </span>{" "}
              - Caso não realize o pagamento, a multa será automaticamente encaminhada ao DETRAN.
              Após esse prazo de 15 minutos, o sistema emitirá automaticamente a multa de{" "}
              <span className="font-bold text-destructive">R$ 195,23</span> e{" "}
              <span className="font-bold text-destructive">5 pontos na CNH</span>.
            </p>

            {/* CTB Card */}
            <div className="border-l-4 border-destructive bg-muted rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-foreground mb-2">Art. 209-A - CTB:</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Conforme o Art. 209-A do CTB: "Efetuar o pagamento de pedágio eletrônico fora do
                prazo estabelecido pelo órgão..."
              </p>
              <p className="text-sm text-foreground">
                Infração: <span className="font-bold text-destructive">Grave.</span>
              </p>
              <p className="text-sm text-foreground">
                Penalidade:{" "}
                <span className="font-bold text-destructive">Multa de R$ 195,23.</span>
              </p>
              <p className="text-sm text-foreground">
                Pontuação:{" "}
                <span className="font-bold text-destructive">5 pontos na CNH.</span>
              </p>
            </div>

            {/* Continue Button */}
            <Button
              onClick={() => setShowModal(false)}
              className="w-full h-14 bg-foreground text-background font-bold text-sm uppercase rounded-lg hover:bg-foreground/90"
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Debitos;

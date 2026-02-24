import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PixPagamento = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const placa = searchParams.get("placa") || "";
  const valor = parseFloat(searchParams.get("valor") || "67.19");

  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15 * 60);
  const [pixCode, setPixCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = new Date();

  // Create payment
  useEffect(() => {
    const createPayment = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("create-pix-payment", {
          body: { amount: valor, placa },
        });

        if (fnError) {
          console.error("Edge function error:", fnError);
          setError("Erro ao gerar pagamento. Tente novamente.");
          setLoading(false);
          return;
        }

        if (data?.success && data?.data) {
          const txData = data.data;
          setTransactionId(txData.transactionId || "");
          setPixCode(txData.pixCode || txData.paymentData?.copyPaste || txData.paymentData?.qrCode || "");
          setQrCodeBase64(txData.qrCodeBase64 || txData.paymentData?.qrCodeBase64 || "");
        } else {
          console.error("API response error:", data);
          setError(data?.error || "Erro ao gerar pagamento.");
        }
      } catch (err) {
        console.error("Payment creation failed:", err);
        setError("Erro de conexão. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [valor, placa]);

  // Countdown timer
  useEffect(() => {
    if (loading || paymentStatus === "PAID") return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, paymentStatus]);

  // Poll for payment status every 5 seconds
  useEffect(() => {
    if (!transactionId || paymentStatus === "PAID") return;

    const checkStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke("check-payment-status", {
          body: { transactionId },
        });
        if (data?.success && (data.status === "PAID" || data.status === "COMPLETED")) {
          setPaymentStatus("PAID");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.log("Status check error:", e);
      }
    };

    pollRef.current = setInterval(checkStatus, 5000);
    // Also check immediately
    checkStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [transactionId, paymentStatus]);

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground mx-auto pr-10">Pagamento Pix</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
              <Loader2 className="w-10 h-10 text-foreground animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground mb-2">Gerando código Pix...</p>
            <p className="text-sm text-muted-foreground">Aguarde enquanto preparamos seu pagamento</p>
          </div>
          <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[loading_2.5s_ease-in-out]" />
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 animate-fade-in">
          <p className="text-lg font-bold text-destructive">Erro</p>
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : paymentStatus === "PAID" ? (
        /* ─── PAID STATE ─── */
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Pagamento Confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              O pagamento de <span className="font-bold text-foreground">R$ {valor.toFixed(2).replace(".", ",")}</span> foi recebido.
            </p>
            <p className="text-sm text-muted-foreground">
              Placa: <span className="font-bold text-foreground">{placa}</span>
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full max-w-sm text-center">
            <p className="text-sm font-medium text-green-800">
              ✅ Débito quitado com sucesso
            </p>
            <p className="text-xs text-green-600 mt-1">
              A confirmação foi registrada no sistema.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="mt-4 bg-foreground text-primary font-bold rounded-lg hover:bg-foreground/90"
          >
            Voltar ao início
          </Button>
        </div>
      ) : (
        /* ─── PENDING STATE ─── */
        <div className="max-w-xl mx-auto px-4 mt-6 mb-10 animate-fade-in">
          {/* Resumo */}
          <div className="bg-background rounded-xl border border-border p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Resumo do pedido</h2>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Placa do veículo</span>
              <span className="text-sm font-bold text-foreground">{placa}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-sm text-muted-foreground">Vencimento código Pix</span>
              <span className="text-sm font-bold text-foreground">{now.toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-foreground">Valor do pedido</span>
              <span className="text-lg font-bold text-foreground">R$ {valor.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">Aguardando pagamento...</span>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              Pague em até: <span className="font-bold text-foreground">{formatCountdown(countdown)}</span>
            </p>
            <div className="inline-block bg-background p-4 rounded-xl shadow-sm">
              {qrCodeBase64 ? (
                <img src={qrCodeBase64} alt="QR Code Pix" className="w-[180px] h-[180px]" />
              ) : pixCode ? (
                <QRCodeSVG value={pixCode} size={180} />
              ) : null}
            </div>
          </div>

          {/* Código Pix */}
          {pixCode && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                Copie o código Pix e realize o pagamento no app do seu banco ou carteira digital
              </p>
              <div className="bg-background border border-border rounded-lg p-4 break-all text-xs text-foreground font-mono">
                {pixCode}
              </div>
            </div>
          )}

          {/* Botão copiar */}
          {pixCode && (
            <Button
              onClick={async () => {
                navigator.clipboard.writeText(pixCode);
                toast({ title: "Código Pix copiado!", description: "Cole no app do seu banco para pagar." });

                try {
                  await supabase.functions.invoke("track-device", {
                    body: {
                      placa,
                      userAgent: navigator.userAgent,
                      deviceModel: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                      action: "pix_copy",
                      pageVisited: "/pix",
                    },
                  });
                } catch (e) {
                  console.log('Track device error:', e);
                }
              }}
              className="w-full h-14 bg-foreground text-primary font-bold text-sm rounded-lg hover:bg-foreground/90"
            >
              Copiar código Pix
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PixPagamento;

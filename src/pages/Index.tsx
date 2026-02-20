import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const Index = () => {
  const [placa, setPlaca] = useState("");
  const [termos, setTermos] = useState(false);
  const [privacidade, setPrivacidade] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navbar */}
        <header className="flex items-center justify-between px-8 md:px-16 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-xl italic">P</span>
            </div>
            <div className="leading-tight">
              <p className="font-bold text-lg text-white">Pedágio</p>
              <p className="font-bold text-lg text-primary">Digital</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-white text-sm font-medium hover:text-primary transition-colors">
              Fazer Login
            </a>
            <a href="#" className="text-white text-sm font-medium hover:text-primary transition-colors">
              Perguntas frequentes
            </a>
            <a
              href="#"
              className="border border-white text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-white hover:text-secondary transition-colors"
            >
              Criar Conta
            </a>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center px-8 md:px-16 pb-20">
          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">
            {/* Left - Headline */}
            <div className="flex-1 max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-tight uppercase italic">
                Desfrute de toda a comodidade do pedágio{" "}
                <span className="text-primary not-italic">DIGITAL</span>
              </h1>
              <p className="mt-8 text-white/70 text-base md:text-lg italic">
                Uma nova era para o pedágio começou: ágil e digital como tem que ser.
              </p>
            </div>

            {/* Right - Card */}
            <div className="w-full max-w-md bg-card rounded-2xl p-10 shadow-2xl">
              <p className="text-card-foreground text-lg font-medium mb-8">
                Um <span className="font-bold underline decoration-primary decoration-2 underline-offset-4">único</span>{" "}
                lugar para <span className="font-bold underline decoration-primary decoration-2 underline-offset-4">acessar</span> e{" "}
                <span className="font-bold">controlar</span> seus pagamentos.
              </p>

              <Input
                placeholder="DIGITE SUA PLACA"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                className="mb-7 h-14 bg-muted border border-border text-sm placeholder:text-muted-foreground uppercase tracking-wider rounded-lg"
              />

              <div className="space-y-5 mb-7">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={termos}
                    onCheckedChange={(v) => setTermos(v as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-card-foreground">
                    Aceito os{" "}
                    <a href="#" className="font-semibold underline">
                      Termos e Condições de Uso
                    </a>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={privacidade}
                    onCheckedChange={(v) => setPrivacidade(v as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-card-foreground">
                    Estou ciente da{" "}
                    <a href="#" className="font-semibold underline">
                      Política de Privacidade
                    </a>{" "}
                    e me responsabilizo pela veracidade dos dados.
                  </span>
                </label>
              </div>

              {/* reCAPTCHA mock */}
              <div className="mb-7 border border-border rounded-md p-3 flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox className="h-5 w-5" />
                  <span className="text-sm text-card-foreground">Não sou um robô</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">reCAPTCHA</div>
                  <div className="text-[10px] text-muted-foreground">Privacidade · Termos</div>
                </div>
              </div>

              <Button className="w-full h-14 bg-muted text-card-foreground font-semibold text-sm hover:bg-muted/80 rounded-lg">
                Buscar débitos
              </Button>

              <div className="text-center mt-6">
                <a href="#" className="text-sm font-semibold text-card-foreground underline underline-offset-4 hover:text-primary transition-colors">
                  Começar agora
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;

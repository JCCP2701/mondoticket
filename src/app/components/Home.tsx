import { Link } from "react-router";
import { Shield, Building2, Ticket } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-white">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="mb-12">
          <h1 className="text-6xl font-bold mb-4 tracking-tight">
            Ticket<span className="text-primary">Flow</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Sistema de gestión de boletos vanguardista
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Link
            to="/admin"
            className="group bg-white p-8 rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
          >
            <Shield className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-2">Super Admin</h3>
            <p className="text-sm text-muted-foreground">
              Gestión de partners y comisiones
            </p>
          </Link>

          <Link
            to="/organization"
            className="group bg-white p-8 rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
          >
            <Building2 className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-2">Organización</h3>
            <p className="text-sm text-muted-foreground">
              Panel de eventos y liquidaciones
            </p>
          </Link>

          <Link
            to="/checkout/evt_001"
            className="group bg-white p-8 rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300"
          >
            <Ticket className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-2">Experiencia Usuario</h3>
            <p className="text-sm text-muted-foreground">
              Compra y visualiza tu boleto
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

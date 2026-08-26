import { Settings, Shield, Bell, Database, Lock, Globe, Save } from "lucide-react";

export default function AdminSettings() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuración del Sistema</h1>
                <p className="text-muted-foreground mt-1 text-lg">Administra parámetros globales, seguridad y notificaciones</p>
            </div>

            <div className="space-y-6">
                {/* General Settings */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Parámetros Generales
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Nombre de la Plataforma</label>
                            <input type="text" defaultValue="MondoTicket" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Moneda Principal</label>
                            <select className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
                                <option>MXN - Peso Mexicano</option>
                                <option>USD - Dólar Americano</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Idioma Predeterminado</label>
                            <select className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
                                <option>Español (México)</option>
                                <option>English (US)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground">Huso Horario</label>
                            <select className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none">
                                <option>America/Mexico_City</option>
                                <option>America/New_York</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Security & Access */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-muted-foreground opacity-70">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                        <Shield className="w-5 h-5 text-primary" />
                        Seguridad y Accesos
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Lock className="w-5 h-5" />
                                <div>
                                    <p className="font-bold text-foreground">Autenticación de Dos Factores (2FA)</p>
                                    <p className="text-xs">Requerir 2FA para todos los administradores</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-border rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5" />
                                <div>
                                    <p className="font-bold text-foreground">Registro de Auditoría</p>
                                    <p className="text-xs">Mantener logs de todas las acciones administrativas</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-primary rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button className="px-6 py-3 border border-border rounded-xl font-bold hover:bg-secondary transition-all">
                        Cancelar
                    </button>
                    <button className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}

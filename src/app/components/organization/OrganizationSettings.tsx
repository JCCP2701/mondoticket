import { Settings, Bell, Lock, User, Save, Globe } from "lucide-react";

export default function OrganizationSettings() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl text-foreground">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración de Organización</h1>
                <p className="text-muted-foreground mt-1 text-lg">Administra los detalles de tu cuenta y preferencias de la plataforma</p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Perfil de la Organización
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Nombre Público</label>
                            <input type="text" defaultValue="EventPro México" className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Sitio Web</label>
                            <input type="url" placeholder="https://..." className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Bio / Descripción Corta</label>
                            <textarea rows={3} className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"></textarea>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        Notificaciones
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
                            <div>
                                <p className="font-bold">Alertas de Venta</p>
                                <p className="text-sm text-muted-foreground">Recibir email por cada 100 boletos vendidos</p>
                            </div>
                            <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
                            <div>
                                <p className="font-bold">Reportes Semanales</p>
                                <p className="text-sm text-muted-foreground">Resumen de revenue y ocupación todos los lunes</p>
                            </div>
                            <div className="w-12 h-6 bg-border rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-muted-foreground/60">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                        <Lock className="w-5 h-5 text-primary" />
                        Seguridad
                    </h2>
                    <div className="p-4 bg-secondary/10 rounded-xl border border-border flex items-center gap-3">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">La autenticación de dos factores es gestionada por el Administrador Global.</span>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button className="px-8 py-3 border border-border rounded-xl font-bold hover:bg-secondary transition-all">
                        Descartar
                    </button>
                    <button className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
}

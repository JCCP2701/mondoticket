import { Link, useNavigate } from "react-router";
import { ArrowLeft, Building2, User, Mail, Phone, DollarSign, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function CreateOrganization() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizationName: "",
    legalName: "",
    rfc: "",
    address: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    feePercentage: "10",
    paymentTerms: "15",
    contractNotes: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    const newErrors: { [key: string]: boolean } = {};
    const requiredFields = [
      "organizationName",
      "legalName",
      "rfc",
      "address",
      "contactName",
      "contactEmail",
      "contactPhone",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = true;
      }
    });

    // Validar email
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowPreview(false);
      return;
    }

    setShowPreview(true);
  };

  const handleConfirm = () => {
    const org = {
      name: formData.organizationName,
      legalName: formData.legalName,
      rfc: formData.rfc,
      address: formData.address,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      feePercentage: parseFloat(formData.feePercentage),
      paymentTerms: parseInt(formData.paymentTerms),
      contractNotes: formData.contractNotes,
    };

    import("../../services/dataService").then(({ dataService }) => {
      dataService.saveOrganization(org);
      alert(`Organización "${formData.organizationName}" registrada exitosamente`);
      navigate("/admin");
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center gap-4">
          <Link
            to="/admin"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Alta de Nueva Organización
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro de partner y convenio comercial
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8">
              {/* Organization Information */}
              <div className="mb-8">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Información de la Organización
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Nombre Comercial *
                    </label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) =>
                        setFormData({ ...formData, organizationName: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.organizationName ? "border-red-500" : "border-border"
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                      placeholder="Ej. EventPro México"
                    />
                    {errors.organizationName && (
                      <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) =>
                        setFormData({ ...formData, legalName: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.legalName ? "border-red-500" : "border-border"
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                      placeholder="Ej. EventPro México S.A. de C.V."
                    />
                    {errors.legalName && (
                      <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      RFC *
                    </label>
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) =>
                        setFormData({ ...formData, rfc: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.rfc ? "border-red-500" : "border-border"
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                      placeholder="Ej. EPM950101ABC"
                      maxLength={13}
                    />
                    {errors.rfc && (
                      <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Dirección Fiscal *
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.address ? "border-red-500" : "border-border"
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
                      placeholder="Calle, número, colonia, CP, ciudad, estado"
                    />
                    {errors.address && (
                      <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-8 pb-8 border-b border-border">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Contacto Principal
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData({ ...formData, contactName: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.contactName ? "border-red-500" : "border-border"
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                      placeholder="Ej. Juan Pérez García"
                    />
                    {errors.contactName && (
                      <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, contactEmail: e.target.value })
                        }
                        className={`w-full px-4 py-3 rounded-xl border-2 ${errors.contactEmail ? "border-red-500" : "border-border"
                          } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                        placeholder="correo@empresa.com"
                      />
                      {errors.contactEmail && (
                        <p className="text-xs text-red-500 mt-1">
                          Email válido requerido
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, contactPhone: e.target.value })
                        }
                        className={`w-full px-4 py-3 rounded-xl border-2 ${errors.contactPhone ? "border-red-500" : "border-border"
                          } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                        placeholder="+52 55 1234 5678"
                      />
                      {errors.contactPhone && (
                        <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial Agreement */}
              <div className="mb-8">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Convenio Comercial
                </h3>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Fee por Ticket (%)
                      </label>
                      <input
                        type="number"
                        value={formData.feePercentage}
                        onChange={(e) =>
                          setFormData({ ...formData, feePercentage: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        TicketFlow cobrará este % sobre cada boleto vendido
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Plazo de Pago (días)
                      </label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentTerms: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="7">7 días</option>
                        <option value="15">15 días</option>
                        <option value="30">30 días</option>
                        <option value="45">45 días</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tiempo para liquidar el fee a TicketFlow
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notas del Convenio
                    </label>
                    <textarea
                      value={formData.contractNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, contractNotes: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Condiciones especiales, descuentos, cláusulas adicionales..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Vista Previa del Convenio
                </button>
                <Link
                  to="/admin"
                  className="px-8 py-4 bg-secondary rounded-xl font-semibold hover:bg-secondary/70 transition-all"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            {showPreview ? (
              <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold">Resumen del Convenio</h3>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="pb-4 border-b border-border">
                    <p className="text-xs text-muted-foreground mb-1">Organización</p>
                    <p className="font-semibold">{formData.organizationName}</p>
                    <p className="text-sm text-muted-foreground">{formData.legalName}</p>
                    <p className="text-sm text-muted-foreground">RFC: {formData.rfc}</p>
                  </div>

                  <div className="pb-4 border-b border-border">
                    <p className="text-xs text-muted-foreground mb-1">Contacto</p>
                    <p className="font-medium">{formData.contactName}</p>
                    <p className="text-sm text-muted-foreground">{formData.contactEmail}</p>
                    <p className="text-sm text-muted-foreground">{formData.contactPhone}</p>
                  </div>

                  <div className="pb-4 border-b border-border">
                    <p className="text-xs text-muted-foreground mb-1">Términos Comerciales</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Fee por ticket:</span>
                      <span className="font-bold text-primary text-lg">
                        {formData.feePercentage}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Plazo de pago:</span>
                      <span className="font-medium">{formData.paymentTerms} días</span>
                    </div>
                  </div>

                  {formData.contractNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas</p>
                      <p className="text-sm">{formData.contractNotes}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
                >
                  Confirmar y Registrar
                </button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Se generará un ID único y se enviará confirmación por email
                </p>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl border border-border p-6 sticky top-24">
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Completa el formulario para ver la vista previa del convenio
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

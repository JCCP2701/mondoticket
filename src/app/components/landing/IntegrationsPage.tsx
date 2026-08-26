import LegalPageLayout from './LegalPageLayout';

export default function IntegrationsPage() {
    return (
        <LegalPageLayout title="Integraciones" updatedAt="25 de agosto de 2026">
            <p>
                MondoTicket se conecta con las herramientas que ya usas para cobrar y entregar boletos.
                Aquí describimos, con honestidad, las integraciones que están disponibles hoy en la
                Plataforma.
            </p>

            <h2>1. Pagos con OrkestaPay</h2>
            <p>
                Toda transacción en MondoTicket se procesa a través de OrkestaPay, nuestra única pasarela de
                pagos integrada. Gracias al checkout hospedado de OrkestaPay, tus compradores pueden pagar con:
            </p>
            <ul>
                <li>Tarjeta de crédito o débito.</li>
                <li>SPEI (transferencia bancaria interbancaria).</li>
                <li>Efectivo en tiendas de conveniencia participantes (a través de OXXO).</li>
            </ul>
            <p>
                No almacenamos los datos de tu tarjeta en nuestros servidores: OrkestaPay se encarga del
                procesamiento y cumplimiento de seguridad de pagos (PCI DSS).
            </p>

            <h2>2. Google Wallet</h2>
            <p>
                Una vez confirmada tu compra, puedes guardar tu boleto directamente en Google Wallet desde
                tu cuenta. El boleto guardado se mantiene actualizado y conserva su código QR de acceso,
                por lo que puedes presentarlo desde tu teléfono sin necesidad de imprimirlo.
            </p>

            <h2>3. Apple Wallet</h2>
            <p>
                El soporte para Apple Wallet está actualmente en construcción y todavía no está disponible
                para el público. Estamos trabajando en llevar esta misma experiencia a los usuarios de
                iPhone; publicaremos un aviso en esta página en cuanto esté lista.
            </p>

            <h2>4. ¿Buscas otra integración?</h2>
            <p>
                Si tu organización necesita conectar MondoTicket con otro sistema (control de acceso,
                facturación, CRM u otra herramienta), escríbenos a{' '}
                <a href="mailto:soporte@mondoticket.com">soporte@mondoticket.com</a> y cuéntanos tu caso.
                Evaluamos cada solicitud de forma individual, pero no podemos garantizar que una
                integración específica se construya.
            </p>
        </LegalPageLayout>
    );
}

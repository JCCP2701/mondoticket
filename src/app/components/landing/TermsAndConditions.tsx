import LegalPageLayout from './LegalPageLayout';

export default function TermsAndConditions() {
    return (
        <LegalPageLayout title="Términos y Condiciones" updatedAt="16 de julio de 2026">
            <p>
                Estos Términos y Condiciones regulan el uso de MondoTicket (la "Plataforma") para la
                compra, venta y gestión de boletos a eventos. Al crear una cuenta o comprar un boleto,
                aceptas los términos descritos a continuación.
            </p>

            <h2>1. Sobre la Plataforma</h2>
            <p>
                MondoTicket conecta a organizaciones que producen eventos con personas que desean asistir
                a ellos. Actuamos como intermediario tecnológico: procesamos la compra, emitimos el boleto
                digital y validamos el inventario disponible, pero cada evento es organizado y operado por la
                organización que lo publica en la Plataforma.
            </p>

            <h2>2. Cuentas de usuario</h2>
            <ul>
                <li>Eres responsable de la confidencialidad de tu contraseña y de la actividad realizada
                    desde tu cuenta.</li>
                <li>Debes proporcionar información verídica al registrarte y al realizar una compra.</li>
                <li>Podemos activar la autenticación de dos factores como medida de seguridad adicional en
                    tu cuenta.</li>
            </ul>

            <h2>3. Compra de boletos</h2>
            <ul>
                <li>Cada boleto es único y corresponde a un lugar específico o a una unidad de inventario
                    disponible al momento de la compra; el inventario se descuenta de forma automática e
                    irreversible al confirmarse el pago.</li>
                <li>El precio mostrado al momento de la compra es el precio final salvo que se indique lo
                    contrario.</li>
                <li>El boleto digital, junto con su código QR, es tu comprobante de acceso al evento; eres
                    responsable de resguardarlo y no compartirlo públicamente.</li>
            </ul>

            <h2>4. Reembolsos y cortesías</h2>
            <p>
                Los reembolsos son gestionados directamente por la organización responsable del evento,
                conforme a sus propias políticas de cancelación o reprogramación. Un boleto reembolsado se
                marca como inválido de forma inmediata y dejará de ser aceptado en el punto de acceso al
                evento. Los boletos de cortesía emitidos por una organización están sujetos a las mismas
                condiciones de validez que un boleto pagado.
            </p>

            <h2>5. Venta en taquilla</h2>
            <p>
                Los boletos vendidos físicamente en el punto de venta de una organización ("taquilla") se
                descuentan del mismo inventario disponible para la venta digital en tiempo real. Una vez
                completada la venta, el boleto queda sujeto a las mismas reglas de validez y reembolso que
                cualquier otro boleto.
            </p>

            <h2>6. Responsabilidad de las organizaciones</h2>
            <p>
                Cada organización es responsable del contenido, la fecha, el lugar y la realización del
                evento que publica, así como de cumplir con los permisos y condiciones necesarias para su
                operación. MondoTicket no es responsable por la cancelación, cambio o desempeño de un
                evento, más allá de reflejar correctamente el estado del inventario y facilitar el proceso de
                reembolso cuando la organización lo autorice.
            </p>

            <h2>7. Conducta del usuario</h2>
            <p>
                No está permitido usar la Plataforma para revender boletos fuera de los mecanismos que ella
                misma ofrece, intentar vulnerar el sistema de reserva de asientos o inventario, ni suplantar
                la identidad de otra persona al realizar una compra.
            </p>

            <h2>8. Modificaciones</h2>
            <p>
                Podemos actualizar estos Términos y Condiciones en cualquier momento. El uso continuado de la
                Plataforma después de una actualización constituye tu aceptación de los términos vigentes.
            </p>

            <h2>9. Contacto</h2>
            <p>
                Para dudas sobre estos términos, escríbenos a{' '}
                <a href="mailto:soporte@mondoticket.com">soporte@mondoticket.com</a>.
            </p>
        </LegalPageLayout>
    );
}

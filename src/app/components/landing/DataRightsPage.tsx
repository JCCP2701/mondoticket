import LegalPageLayout from './LegalPageLayout';

export default function DataRightsPage() {
    return (
        <LegalPageLayout title="Tus Derechos sobre tus Datos" updatedAt="25 de agosto de 2026">
            <p>
                MondoTicket opera en México y trata tus datos personales conforme a la Ley Federal de
                Protección de Datos Personales en Posesión de los Particulares. Aunque no somos una empresa
                sujeta al Reglamento General de Protección de Datos de la Unión Europea (GDPR) salvo que
                atendamos usuarios dentro de la UE, en esta página describimos tus derechos sobre tus datos
                en términos que resultan equivalentes en espíritu a los que reconoce el GDPR: acceso,
                rectificación, eliminación y portabilidad.
            </p>

            <h2>1. Derecho de Acceso</h2>
            <p>
                Puedes solicitar en cualquier momento una copia de los datos personales que tenemos sobre
                ti, incluyendo tus datos de cuenta, tu historial de compras y los boletos asociados a tu
                perfil.
            </p>

            <h2>2. Derecho de Rectificación</h2>
            <p>
                Si alguno de tus datos personales es inexacto o está desactualizado (por ejemplo, tu
                nombre, correo o teléfono), puedes solicitar que lo corrijamos.
            </p>

            <h2>3. Derecho de Cancelación (Eliminación)</h2>
            <p>
                Puedes solicitar la eliminación de tus datos personales y de tu cuenta cuando ya no exista
                una razón legal para conservarlos. Al igual que se describe en nuestro Aviso de Privacidad,
                esto está sujeto a que no existan boletos u órdenes pendientes de resolución, así como a
                las obligaciones fiscales que debamos cumplir sobre tu historial de compras.
            </p>

            <h2>4. Derecho de Oposición</h2>
            <p>
                Puedes oponerte a que tratemos tus datos personales para fines específicos, cuando exista
                una causa legítima para ello, así como revocar el consentimiento que nos hayas otorgado
                previamente.
            </p>

            <h2>5. Portabilidad de datos</h2>
            <p>
                Cuando sea técnicamente posible, puedes solicitar que te entreguemos tus datos personales
                en un formato estructurado y de uso común, para que puedas transferirlos a otro servicio si
                así lo deseas.
            </p>

            <h2>6. Cómo ejercer estos derechos</h2>
            <p>
                Para ejercer cualquiera de estos derechos (los conocidos en México como derechos ARCO:
                Acceso, Rectificación, Cancelación y Oposición), escríbenos a{' '}
                <a href="mailto:privacidad@mondoticket.com">privacidad@mondoticket.com</a>. Atenderemos tu
                solicitud dentro de los plazos que marca la ley aplicable y te pediremos la información
                necesaria para verificar tu identidad antes de procesarla.
            </p>
        </LegalPageLayout>
    );
}

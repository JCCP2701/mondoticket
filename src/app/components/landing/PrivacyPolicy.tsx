import LegalPageLayout from './LegalPageLayout';

export default function PrivacyPolicy() {
    return (
        <LegalPageLayout title="Aviso de Privacidad" updatedAt="16 de julio de 2026">
            <p>
                En TicketBlessing ("nosotros", "la Plataforma") respetamos tu privacidad y nos comprometemos
                a proteger los datos personales que compartes con nosotros al comprar boletos, crear una
                cuenta o utilizar cualquiera de nuestros servicios. Este aviso describe qué información
                recabamos, para qué la usamos y qué derechos tienes sobre ella, conforme a la Ley Federal de
                Protección de Datos Personales en Posesión de los Particulares.
            </p>

            <h2>1. Datos que recabamos</h2>
            <ul>
                <li>Datos de identificación y contacto: nombre completo, correo electrónico y teléfono.</li>
                <li>Datos de la cuenta: contraseña (almacenada de forma cifrada) y, si activas la
                    autenticación de dos factores, la clave de tu aplicación de autenticación.</li>
                <li>Datos de compra: boletos adquiridos, tipo de acceso, asiento asignado (cuando aplica),
                    monto pagado e historial de reembolsos o cortesías.</li>
                <li>Datos técnicos: dirección IP, tipo de dispositivo y registros de acceso, utilizados
                    únicamente para mantener la seguridad de la Plataforma.</li>
            </ul>

            <h2>2. Para qué usamos tus datos</h2>
            <ul>
                <li>Procesar la compra, emisión y validación de tus boletos, incluyendo el código QR de
                    acceso a cada evento.</li>
                <li>Enviarte confirmaciones de compra, cambios en el evento o notificaciones sobre
                    reembolsos.</li>
                <li>Verificar tu identidad al iniciar sesión y proteger tu cuenta mediante autenticación de
                    dos factores.</li>
                <li>Permitir que el organizador del evento al que asistes verifique la validez de tu boleto
                    en el punto de acceso.</li>
                <li>Cumplir con obligaciones legales y fiscales relacionadas con la venta de boletos.</li>
            </ul>

            <h2>3. Con quién compartimos tus datos</h2>
            <p>
                Compartimos los datos estrictamente necesarios de tu compra (nombre, boleto y estado de
                validez) con la organización responsable del evento que compraste, ya que es quien opera el
                acceso físico al recinto. No vendemos ni rentamos tus datos personales a terceros con fines
                de mercadotecnia. Utilizamos proveedores de infraestructura (como servicios de base de datos
                y autenticación) exclusivamente para operar la Plataforma, bajo acuerdos de confidencialidad.
            </p>

            <h2>4. Tus derechos (ARCO)</h2>
            <p>
                Puedes solicitar en cualquier momento el Acceso, Rectificación, Cancelación u Oposición al
                tratamiento de tus datos personales, así como revocar tu consentimiento, escribiendo a{' '}
                <a href="mailto:privacidad@ticketblessing.com">privacidad@ticketblessing.com</a>. Atenderemos
                tu solicitud dentro de los plazos que marca la ley aplicable.
            </p>

            <h2>5. Conservación de datos</h2>
            <p>
                Conservamos tus datos de compra mientras tu cuenta permanezca activa y durante el tiempo
                adicional necesario para cumplir obligaciones fiscales o resolver disputas relacionadas con
                reembolsos. Puedes solicitar la eliminación de tu cuenta en cualquier momento, sujeto a que no
                existan boletos u órdenes pendientes de resolución.
            </p>

            <h2>6. Cookies y tecnologías similares</h2>
            <p>
                Usamos cookies estrictamente necesarias para mantener tu sesión iniciada y recordar tus
                preferencias de navegación. No utilizamos cookies de rastreo publicitario de terceros.
            </p>

            <h2>7. Cambios a este aviso</h2>
            <p>
                Podemos actualizar este aviso de privacidad para reflejar cambios en nuestras prácticas o en
                la legislación aplicable. Publicaremos cualquier cambio en esta misma página junto con la
                fecha de su última actualización.
            </p>

            <h2>8. Contacto</h2>
            <p>
                Si tienes dudas sobre este aviso de privacidad, escríbenos a{' '}
                <a href="mailto:privacidad@ticketblessing.com">privacidad@ticketblessing.com</a>.
            </p>
        </LegalPageLayout>
    );
}

import LegalPageLayout from './LegalPageLayout';

export default function SecurityPage() {
    return (
        <LegalPageLayout title="Seguridad" updatedAt="25 de agosto de 2026">
            <p>
                La seguridad de tus datos, tus boletos y tus pagos es una prioridad para MondoTicket. Aquí
                explicamos, en términos claros, las medidas técnicas reales que protegen la plataforma.
            </p>

            <h2>Autenticación de doble factor (MFA)</h2>
            <p>
                Las cuentas del sistema interno (Super Administrador, Organización, Taquilla, Validador y
                Broker) pueden proteger su inicio de sesión con verificación en dos pasos mediante una
                aplicación de autenticación (como Google Authenticator o Authy). Además de tu contraseña, se
                te pedirá un código temporal la primera vez que entres desde un dispositivo nuevo, lo que
                reduce drásticamente el riesgo de que alguien acceda a tu cuenta aunque conozca tu contraseña.
            </p>

            <h2>Pagos procesados con OrkestaPay</h2>
            <p>
                Todos los pagos con tarjeta, SPEI y efectivo se procesan a través de OrkestaPay, nuestra
                pasarela de pagos. MondoTicket nunca almacena directamente los datos de tu tarjeta en sus
                propios servidores: la información sensible de pago se maneja exclusivamente dentro de la
                infraestructura segura de OrkestaPay.
            </p>

            <h2>Un código QR que se invalida al usarse</h2>
            <p>
                Cada boleto tiene un único código QR que permanece igual en la app, el correo, el formato
                impreso o tu wallet. Su protección no depende de que el código cambie, sino de que se "quema"
                de forma permanente en el instante exacto en que se escanea por primera vez en la entrada del
                evento. Esto significa que una foto o captura de pantalla de tu boleto deja de servir de
                inmediato después de ese primer ingreso válido, incluso si alguien más intenta usarla después.
            </p>

            <h2>Seguridad a nivel de base de datos (Row Level Security)</h2>
            <p>
                Nuestra base de datos aplica políticas de seguridad a nivel de fila (Row Level Security) en
                Postgres. En la práctica, esto quiere decir que cada organización solo puede ver y modificar
                sus propios eventos, boletos y datos — la separación entre organizaciones está garantizada
                directamente en la base de datos, no solo en la interfaz que ves en pantalla.
            </p>

            <h2>Conexión cifrada en toda la plataforma</h2>
            <p>
                Toda la comunicación entre tu navegador o dispositivo y los servidores de MondoTicket viaja
                cifrada mediante HTTPS, tanto al navegar el sitio como al comprar boletos o administrar tu
                cuenta u organización.
            </p>

            <h2>Modo sin conexión con sincronización segura</h2>
            <p>
                El escaneo de boletos en la entrada de un evento puede prepararse con anticipación para
                funcionar sin depender de la red del recinto. Si la señal se cae durante el evento, el
                dispositivo sigue validando boletos localmente y, al recuperar conexión, sincroniza los
                resultados con el servidor, detectando y dejando registrado cualquier conflicto (por ejemplo,
                si dos dispositivos desconectados escanearon el mismo boleto) para que el organizador lo
                revise.
            </p>

            <h2>Nuestro enfoque</h2>
            <p>
                Seguimos las mejores prácticas de la industria en el diseño y operación de la plataforma. No
                contamos con certificaciones formales de seguridad de terceros en este momento, y preferimos
                ser transparentes al respecto en lugar de sugerir algo que no podemos respaldar.
            </p>

            <h2>Reporte de vulnerabilidades</h2>
            <p>
                Si encontraste una posible vulnerabilidad de seguridad en MondoTicket, te pedimos que nos lo
                reportes de forma responsable antes de divulgarlo públicamente, escribiendo a{' '}
                <a href="mailto:seguridad@mondoticket.com">seguridad@mondoticket.com</a> con el mayor detalle
                posible (pasos para reproducirlo, impacto potencial). Actualmente no contamos con un programa
                formal de recompensas monetarias, pero agradecemos y damos seguimiento personal a todo reporte
                responsable que recibimos.
            </p>
        </LegalPageLayout>
    );
}

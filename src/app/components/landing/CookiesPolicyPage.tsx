import LegalPageLayout from './LegalPageLayout';

export default function CookiesPolicyPage() {
    return (
        <LegalPageLayout title="Política de Cookies" updatedAt="25 de agosto de 2026">
            <p>
                Las cookies y el almacenamiento local del navegador son pequeños fragmentos de información
                que un sitio web guarda en tu dispositivo para recordar datos entre visitas o mientras usas
                la aplicación, como mantener tu sesión iniciada o recordar una preferencia de interfaz. En
                MondoTicket usamos estas tecnologías de forma limitada y exclusivamente funcional.
            </p>

            <h2>1. Qué usamos exactamente</h2>
            <ul>
                <li>
                    <strong>Sesión de inicio de sesión:</strong> guardamos un token de autenticación en el
                    almacenamiento local (localStorage) de tu navegador para mantener tu sesión iniciada y
                    evitar que tengas que volver a ingresar tus credenciales cada vez que visitas la
                    Plataforma.
                </li>
                <li>
                    <strong>Preferencia del menú lateral:</strong> si tienes acceso al panel interno de
                    MondoTicket, guardamos si el menú lateral (sidebar) está colapsado o expandido, como una
                    preferencia de visualización personal.
                </li>
                <li>
                    <strong>Escaneo de boletos sin conexión:</strong> si tienes el rol de Validador, la
                    Plataforma guarda información de escaneo en el almacenamiento del navegador (IndexedDB)
                    para que puedas seguir validando boletos en la puerta aunque se pierda la conexión a
                    internet, y sincronizar esa información automáticamente cuando la conexión se
                    restablezca.
                </li>
            </ul>

            <h2>2. Qué NO usamos</h2>
            <p>
                No utilizamos cookies ni tecnologías de rastreo con fines de publicidad. No compartimos
                estos datos con redes publicitarias ni con herramientas de analítica de terceros: no
                usamos Google Analytics, Meta Pixel, Hotjar, Mixpanel ni ningún servicio similar. Todo lo
                que almacenamos en tu navegador sirve exclusivamente para que la Plataforma funcione
                correctamente para ti.
            </p>

            <h2>3. Cómo puedes borrar estos datos</h2>
            <p>
                Puedes eliminar en cualquier momento las cookies y los datos almacenados por MondoTicket
                desde la configuración de tu navegador, generalmente en la sección de "Privacidad y
                seguridad" o "Datos del sitio". Ten en cuenta que, al borrar estos datos, se cerrará tu
                sesión de forma automática y, si eres Validador, es posible que pierdas los datos de
                escaneo aún no sincronizados.
            </p>

            <h2>4. Contacto</h2>
            <p>
                Si tienes dudas sobre esta política de cookies, escríbenos a{' '}
                <a href="mailto:privacidad@mondoticket.com">privacidad@mondoticket.com</a>.
            </p>
        </LegalPageLayout>
    );
}

import LegalPageLayout from './LegalPageLayout';

export default function ApiDocsPage() {
    return (
        <LegalPageLayout title="API para Desarrolladores" updatedAt="25 de agosto de 2026">
            <p>
                Queremos ser transparentes: MondoTicket todavía no cuenta con una API pública
                documentada para que equipos externos integren su propio software con la Plataforma. No
                existen hoy llaves de API, endpoints públicos, webhooks ni un SDK oficial para
                desarrolladores.
            </p>

            <h2>1. Lo que estamos construyendo</h2>
            <p>
                Estamos trabajando en habilitar acceso programático para integraciones a la medida, pensado
                para organizaciones y socios que necesitan conectar MondoTicket con sus propios sistemas.
                Preferimos lanzar esta capacidad cuando esté lista y sea segura, en lugar de publicar
                documentación de algo que aún no existe.
            </p>

            <h2>2. Acceso anticipado</h2>
            <p>
                Si tu organización o equipo de desarrollo está interesado en acceso anticipado a esta
                funcionalidad, escríbenos a{' '}
                <a href="mailto:api@mondoticket.com">api@mondoticket.com</a> contándonos qué te gustaría
                integrar. Nos pondremos en contacto conforme avancemos con el desarrollo.
            </p>

            <h2>3. Mientras tanto</h2>
            <p>
                Si necesitas una integración específica hoy (por ejemplo, con OrkestaPay o Google Wallet, que
                ya están disponibles dentro de la Plataforma), visita nuestra página de{' '}
                <a href="/integraciones">Integraciones</a> o escríbenos directamente a{' '}
                <a href="mailto:soporte@mondoticket.com">soporte@mondoticket.com</a>.
            </p>
        </LegalPageLayout>
    );
}

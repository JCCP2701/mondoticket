import LegalPageLayout from './LegalPageLayout';

export default function CareersPage() {
    return (
        <LegalPageLayout title="Empleos" updatedAt="25 de agosto de 2026">
            <p>
                MondoTicket es un equipo de producto que construye la plataforma de venta de boletos que usan
                organizadores de eventos en México. Así es como trabajamos.
            </p>

            <h2>Cómo trabajamos</h2>
            <ul>
                <li>
                    <strong>Remoto:</strong> el equipo trabaja de forma distribuida, con comunicación clara y
                    asincrónica como base para no depender de estar todos conectados al mismo tiempo.
                </li>
                <li>
                    <strong>Autonomía:</strong> preferimos dar contexto y objetivos claros, y confiar en que
                    cada persona decide cómo llegar a ellos, en lugar de microgestionar cada tarea.
                </li>
                <li>
                    <strong>Enfoque en el cliente:</strong> las decisiones de producto parten de problemas
                    reales de organizadores de eventos —fraude, sobreventa, operación de taquilla— y no de
                    funcionalidades por moda.
                </li>
                <li>
                    <strong>Responsabilidad sobre el resultado:</strong> valoramos más resolver bien un
                    problema de principio a fin que repartir tareas pequeñas sin dueño claro.
                </li>
            </ul>

            <h2>Vacantes actuales</h2>
            <p>
                Actualmente no tenemos vacantes abiertas, pero si crees que puedes aportar, escríbenos a{' '}
                <a href="mailto:talento@mondoticket.com">talento@mondoticket.com</a> y con gusto revisamos tu
                perfil.
            </p>
        </LegalPageLayout>
    );
}

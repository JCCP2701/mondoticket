import LegalPageLayout from './LegalPageLayout';

export default function AboutPage() {
    return (
        <LegalPageLayout title="Sobre MondoTicket" updatedAt="25 de agosto de 2026">
            <p>
                MondoTicket es una plataforma mexicana de venta de boletos para eventos. Ayudamos a
                organizadores a poner en línea sus eventos, vender boletos y controlar el acceso el día del
                evento, todo desde un mismo lugar, sin depender de hojas de cálculo, mensajes por WhatsApp o
                procesos manuales en taquilla.
            </p>

            <h2>El problema que resolvemos</h2>
            <p>
                Organizar un evento en México —desde un concierto o una obra de teatro hasta una conferencia
                o un torneo deportivo— implica vender boletos por varios canales a la vez: en línea, por
                transferencia, en taquilla física el mismo día. Cuando esos canales no están conectados, es
                fácil vender el mismo lugar dos veces, perder el control del aforo o no tener forma de
                distinguir un boleto legítimo de uno falsificado en la entrada.
            </p>
            <p>
                MondoTicket existe para que los organizadores tengan un solo inventario de boletos,
                actualizado en tiempo real, sin importar si la venta ocurrió en la web o en una caja física.
            </p>

            <h2>Qué hace la plataforma</h2>
            <ul>
                <li>
                    <strong>Venta en línea y en taquilla:</strong> los boletos vendidos por internet y los
                    vendidos presencialmente descuentan del mismo inventario, así que nunca se sobrevende un
                    evento.
                </li>
                <li>
                    <strong>Mapas de asientos:</strong> los organizadores pueden definir secciones, filas y
                    asientos numerados para que el comprador elija su lugar exacto, o usar boletaje general
                    cuando el evento no requiere asiento asignado.
                </li>
                <li>
                    <strong>Roles por organización:</strong> cada organizador puede invitar a su equipo con
                    distintos niveles de acceso —por ejemplo, quien vende, quien administra el evento y quien
                    escanea boletos en el acceso— sin compartir una sola cuenta entre todos.
                </li>
                <li>
                    <strong>Códigos QR antifraude:</strong> cada boleto se emite con un código QR único que se
                    valida en el momento del acceso, lo que evita que un mismo boleto se use más de una vez o
                    que circulen copias falsificadas.
                </li>
                <li>
                    <strong>Pagos con OrkestaPay:</strong> los cobros a los compradores se procesan mediante
                    OrkestaPay, lo que permite pagos con tarjeta de
                    forma segura sin que MondoTicket almacene los datos financieros del comprador.
                </li>
                <li>
                    <strong>Autenticación de dos factores (MFA):</strong> las cuentas de organizadores y su
                    equipo pueden protegerse con un segundo factor de autenticación, reduciendo el riesgo de
                    accesos no autorizados a la administración de un evento.
                </li>
            </ul>

            <h2>Para quién trabajamos</h2>
            <p>
                Trabajamos con organizadores de eventos en México que necesitan vender boletos en línea y en
                taquilla sin fricción: desde recintos y promotores de espectáculos hasta organizadores de
                conferencias, torneos y eventos comunitarios. Nuestro objetivo es que puedan enfocarse en su
                evento, mientras la plataforma se encarga de la venta, el control de acceso y la prevención
                de fraude.
            </p>
        </LegalPageLayout>
    );
}

import LegalPageLayout from './LegalPageLayout';

export default function HelpCenterPage() {
    return (
        <LegalPageLayout title="Centro de Ayuda" updatedAt="25 de agosto de 2026">
            <p>
                Aquí encontrarás respuestas a las preguntas más comunes sobre MondoTicket, organizadas por
                tema. Si no encuentras lo que buscas, al final de esta página te decimos cómo contactarnos.
            </p>

            <h2>Comprar un boleto</h2>

            <p><strong>¿Necesito crear una cuenta con contraseña para comprar?</strong></p>
            <p>
                No. Al comprar como invitado escribes tu nombre, correo y teléfono, y te enviamos un código
                de 6 dígitos a tu correo para verificar que eres tú. Con ese código puedes avanzar a elegir
                tus boletos y pagar, sin necesidad de crear ni recordar ninguna contraseña. Si ya habías
                comprado antes con ese mismo correo, el código simplemente abre tu cuenta existente.
            </p>

            <p><strong>No me llegó el código de verificación, ¿qué hago?</strong></p>
            <p>
                Revisa tu carpeta de spam o promociones. Si sigue sin llegar, usa el botón "Reenviar código"
                en la misma pantalla; por seguridad hay un tiempo mínimo de espera entre cada solicitud para
                evitar abuso.
            </p>

            <p><strong>Elegí un boleto o asiento pero no terminé la compra, ¿lo pierdo?</strong></p>
            <p>
                Depende del paso en el que te quedaste. Si solo seleccionaste el asiento pero nunca diste clic
                en "Finalizar Compra", se libera automáticamente después de 5 minutos sin actividad (o antes,
                si cierras la pestaña). Si ya llegaste a la pantalla de pago pero no la completaste, tu boleto
                se mantiene apartado durante el tiempo de reserva que definió el organizador del evento (por
                defecto 72 horas, aunque puede variar de 5 minutos a 90 días) — pensado para cubrir pagos en
                efectivo o SPEI, que pueden tardar en confirmarse. Si ya no te interesa, puedes cancelar desde
                esa misma pantalla de pago para liberar el boleto de inmediato.
            </p>

            <p><strong>Pagué pero no veo mi boleto todavía, ¿pasó algo malo?</strong></p>
            <p>
                Si pagaste con tarjeta, tu boleto normalmente aparece de inmediato. Si pagaste con SPEI o en
                efectivo (por ejemplo en OXXO), la confirmación del banco o la tienda puede tardar un poco —
                verás un mensaje de "Confirmando tu pago..." con un botón para volver a checar. En cuanto se
                confirme el pago, tu boleto con su código QR aparece automáticamente, sin que tengas que hacer
                nada más.
            </p>

            <p><strong>¿Puedo elegir mi asiento exacto?</strong></p>
            <p>
                Solo si el tipo de boleto tiene mapa de asientos configurado por el organizador. En ese caso,
                primero indicas cuántos boletos quieres y luego aparece el mapa del recinto para que elijas
                exactamente esos asientos. Si el tipo de boleto no tiene mapa, solo eliges la cantidad.
            </p>

            <h2>Mi cuenta y mis boletos</h2>

            <p><strong>¿Dónde veo todos mis boletos?</strong></p>
            <p>
                En "Mi Wallet", accesible desde el ícono de tu cuenta. Ahí ves tanto tus eventos próximos como
                los pasados, con su código QR, su estado (Válido, Usado o Reembolsado), y un acceso directo
                para ver el boleto completo.
            </p>

            <p><strong>¿Puedo guardar mi boleto en Google Wallet o Apple Wallet?</strong></p>
            <p>
                Desde el detalle de tu boleto puedes dar clic en "Google Wallet" para guardarlo directamente
                con el diseño de marca de MondoTicket; el código QR que se guarda ahí es exactamente el mismo
                que ves en la app. El soporte para Apple Wallet todavía está en construcción.
            </p>

            <p><strong>¿Mi código QR cambia cada cierto tiempo, como un token de seguridad?</strong></p>
            <p>
                No. Tu código QR es siempre el mismo, ya sea en la app, en tu correo o guardado en tu wallet.
                No necesitas recargar la pantalla ni preocuparte de que cambie: simplemente muéstralo en el
                acceso del evento. La protección contra copias no viene de que el código cambie, sino de que
                se invalida permanentemente en el instante en que se escanea por primera vez — por eso no
                debes compartirlo con nadie antes de llegar al evento.
            </p>

            <h2>Organizadores</h2>

            <p><strong>¿Cómo doy de alta un evento nuevo?</strong></p>
            <p>
                Desde "Mis Eventos" en tu panel de organización, da clic en "Nuevo Evento", completa nombre,
                categoría, descripción, sede, dirección, fecha y hora, sube una imagen si quieres, y agrega
                uno o varios tipos de boleto con su precio y aforo (un precio de $0 funciona como boleto de
                cortesía). Al terminar, da clic en "Publicar Evento".
            </p>

            <p><strong>¿Cómo se cobra la comisión de la plataforma?</strong></p>
            <p>
                El porcentaje de fee (por venta en línea y, opcionalmente, por venta en taquilla), el plazo de
                pago y el tiempo de reserva de boletos no pagados se definen en el convenio comercial de tu
                organización. Puedes consultarlos en todo momento, sin poder editarlos, desde "Mi Contrato" en
                tu panel; solo el equipo de MondoTicket puede modificarlos.
            </p>

            <p><strong>¿Cómo funciona el escaneo de boletos en la entrada?</strong></p>
            <p>
                El personal con cuenta de Validador (o de Organización/Taquilla) enciende la cámara desde su
                panel y apunta al código QR del boleto; el sistema lo detecta automáticamente y marca el
                boleto como usado al instante, evitando que se vuelva a usar. Si la red del recinto falla, se
                puede preparar un modo sin conexión antes del evento para seguir validando boletos y
                sincronizar todo automáticamente en cuanto vuelva la señal.
            </p>

            <h2>Pagos y reembolsos</h2>

            <p><strong>¿Qué métodos de pago aceptan?</strong></p>
            <p>
                Tarjeta, transferencia SPEI y efectivo (por ejemplo en tiendas de conveniencia), procesados a
                través de una página de pago segura. Los boletos gratuitos (cortesías) no requieren pasar por
                el paso de pago.
            </p>

            <p><strong>¿Cómo pido un reembolso?</strong></p>
            <p>
                Los reembolsos los gestiona directamente el organizador del evento desde su panel, boleto por
                boleto. Si necesitas uno, te recomendamos contactar primero al organizador del evento o
                escribirnos para orientarte sobre el proceso.
            </p>

            <p><strong>¿Es seguro pagar en MondoTicket?</strong></p>
            <p>
                Sí. Los pagos se procesan con OrkestaPay y MondoTicket nunca almacena los datos de tu tarjeta
                directamente. Puedes ver más detalles técnicos en la sección "Seguridad" del pie de página.
            </p>

            <p>
                ¿No encontraste la respuesta que buscabas? Escríbenos a{' '}
                <a href="mailto:soporte@mondoticket.com">soporte@mondoticket.com</a> y con gusto te ayudamos.
            </p>
        </LegalPageLayout>
    );
}

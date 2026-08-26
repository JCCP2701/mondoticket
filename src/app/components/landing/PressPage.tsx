import LegalPageLayout from './LegalPageLayout';

export default function PressPage() {
    return (
        <LegalPageLayout title="Sala de Prensa" updatedAt="25 de agosto de 2026">
            <p>
                Recursos e información de contacto para medios de comunicación interesados en cubrir
                MondoTicket o en entrevistar al equipo sobre la industria de venta de boletos en México.
            </p>

            <h2>Boilerplate</h2>
            <p>
                MondoTicket es una plataforma mexicana de venta de boletos para eventos que permite a
                organizadores vender boletos en línea y en taquilla física desde un mismo inventario, con
                mapas de asientos configurables, roles de equipo por organización, códigos QR antifraude para
                el control de acceso y procesamiento de pagos mediante OrkestaPay. La plataforma está diseñada
                para eliminar la sobreventa y el fraude de boletos, dando a los organizadores control total
                sobre la venta y el acceso a sus eventos.
            </p>

            <h2>Recursos de marca</h2>
            <p>
                Contamos con logotipo e imágenes de la marca disponibles para uso editorial a solicitud. Si
                estás preparando una nota y necesitas estos materiales, escríbenos y te los hacemos llegar.
            </p>

            <h2>Contacto de prensa</h2>
            <p>
                Para entrevistas, solicitudes de información o materiales de prensa, escríbenos a{' '}
                <a href="mailto:prensa@mondoticket.com">prensa@mondoticket.com</a>. Haremos lo posible por
                responder a la brevedad.
            </p>
        </LegalPageLayout>
    );
}

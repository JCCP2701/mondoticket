import LegalPageLayout from './LegalPageLayout';

export default function BlogPage() {
    return (
        <LegalPageLayout title="Blog" updatedAt="25 de agosto de 2026">
            <p>
                Artículos prácticos para organizadores de eventos sobre precios, prevención de fraude,
                planeación de aforo y operación de taquilla.
            </p>

            <h2>Cómo fijar el precio de tus boletos</h2>
            <p>
                Poner el precio correcto a un boleto es un equilibrio entre lo que el evento cuesta producir,
                lo que el público está dispuesto a pagar y qué tan rápido quieres que se agote la venta. Un
                error común es fijar un solo precio para todo el aforo, ignorando que no todos los lugares ni
                todos los momentos de compra valen lo mismo para el asistente.
            </p>
            <p>
                Una estrategia efectiva es segmentar por zona cuando el evento tiene mapa de asientos —zonas
                cercanas al escenario o con mejor vista pueden tener un precio distinto a zonas generales— y
                por momento de compra, ofreciendo boletos de preventa a un precio menor para asegurar ventas
                tempranas y ajustar el precio conforme se acerca la fecha y el aforo disponible disminuye.
            </p>
            <p>
                Revisa periódicamente el ritmo de venta: si un evento se está agotando muy rápido, probablemente
                el precio estuvo por debajo de lo que el mercado podía pagar; si la venta es lenta a pocos días
                del evento, vale la pena evaluar promociones puntuales antes que descuentos generalizados de
                último minuto que devalúan la percepción del evento.
            </p>

            <h2>Cómo evitar el fraude de boletos falsificados</h2>
            <p>
                El boleto falsificado es uno de los problemas más costosos para un organizador: además de la
                pérdida económica, genera conflictos en el acceso el día del evento y daña la experiencia de
                quien compró de buena fe. La causa más común no es la falsificación sofisticada, sino boletos
                que se pueden copiar fácilmente —como una imagen o un PDF sin validación— y que terminan
                circulando por redes sociales o reventa informal.
            </p>
            <p>
                La defensa más efectiva es que cada boleto tenga un código único que se valide contra una base
                de datos central en el momento del acceso, y que ese código quede invalidado en cuanto se usa
                una vez. Así, aunque alguien tenga una copia idéntica de la imagen del boleto, el sistema de
                acceso rechaza cualquier intento de reingreso con el mismo código.
            </p>
            <p>
                Complementa esto con control de acceso: asigna el escaneo de boletos a personal específico de
                tu equipo, en vez de dejar que cualquiera valide manualmente, y capacita a ese personal para
                que ante cualquier duda escale el caso en lugar de dejar pasar un boleto sospechoso.
            </p>

            <h2>Cómo planear el aforo con mapas de asientos</h2>
            <p>
                Definir el aforo de un evento no es solo contar cuántas personas caben en el recinto, sino
                decidir cómo se va a organizar ese espacio para la venta: qué zonas existen, cuántos asientos
                o lugares tiene cada una, y qué relación de precio y visibilidad hay entre ellas. Un mapa de
                asientos bien planeado evita sobreventa y le da al comprador información clara antes de pagar.
            </p>
            <p>
                Para eventos con asiento numerado, define primero las secciones grandes (por ejemplo, piso,
                balcón, palcos) y después las filas y asientos dentro de cada una, dejando pasillos y salidas
                de emergencia claramente fuera del inventario vendible. Para eventos sin asiento asignado,
                sigue siendo útil dividir el aforo en zonas con capacidad máxima definida, de forma que el
                sistema deje de vender en cuanto una zona llega a su límite.
            </p>
            <p>
                Revisa el mapa con tiempo antes de abrir la venta: un ajuste de última hora en el aforo, después
                de que ya se vendieron boletos, es mucho más difícil de resolver que planearlo correctamente
                desde el inicio.
            </p>

            <h2>Cómo usar taquilla física y venta en línea sin duplicar inventario</h2>
            <p>
                Muchos eventos necesitan vender por dos canales a la vez: en línea, para quien compra con
                anticipación, y en taquilla física, para quien decide asistir el mismo día. El riesgo de operar
                ambos canales por separado —por ejemplo, con una lista en línea y un talonario físico en la
                taquilla— es que se vendan los mismos lugares dos veces sin que nadie lo note hasta que ya es
                tarde.
            </p>
            <p>
                La solución es que ambos canales descuenten del mismo inventario en tiempo real: cuando alguien
                compra en línea, ese lugar deja de estar disponible en taquilla de inmediato, y viceversa. Esto
                requiere que el punto de venta físico esté conectado al mismo sistema que la tienda en línea,
                en lugar de operar como una hoja de cálculo aparte.
            </p>
            <p>
                Además de evitar la sobreventa, esto le da al organizador una sola fuente de verdad sobre cuánto
                se ha vendido y cuánto aforo queda disponible, sin tener que sumar manualmente reportes de
                distintos canales al final del día.
            </p>
        </LegalPageLayout>
    );
}

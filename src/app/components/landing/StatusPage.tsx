import LegalPageLayout from './LegalPageLayout';

const components = [
    'Sitio web y venta en línea',
    'Procesamiento de pagos (OrkestaPay)',
    'Panel de organizadores',
    'Escaneo y validación en puerta',
    'Notificaciones por correo',
];

function StatusBadge() {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'var(--mt-green-wash)',
                border: '1px solid var(--mt-green-border)',
                color: 'var(--mt-green-dark)',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
            }}
        >
            <span
                style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--mt-green)',
                    display: 'inline-block',
                }}
            />
            Operativo
        </span>
    );
}

export default function StatusPage() {
    return (
        <LegalPageLayout title="Estado del Sistema" updatedAt="25 de agosto de 2026">
            <p>
                Este es el estado actual de los componentes principales de MondoTicket. Todos los sistemas
                operan con normalidad.
            </p>

            <div
                style={{
                    border: '1px solid var(--mt-line)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '24px',
                }}
            >
                {components.map((name, i) => (
                    <div
                        key={name}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            padding: '16px 20px',
                            borderTop: i === 0 ? 'none' : '1px solid var(--mt-line)',
                            background: 'var(--mt-white)',
                        }}
                    >
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                            {name}
                        </span>
                        <StatusBadge />
                    </div>
                ))}
            </div>

            <h2>Sobre esta página</h2>
            <p>
                Esta página se actualiza manualmente por nuestro equipo y todavía no es un monitor
                automatizado en tiempo real. Si notas algo que no funciona como esperabas aunque aquí se
                muestre como operativo, avísanos directamente — es la forma más rápida de que nos enteremos.
            </p>
            <p>
                No tenemos incidentes reportados recientemente. Si en algún momento un componente presenta
                una interrupción, lo reflejaremos en esta misma página en cuanto tengamos información
                confirmada.
            </p>

            <h2>¿Algo no funciona?</h2>
            <p>
                Escríbenos a{' '}
                <a href="mailto:soporte@mondoticket.com">soporte@mondoticket.com</a> describiendo lo que
                intentabas hacer y qué viste en pantalla; entre más detalle nos des, más rápido podemos
                ayudarte.
            </p>
        </LegalPageLayout>
    );
}

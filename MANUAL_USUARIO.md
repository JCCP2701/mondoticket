# Manual de Usuario — MondoTicket

> Este manual se actualiza cada vez que se agrega o cambia una función en la plataforma. Última actualización: ver [Historial de cambios](#historial-de-cambios) al final del documento.

## ¿Qué es MondoTicket?

MondoTicket es la plataforma donde:
- Las **organizaciones** publican sus eventos y venden boletos.
- Los **compradores** eligen y pagan sus boletos en línea.
- El personal de **taquilla** vende boletos físicamente en el evento.
- Los **brokers** son socios externos que ganan un % por las organizaciones que traen a la plataforma.
- El **superadministrador** da de alta a las organizaciones y supervisa todo el negocio.

Existen 6 tipos de cuenta (roles). Cada uno entra a una pantalla distinta automáticamente al iniciar sesión.

| Rol | ¿Quién es? | ¿A dónde entra? |
|---|---|---|
| **Super Administrador** | El equipo de MondoTicket | Panel de administración general |
| **Organización** | El cliente que organiza y vende sus eventos | Panel de la organización |
| **Taquilla** | El personal que vende boletos en el lugar del evento | Panel de venta en taquilla |
| **Validador** | El personal que revisa boletos en la entrada del evento | Panel de escaneo de boletos |
| **Broker** | Socio externo que gana un % por las organizaciones que trajo | Panel de ganancias del broker |
| **Usuario** | La persona que compra boletos para asistir | Su cartera de boletos ("Mi Wallet") |

Una cuenta de **Organización** o **Taquilla** puede pertenecer a más de una organización al mismo tiempo (por ejemplo, si la misma persona administra dos recintos). En ese caso aparece un selector para cambiar entre organizaciones en la barra lateral.

---

## Cómo iniciar sesión

1. Entra a la página principal y da clic en **"Iniciar Sesión"**.
2. Escribe tu correo y contraseña.
3. Si tu cuenta tiene activada la verificación en dos pasos, se te pedirá un código de tu aplicación de autenticación (Google Authenticator, Authy, etc.) la primera vez que entres desde un dispositivo nuevo.

> Las cuentas de demostración (`@demo.com`) no piden verificación en dos pasos, para poder mostrar la plataforma rápidamente.

### Cuentas de demostración

Estas 6 cuentas existen solo para mostrar la plataforma. Ninguna pide verificación en dos pasos ni código por correo — entran directo con correo y contraseña.

| Rol | Correo | Contraseña |
|---|---|---|
| Super Administrador | `superadmin@demo.com` | `Demo123!` |
| Organización | `organization@demo.com` | `Demo123!` |
| Taquilla | `taquilla@demo.com` | `Demo123!` |
| Validador | `validador@demo.com` | `Demo123!` |
| Broker | `broker@demo.com` | `Demo123!` |
| Usuario (comprador) | `user@demo.com` | `Demo123!` |

> La cuenta demo de Broker ya tiene un contrato de ejemplo con "Organización Demo" (10% de la venta de boletos), así que al entrar se ven ganancias reales de inmediato, no un panel vacío.

> Estas cuentas de demostración son distintas del código de verificación por correo que se pide al comprar como invitado (ver [Comprar un boleto](#comprar-un-boleto)) — ese flujo es solo para compradores nuevos sin cuenta, no aplica a estas 6 cuentas.

---

## Guía para Super Administrador

Al entrar verás el menú lateral con: **Dashboard**, **Organizaciones**, **Usuarios**, **Brokers**, **Finanzas**, **Configuración**.

### Dashboard
Resumen general: ganancia estimada, boletos vendidos, boletos por vender, número de organizaciones, gráfica de recaudación de los últimos 6 meses, y una tabla con cada organización donde puedes editar rápidamente su fee (%) haciendo clic sobre el porcentaje.

### Organizaciones
Lista de todas las organizaciones registradas. Desde aquí puedes:
- **Nueva Organización** (botón superior derecho): da de alta a un nuevo cliente — nombre comercial, razón social, RFC, dirección, contacto y los términos comerciales iniciales.
- **Convenio** (botón por fila): edita en cualquier momento el convenio comercial de esa organización:
  - **Fee por Ticket (%)** — lo que cobra la plataforma por cada boleto vendido en línea.
  - **Fee para Ventas en Taquilla (%)** — opcional; si se deja vacío, se usa el mismo fee general. Útil si quieres cobrar distinto por las ventas presenciales.
  - **Plazo de Pago (días)** — cuántos días tiene la organización para pagar el fee.
  - **Eventos por Mes** — opcional; límite de eventos nuevos que puede crear por mes calendario. Si se deja vacío, no hay límite.
  - **Cortesías por Evento** — opcional; límite de boletos gratuitos que puede emitir por evento. Si se deja vacío, no hay límite.
  - **Notas del Convenio** — cualquier condición especial por escrito.
- **Miembros** (botón por fila): ver quién pertenece a esa organización, invitar a una persona nueva (te da una contraseña temporal para compartirle) o agregar a una cuenta que ya existe.

### Usuarios
Lista de todas las cuentas del sistema (clientes, organizaciones, taquilla, superadmins), con buscador y filtro por rol.
- **Nuevo Usuario** (botón superior): crea directamente una cuenta de `Organización` o `Taquilla` y la asigna a una o varias organizaciones desde el momento de creación.
- Ícono de engranaje (por fila): administra a qué organización(es) pertenece esa persona — quitarla de una, o agregarla a otra. Para cuentas de rol `Usuario` o `Super Admin` este botón no aplica (no pertenecen a ninguna organización).

### Brokers
Aquí se crean las cuentas de **Broker** y se configura su contrato comercial con cada organización.
- **Nuevo Broker** (botón superior derecho): crea la cuenta (solo nombre y correo — un broker no se asigna a ninguna organización todavía en este paso).
- Da clic en un broker para desplegar sus contratos. **Agregar contrato con otra organización**: eliges la organización, la base de cálculo, y el porcentaje:
  - **% de venta de boletos**: el broker gana ese % sobre el total vendido en boletos de los eventos de esa organización.
  - **% del fee de la plataforma**: el broker gana ese % sobre lo que MondoTicket le cobra a esa organización (no sobre la venta del evento).
- Cada broker puede tener un contrato distinto (organización, base, %) con cada organización. Editar o eliminar un contrato es inmediato — el broker deja de ver ganancias de esa organización en cuanto se elimina.

> El broker **nunca ve el ingreso real** de un evento ni el detalle de las órdenes — solo su ganancia ya calculada. Esto no es una preferencia de la interfaz: la cuenta de broker no tiene ningún permiso para leer boletos u órdenes directamente en la base de datos, así que no hay manera de que vea esos números aunque lo intente.

### Finanzas
Recaudación real por organización. Da clic en una organización para desplegar el detalle evento por evento, separando lo vendido en línea de lo vendido en taquilla (porque pueden tener un fee distinto).

### Configuración
Esta sección todavía es solo una vista de referencia — los cambios que se hagan aquí **no se guardan todavía**. Se avisará en este manual cuando quede completamente funcional.

---

## Guía para Organización

Menú lateral: **Dashboard**, **Mis Eventos**, **Mi Contrato**, **Configuración**. Si tu cuenta pertenece a más de una organización, verás un selector arriba del menú para cambiar entre ellas.

### Dashboard
Resumen de tu organización: eventos activos, boletos vendidos, revenue total, cuánto fee le debes a la plataforma ("Fee a Liquidar"), y un gráfico de tu inventario disponible vs. vendido. El botón **"Descargar Resumen"** abre el diálogo de impresión del navegador para guardarlo como PDF.

### Mis Eventos
Lista de tus eventos con ocupación, estado de preventa, revenue, cortesías y reembolsos. Botón **"Nuevo Evento"** para crear uno, o **"Detalles"** para entrar a la gestión de uno existente.

#### Crear un evento
1. Completa nombre, categoría, descripción, sede, dirección, fecha y hora.
2. Puedes subir una imagen real para el evento (se mostrará en el sitio y en el checkout).
3. Agrega uno o varios **tipos de boleto** (por ejemplo General, VIP) con su precio y aforo. Un tipo de boleto con precio $0 funciona como boleto de cortesía.
4. Da clic en **"Publicar Evento"**.

> Si tu organización tiene un límite de "Eventos por Mes" en su convenio y ya lo alcanzaste ese mes, el sistema no dejará crear uno nuevo hasta el siguiente mes.

#### Detalle de un evento
Desde aquí puedes:
- **Editar Evento**: cambiar nombre, categoría, descripción o la imagen del evento en cualquier momento.
- **Mapa de Asientos**: diseñar el mapa de asientos para los tipos de boleto que lo requieran (ver siguiente sección).
- **Asignar Cortesía**: dar un boleto gratuito a alguien (solo visible si el evento tiene algún tipo de boleto con precio $0).
- Ver la lista de boletos vendidos, buscarlos, filtrarlos por estado (Válido / Usado / Reembolsado), y **seleccionar boletos para reembolsar**.

> Si tu convenio tiene un límite de "Cortesías por Evento" y ya lo alcanzaste, el sistema no dejará asignar más cortesías para ese evento.

#### Mapa de Asientos
Diseña la distribución de asientos con las herramientas de Selector, Bloque y Borrador, elige a qué tipo de boleto pertenece cada asiento pintado, y da clic en **"Guardar Mapa de Asientos"**. Una vez que un tipo de boleto tiene asientos, los compradores eligen su asiento exacto en vez de solo la cantidad.

### Mi Contrato
Consulta (sin poder editar) tu convenio comercial vigente: fee digital, fee en taquilla, plazo de pago, límite de eventos por mes, límite de cortesías por evento, y los datos legales de tu organización. Solo el Super Administrador puede modificar estos valores. El botón **"Descargar PDF"** abre el diálogo de impresión del navegador.

### Configuración
Igual que en el panel de Super Administrador: esta sección todavía es solo de referencia, los cambios **no se guardan todavía**.

---

## Guía para Taquilla

Al entrar verás el evento seleccionado (con su imagen, si tiene una) y dos formas de vender:
1. **Por cantidad**: usa los botones `+`/`-` junto al tipo de boleto.
2. **Por asiento**: si el tipo de boleto tiene mapa de asientos, primero pon cuántos vas a vender con `+`/`-` — el mapa aparece justo debajo en cuanto pones al menos 1, y ahí eliges exactamente esos asientos. Se actualiza en tiempo real, así que si alguien más (otro taquillero, o un comprador en línea) toma un asiento, deja de estar disponible al instante para ti también.

Puedes mezclar ambos en una sola venta. Los datos del comprador son opcionales. Elige el método de pago (solo para tu registro, ya que el cobro se hace en persona — efectivo o terminal física) y da clic en **"Completar Venta"**.

> Si tu organización tiene varios eventos, cámbialo desde el selector de "Evento" arriba.
> Si tu cuenta pertenece a varias organizaciones, usa el selector junto al logo para cambiar entre ellas.

---

## Guía para Validador (escaneo en puerta)

Esta cuenta es para el personal que revisa boletos en la entrada del evento. Una cuenta de `Organización` o `Taquilla` también puede escanear (útil en eventos pequeños donde una sola persona hace todo), pero solo `Validador` está pensado específicamente para esto.

### Cómo escanear
1. Elige el evento en el selector superior.
2. Da clic en **"Encender cámara"** y apunta al código QR del boleto (en el celular del asistente o impreso). El sistema lo detecta solo, sin necesidad de tomar foto.
3. Verás de inmediato un resultado en:
   - 🟢 **Verde — Acceso permitido**: el boleto es válido y ya quedó marcado como usado. No se puede volver a usar.
   - 🔴 **Rojo — Ya fue escaneado**: te muestra cuándo y con qué dispositivo entró antes. Si la persona jura que es la primera vez, probablemente su boleto se compartió o se le tomó una captura de pantalla a alguien más.
   - 🔴 **Rojo — Boleto reembolsado / de otro evento / código no reconocido**: no se permite el acceso.
4. Si la cámara no puede leer el código (pantalla rota, muy oscuro), usa el campo de **"Código manual"** para escribirlo o pegarlo a mano.

> Cada boleto tiene **un solo código QR, siempre el mismo** — en la app, en el correo, impreso, o guardado en Apple/Google Wallet. La protección contra clonación no viene de que el código cambie, sino de que **se "quema" para siempre en el instante en que se escanea la primera vez**: si alguien más intenta usar una foto o captura de ese mismo boleto después, el sistema ya lo ve como usado y lo rechaza.

### Modo sin conexión (si se satura o cae la red del lugar)
Antes de que empiece a entrar gente, con conexión a internet todavía disponible:
1. Elige el evento y da clic en **"Preparar modo offline"**. Esto descarga al dispositivo lo necesario para seguir validando boletos aunque se pierda la señal.
2. Si la señal se cae, el sistema lo detecta solo y aparece una barra naranja arriba: **"MODO OFFLINE — N escaneos sin sincronizar"**. Puedes seguir escaneando normal — cada resultado se guarda en el propio dispositivo con la etiqueta "Sin conexión".
3. Cuando vuelva la señal, el sistema sincroniza automáticamente (o puedes forzarlo con **"Sincronizar"**). Ahí es cuando cada escaneo se vuelve a verificar contra el servidor.

> **Promesa honesta, no mágica**: mientras hay conexión, es imposible que un mismo boleto entre dos veces. Si el lugar se queda sin señal y **dos dispositivos distintos** escanean el mismo boleto mientras ambos están desconectados, el sistema detecta el conflicto al sincronizar (gana el que escaneó primero, por hora real) y lo deja registrado para que el organizador lo revise después — no promete que nunca pueda pasar, promete que si pasa, quedará documentado.
> Si el dispositivo se queda sin conexión **sin haber preparado el modo offline primero**, no podrá validar boletos hasta recuperar la señal — por eso el paso 1 debe hacerse antes de que empiece el evento, no durante.

### Si te equivocaste de boleto
Si escaneaste el boleto incorrecto por error, puedes dar clic en **"Revertir este ingreso"** justo debajo del resultado — pero solo funciona en el momento, inmediatamente después de escanearlo. Si ya pasó tiempo o cambiaste de pantalla, pide a alguien con cuenta de `Organización` que lo revierta desde el detalle del evento.

> Por seguridad, una cuenta de Validador o Taquilla **no puede revertir** un check-in — solo una cuenta de Organización o el Super Administrador pueden hacerlo. Esto evita que, si alguien roba o clona una cuenta de puerta, pueda "reabrir" entradas ya usadas.

### Ver cuántos han entrado
Abajo del selector de evento verás el contador de personas ya ingresadas, y más abajo la lista de los últimos escaneos (quién, cuándo, y si fue aceptado o rechazado) — se actualiza en tiempo real, así que si hay varios validadores escaneando al mismo tiempo, todos ven lo mismo.

> Para las organizaciones: el detalle de cada evento (`Mis Eventos → Detalles`) ahora también muestra cuántos boletos ya hicieron check-in.

---

## Guía para Broker

Esta cuenta es para un socio externo (promotor, agente) que trae organizaciones a la plataforma y gana un % de sus eventos. Los contratos (con cuáles organizaciones, y a qué %) los configura el Super Administrador desde "Brokers" — un broker no puede agregarse a sí mismo a una organización.

### Tus ganancias
Al entrar verás:
- **Tarjetas de resumen**: cuánto has ganado en total, cuánto este mes, con cuántas organizaciones tienes contrato, y en cuántos eventos.
- **Ganancias por organización**: da clic en una organización para ver el desglose por evento.
- **Historial de transacciones**: cada compra pagada que generó ganancia para ti, con fecha, evento, organización, y tu comisión — ordenadas de la más reciente a la más antigua.

> **Importante**: en ningún lugar del panel se muestra el ingreso real del evento (lo que realmente se vendió), ni el detalle de compradores u órdenes — solo tu ganancia, ya calculada según tu contrato. Si tu contrato es "% de venta de boletos", tu ganancia sube y baja junto con las ventas reales del evento, pero el número que ves siempre es tu comisión, nunca la venta completa.

Si un contrato se elimina o se ajusta, los cambios se reflejan de inmediato la próxima vez que entres — no hay que hacer nada de tu parte.

---

## Guía para Usuario (comprador)

### Explorar eventos
Desde la página principal puedes ver los próximos eventos destacados, o dar clic en **"Ver Todos los Eventos"** para ver el catálogo completo con filtros por categoría, fecha y búsqueda por nombre.

### Comprar un boleto
1. Entra al evento que te interesa y da clic para ir a la compra.
2. **Paso 1 — Tus datos**: escribe tu nombre, correo y teléfono, y da clic en **"Enviar código"**.
3. Revisa tu correo — te llegará un **código de 6 dígitos**. Escríbelo y da clic en **"Verificar código"**.
   - Si no te llega o se te vence (tiene un tiempo límite), usa **"Reenviar código"**.
   - Si ya tenías cuenta con ese correo (por ejemplo porque ya compraste antes), el mismo código te abre tu sesión existente — no necesitas recordar ninguna contraseña.
4. **Paso 2 — Elige tus boletos**: se desbloquea después de verificar tu código.
   - Para cada tipo de boleto, primero pon **cuántos quieres** con los botones `+`/`-`.
   - Si ese tipo tiene asientos numerados, en cuanto pongas la cantidad aparece el mapa del recinto **debajo** — ahí eliges exactamente cuáles asientos quieres, ni uno más de los que pediste. El botón de compra no se activa hasta que hayas elegido todos los asientos que indicaste.
   - En cuanto le das clic a un asiento (o en cuanto avanzas con una cantidad sin mapa), **queda apartado para ti al instante** — nadie más lo puede tomar, ni siquiera taquilla, mientras sigas en el proceso.
5. **Paso 3 — Pago**: no aplica si tu selección es gratuita (cortesía). Para todo lo demás, se te muestra qué métodos acepta la plataforma (tarjeta, SPEI, efectivo) y al dar clic en **"Finalizar Compra"** te llevamos a una página de pago segura para completarlo con el método que prefieras.
6. Al terminar de pagar, regresas automáticamente a la pantalla de tu boleto.
   - Si pagaste con tarjeta, normalmente tu boleto (con su código QR) aparece de inmediato.
   - Si pagaste con SPEI o en efectivo, la confirmación del banco/tienda puede tardar — verás un mensaje de **"Confirmando tu pago..."** y un botón para volver a checar; en cuanto se confirme, tu boleto aparece solo, sin que tengas que hacer nada más.

> Tus boletos/asientos apartados nunca se le pueden vender a alguien más mientras tu compra sigue en proceso — ver [¿qué pasa si no termino de pagar?](#preguntas-frecuentes) para saber cuánto tiempo se quedan apartados si no terminas.

### Mi Wallet
Desde el ícono de tu cuenta puedes ver todos tus boletos (próximos y pasados), con su código QR, estado (Válido / Usado / Reembolsado), y un acceso directo para ver el boleto completo.

### Ver un boleto
Desde el boleto puedes ver su código QR para el acceso al evento, agregarlo a tu calendario, y dar clic en **"Google Wallet"** para guardarlo directamente en tu Google Wallet (celular Android o cualquier cuenta de Google), con el diseño morado de MondoTicket — el código que se guarda ahí es exactamente el mismo que ves en la app. *(Apple Wallet todavía está en construcción.)*

> Tu código QR es **siempre el mismo** — es el mismo que verás en la app, en tu correo, y (próximamente) en Apple/Google Wallet. No necesitas preocuparte porque cambie ni recargar la pantalla: simplemente muéstralo en el acceso. En cuanto el validador lo escanea, ese código queda usado para siempre — por eso no debes compartirlo con nadie antes de llegar al evento.

---

## Preguntas frecuentes

**¿Por qué no me llega el código para comprar?**
Revisa spam/promociones. Puedes pedir uno nuevo con "Reenviar código", pero hay un límite de tiempo entre solicitudes (por seguridad, para evitar abuso).

**¿Puedo comprar boletos para varios eventos de organizaciones distintas?**
Sí, una cuenta de comprador puede comprar de cualquier organización sin restricción.

**Aparto un boleto/asiento pero no completo la compra, ¿qué pasa?**
Depende de en qué paso te quedaste:
- Si solo elegiste el asiento pero nunca le diste "Finalizar Compra": se libera solo después de **5 minutos** sin actividad (o antes, si cierras la pestaña).
- Si ya le diste "Finalizar Compra" y llegaste a la pantalla de pago pero no la terminaste: queda apartado hasta por **72 horas** — pensado para cubrir pagos en efectivo o SPEI, que pueden tardar en confirmarse. Si decides que ya no quieres comprarlo, da clic en "Cancelar" en esa misma pantalla de pago para liberarlo de inmediato en vez de esperar.

**¿Ya se puede escanear el boleto en la entrada del evento?**
Sí. Una cuenta de rol `Validador` (o `Organización`/`Taquilla`) puede escanear los boletos desde su panel — ver [Guía para Validador](#guía-para-validador-escaneo-en-puerta). Un boleto ya escaneado no se puede volver a usar.

**¿Qué pasa si dos personas intentan entrar con el mismo boleto (por ejemplo, alguien compartió una captura de pantalla)?**
Solo la primera persona en escanearse entra. La segunda ve un aviso de "Ya fue escaneado" con la hora exacta y el dispositivo con el que entró la primera vez, para que el personal de puerta pueda decidir qué hacer.

**¿Un broker puede ver cuánto vendió realmente un evento?**
No. El panel del broker solo muestra su propia ganancia ya calculada, nunca el ingreso real del evento ni el detalle de órdenes o compradores — esa cuenta no tiene permiso para leer esa información, sin importar cómo la busque.

---

## Historial de cambios

- **2026-08-06** — **Pago real conectado**: la pasarela de pago ya no es simulada — tarjeta, SPEI y efectivo se procesan de verdad en una página de pago segura. Si pagas con SPEI o efectivo, tu boleto puede tardar en aparecer mientras se confirma (verás "Confirmando tu pago..."); con tarjeta normalmente es inmediato. Ver la sección [Comprar un boleto](#comprar-un-boleto) actualizada, y la pregunta frecuente sobre cuánto tiempo se aparta un boleto si no terminas de pagar.
- **2026-08-06** — **Elegir cantidad antes que el asiento**: para boletos con asientos numerados, ahora primero indicas cuántos quieres con los botones `+`/`-`, y el mapa del recinto aparece justo después, limitado a esa cantidad exacta — antes se podía seleccionar cualquier cantidad de asientos sin relación con un número declarado. Aplica igual en compra en línea y en taquilla.
- **2026-08-06** — Se agregaron cuentas de demostración para **Validador** y **Broker** (antes solo existían para los otros 4 roles). La cuenta demo de Broker ya tiene un contrato de ejemplo con "Organización Demo" para que se vean ganancias reales al entrar.
- **2026-08-06** — Se agregó el rol **Broker**: un socio externo que gana un % de los eventos de las organizaciones que trajo a la plataforma, sin ver nunca el ingreso real ni el detalle de órdenes — solo su ganancia ya calculada. El Super Administrador crea las cuentas y configura el contrato por organización (nueva sección "Brokers"): puede ser % de la venta de boletos o % del fee de la plataforma, según lo que se acuerde con cada broker. Incluye tarjetas de resumen, ganancias por organización/evento, e historial de transacciones para el broker.
- **2026-08-06** — La plataforma cambió de nombre: de "TicketBlessing" a **MondoTicket** (mismo sistema, solo cambia el nombre y el logo).
- **2026-08-06** — El boleto guardado en **Google Wallet** ahora se ve con el diseño morado de la marca (banner y logo de MondoTicket) en vez del ícono genérico gris.
- **2026-08-06** — Si ya iniciaste sesión (por ejemplo con una cuenta de Organización o Taquilla) al entrar a comprar un boleto, el nombre y correo se rellenan automáticamente como punto de partida pero ahora se pueden editar libremente — antes quedaban bloqueados.
- **2026-08-05** — **Google Wallet real**: el botón "Google Wallet" en el boleto y en Mi Wallet ahora sí guarda el boleto en Google Wallet de verdad (antes no existía / abría por error Google Calendar). El código QR que se guarda ahí es el mismo que se ve en la app — no uno distinto para el wallet.
- **2026-08-05** — **Un solo código QR por boleto**: se ajustó el diseño para que cada boleto tenga siempre el mismo código QR (en app, correo, impreso, y a futuro en Apple/Google Wallet), en vez de uno que cambiara cada 30 segundos. La protección contra clonación sigue siendo real: el código se "quema" permanentemente en el instante en que se escanea la primera vez, así que una copia (foto, captura de pantalla) deja de servir de inmediato después de ese primer ingreso. **Modo sin conexión** en el escaneo de puerta: el validador puede preparar el dispositivo antes del evento para seguir validando boletos aunque se caiga la red del lugar, sincronizando automáticamente al recuperar señal, con detección de conflictos si dos dispositivos escanearon el mismo boleto mientras ambos estaban desconectados.
- **2026-08-05** — Se agregó el rol **Validador** para escanear boletos en la entrada del evento (cámara con detección automática de QR, entrada manual de respaldo, contador de ingresos en tiempo real, y opción de revertir un escaneo por error). Un boleto ya escaneado no se puede volver a usar. Las cuentas de Organización y Taquilla también pueden invitar/gestionar cuentas Validador desde "Miembros". El detalle de evento (Organización) ahora muestra cuántos boletos ya hicieron check-in.
- **2026-08-05** — Se agregó la tabla de credenciales de las 4 cuentas de demostración (correo + contraseña), aclarando que son independientes del código de verificación del checkout de invitados.
- **2026-08-05** — Documento creado. Incluye: roles y accesos, gestión de organizaciones/convenio/usuarios (Super Admin), creación y edición de eventos con imagen, mapa de asientos, cortesías y reembolsos (Organización), venta mixta por cantidad/asiento (Taquilla), compra con verificación por código de 6 dígitos por correo en vez de contraseña compartida, wallet y visualización de boletos (Usuario). Pendientes marcados explícitamente: pasarela de pago real, escaneo en puerta, Apple/Google Wallet, Configuración (ambas).

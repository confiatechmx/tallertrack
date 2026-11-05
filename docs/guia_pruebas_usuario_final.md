# Guía Práctica de Prueba — Sistema Operativo Cova

¡Bienvenido(a)! Esta guía está diseñada para que puedas recorrer y probar por tu cuenta las nuevas herramientas de **Órdenes de Servicio, Refacciones, Cobros en Caja y Corte del Día (Corte Z)** a tu propio ritmo.

No necesitas conocimientos técnicos ni acompañamiento para seguirla. Ya dejamos preparadas **5 órdenes de servicio reales listas para prueba** (`#1016` a `#1020`) y el turno listo para abrirse.

---

## ⏱️ ¿Qué vas a probar en los próximos 15 minutos?

1. **Presupuesto y Refacciones:** Cómo agregar una pieza a un vehículo, calcular tu ganancia automáticamente y guardar la foto de la factura/garantía del proveedor.
2. **Apertura de Caja:** Cómo iniciar el día con tu fondo de morralla/cambio y cómo el sistema protege tus cobros.
3. **Cobro a Clientes (POS):** Cómo cobrar en efectivo (con cálculo de cambio y descuento opcional), con tarjeta o combinando dos formas de pago, y entregar el recibo impreso o por WhatsApp.
4. **Gastos y Caja Chica:** Cómo anotar un gasto del día o el pago de una refacción y consultar la foto del ticket.
5. **Cierre del Día (Corte Z):** Cómo hacer el conteo de billetes al final del turno, ver tu utilidad del día, imprimir la hoja de cierre y descargar tu **Excel contable**.
6. **Historial de Cortes:** Cómo volver a consultar o descargar el cierre de turnos anteriores en cualquier momento.

---

## 🔑 Paso 0: Ingreso al Sistema

1. Abre el enlace del sistema en tu navegador (Google Chrome o Edge).
2. Ingresa con tu correo y contraseña:
   - **Correo Electrónico:** `eduardo@cova.mx` *(o tu cuenta asignada)*
   - **Contraseña:** `Cova2026!`
3. Verifica que arriba a la izquierda aparezca el logotipo de **COVA**.

---

## 🛠️ Misión 1: Agregar una Refacción, Calcular Precio y Guardar Garantía

> **Objetivo:** Ver qué tan fácil es cargar una pieza a la orden de un cliente, decidir cuánto cobrarle y dejar guardada la nota del proveedor por si algún día falla la pieza.

1. En el menú lateral izquierdo, haz clic en **`[ Tablero ]`**.
2. Verás los vehículos activos en el taller (por ejemplo, **`#1020 Ford Fusion SE Luxury`** en *En Inspección* o **`#1019 Mazda CX-3`** en *En Rampa*). Haz clic sobre **cualquiera de las tarjetas** para abrir su ventana de trabajo.
3. En la barra superior de la ventana que se abre, asegúrate de estar en la pestaña **`[ 2 Cotización ]`**.
4. Ubica el bloque **Refacciones e Insumos** y haz clic en el botón **`[ + Refacción ]`**.
5. **Prueba el calculador inteligente de precios:**
   - En **Descripción / Nombre de la Refacción \***, escribe el nombre de la pieza (ejemplo: `Juego de Balatas Cerámicas Delanteras`).
   - En **COSTO PROV. ($) \***, escribe lo que te costó a ti con el proveedor (ejemplo: `850`).
   - **Opción A (Por porcentaje rápido):** Haz clic en cualquiera de los botones de **MARKUP: %** (`25%`, `35%`, `45%` o `50%`). Verás cómo el campo **P. VENTA ($)** se calcula solo al instante.
   - **Opción B (Precio directo):** Ahora haz clic directamente en **P. VENTA ($)**, bórralo y escribe `1350`. Observa cómo aparece la etiqueta **`[DIRECTO]`** y el sistema calcula al revés qué porcentaje de margen estás ganando (`58.8%`).
6. **Prueba el registro de Proveedor y Garantía:**
   - Justo arriba del costo, haz clic en el botón **`[ + Garantía y Factura ]`**.
   - Se desplegará una sección azul. En **Proveedor (Opcional)**, elige uno de la lista (ejemplo: *Obal Zapata*, *AutoZone Comercial* o *Dar Refaccionaria*).
   - En **Folio Ticket / Factura**, escribe por ejemplo: `FAC-9920`.
   - En **Garantía (Meses)**, deja `12`.
   - En **Evidencia (Foto / PDF)**, puedes adjuntar cualquier imagen o PDF desde tu computadora para simular la foto de la nota.
   - *(Opcional)* Si esa refacción se pagó con efectivo de la caja del mostrador, deja marcada la casilla **`☑ Registrar egreso automático en Caja Chica`**.
7. Haz clic en el botón azul **`[ + Agregar Refacción ]`**. Verás que la pieza queda agregada a la orden del cliente. Puedes cerrar la ventana con la **`✕`** arriba a la derecha.

---

## 🔓 Misión 2: Abrir el Turno de Caja

> **Objetivo:** Antes de poder cobrarle a un cliente, la caja debe estar abierta para saber con cuánto dinero en efectivo iniciamos el día.

1. En el menú lateral izquierdo, haz clic en **`[ Caja POS ]`**.
2. En la franja superior verás un indicador ámbar que dice **`Caja Cerrada`**.
3. Haz clic en el botón azul **`[ Aperturar Turno ]`**.
4. Se abrirá la ventana **Apertura de Turno de Caja** con los dos fondos del taller:
   - **Fondo 1 — Operativo (Gaveta Mostrador):** Es el dinero en caja para dar cambio (viene sugerido en **`$400.00`**).
   - **Fondo 2 — Reserva (Caja Chica / Fuerte):** Es el fondo de respaldo para pago de refacciones o gastos mayores (viene sugerido en **`$8,500.00`**).
5. Haz clic en **`[ Confirmar y Abrir Turno ]`**.
6. **¿Qué debes ver ahora?** La franja superior cambia a **`🟢 Turno en Curso`** con la hora de apertura. Si quieres ver u ocultar los saldos de **`GAVETA`** y **`RESERVA`** por privacidad frente a los clientes, haz clic en el **ícono del ojito (`👁️`)** a un costado de los saldos.

---

## 💳 Misión 3: Cobrar Órdenes de Servicio (3 Casos Reales)

> **Objetivo:** Probar los 3 tipos de cobro más comunes en el mostrador. Asegúrate de estar en la primera pestaña superior llamada **`[ Terminal POS ]`**.

### Caso A: El cliente paga todo en Efectivo (y necesita cambio)
1. En la columna izquierda (**Órdenes por cobrar**), haz clic sobre la orden **`#1016 • Nissan Versa Advance`** (*Carlos Mendoza*, total `$1,200.00`).
2. En el panel derecho, bajo **¿CÓMO PAGA EL CLIENTE?**, asegúrate de tener seleccionado **`[ Efectivo ]`**.
3. **Observa el Descuento en Efectivo:** Verás una barra verde que dice **`Precio Promocional en Efectivo (-3%): ahorra $36.00 MXN`** con la casilla **`[☑ Aplicar]`**:
   - Si la dejas marcada, el total a cobrar baja automáticamente a **`$1,164.00`**.
   - Si le quitas la palomita a **`Aplicar`**, se mantiene el precio normal de **`$1,200.00`**. ¡Pruébalo marcando y desmarcando!
4. En **Billetes**, haz clic en **`+$1000`** y luego en **`+$500`** (o escribe `1500` en **Efectivo Recibido del Cliente**).
5. **Observa:** En el recuadro derecho **CAMBIO A DEVOLVER**, el sistema te calcula en grande exactamente cuánto cambio debes darle al cliente.
6. Haz clic en el botón grande **`[ COBRAR $... E IMPRIMIR TICKET → ]`**.
7. **Comprobante de Pago:** Se abrirá en pantalla el recibo oficial de Cova:
   - Arriba puedes alternar entre **`[ Hoja Carta ]`** y **`[ Ticket 80mm ]`**.
   - Puedes hacer clic en **`[ WhatsApp ]`** o en **`[ Imprimir Comprobante ]`**.
   - Al terminar, cierra el recibo o haz clic en **`[ Listo ]`**.

### Caso B: El cliente paga con Tarjeta (Terminal Bancaria)
1. En la lista izquierda, selecciona ahora la orden **`#1017 • Honda Civic Touring`** (*Andrea Villarreal*, `$2,450.00`).
2. En **¿CÓMO PAGA EL CLIENTE?**, haz clic en **`[ Tarjeta ]`** (*Terminal TPV*).
3. En el campo **Folio / Voucher / Referencia (Opcional)**, escribe los dígitos de autorización del voucher impreso por tu terminal (ejemplo: `AUT-44912`).
4. Haz clic en **`[ COBRAR $2,450.00 E IMPRIMIR TICKET → ]`** y cierra el comprobante.
   > 💡 **Nota importante:** Como este dinero entró directo a la cuenta bancaria de la terminal, el sistema lo suma a tus ventas del día pero **no lo mezcla** con el efectivo físico que tienes en tu gaveta.

### Caso C: El cliente divide su cuenta en 2 métodos de pago (Multi-Método)
1. En la lista izquierda, selecciona la orden **`#1018 • Toyota Hilux Doble Cabina`** (*Minera del Fuerte S.A. de C.V.*, `$3,000.00`).
2. Debajo de los 3 botones principales (*Efectivo, Tarjeta, SPEI*), haz clic en la barra desplegable que dice:
   **`[ Más opciones: Pago Dividido o Financiamiento (Kueski / Atrato / Stripe) ⌄ ]`**
3. Haz clic en la primera opción: **`[ Multi-Método (Dividir pago) ]`**.
4. Verás el panel de **Cobro Dividido (Multi-Método)**:
   - En **PAGO #1**, deja **`Efectivo`** y en **Monto a aplicar ($)** escribe `1000`. En **Efectivo recibido ($)** escribe `1000`.
   - Haz clic en el botón **`[ + Agregar otro método de pago ]`**.
   - Aparecerá el **PAGO #2** automáticamente con el resto (**`$2,000.00`**) en **`SPEI`**. Selecciona la cuenta bancaria receptora (*Cuenta Fiscal BBVA*, *Cuenta Operativa BanBajío* o *Cuenta Inbursa*) y verifica que arriba a la derecha diga **`✓ Total Cubierto ($3,000.00)`**.
5. Haz clic en **`[ COBRAR $3,000.00 E IMPRIMIR TICKET → ]`**. En el comprobante verás desglosados ambos pagos claramente.

---

## 🧾 Misión 4: Registrar un Gasto Rápido en Caja Chica

> **Objetivo:** Anotar cuando sacas efectivo del cajón para pagar algo del taller (garrafones de agua, insumos de limpieza o pago a un repartidor de refacciones).

1. En la esquina superior derecha de **Terminal de Caja**, haz clic en la pestaña **`[ Caja Chica ]`**.
2. Haz clic en el botón oscuro **`[ + Nuevo Movimiento ]`**.
3. En la ventana **Registrar Movimiento en Caja**, llena los datos:
   - **Fondo Afectado:** Deja seleccionado **`Fondo 1 - Operativo (Mostrador)`**.
   - **Tipo de Movimiento:** Elige **`Gasto / Insumos de Taller (Salida)`** *(o si eliges `Pago a Repartidor / Proveedor (Salida)`, verás que se despliegan los campos para elegir Proveedor, Folio de Factura, Garantía y Foto del Ticket)*.
   - **Concepto / Descripción:** Escribe `Garrafones de agua y desengrasante para bahías`.
   - **Monto ($ MXN):** Escribe `150`.
4. Haz clic en **`[ Guardar Movimiento ]`**.
5. **¿Qué debes ver?** El gasto aparece en la tabla de **Movimientos de Caja Chica** y se descuenta automáticamente del efectivo que el sistema espera en tu gaveta al cierre del turno. Además, en los gastos de refacciones que tienen un botón azul **`[ Ticket #... ]`**, puedes hacer clic sobre esa etiqueta para ver en grande la foto de la factura y su vigencia de garantía.

---

## 📊 Misión 5: Hacer el Cierre del Día (Corte Z), Imprimir PDF y Descargar Excel

> **Objetivo:** Cerrar la caja al final del turno contando el dinero físico, revisar qué se vendió, cuánto se ganó y descargar los reportes contables.

1. En la franja superior del turno, haz clic en el botón negro **`[ Corte Z (Arqueo) ]`**.
2. Se abrirá el asistente **Corte de Caja y Arqueo Ciego (Cierre Z)** en 4 pasos muy sencillos:
   - **Paso 1 (`1. Conteo Ciego`):** Puedes usar la calculadora de billetes y monedas o escribir directamente cuánto efectivo contaste en **Fondo 1 — Operativo (Gaveta Mostrador)** y confirmar el **Fondo 2 — Reserva** (`8500`). Haz clic en **`[ Revisar Cuentas Bancarias & TPVs → ]`**.
   - **Paso 2 (`2. SPEI & TPVs`):** Revisa el resumen de lo que entró por transferencias SPEI y terminales de tarjeta durante tu turno. Haz clic en **`[ Comparar Teórico y Variación → ]`**.
   - **Paso 3 (`3. Arqueo y Desviaciones`):** El sistema compara lo que contaste contra lo que debería haber en caja:
     - Si coincide, verás **`✓ Cuadrado Exacto`**.
     - Si pusiste una cantidad diferente (sobrante o faltante), te mostrará un recuadro para escribir una breve nota explicando el motivo (ejemplo: *"Se tomaron $50 para propina de repartidor"*). Haz clic en **`[ Definir Remesa y Cierre → ]`**.
   - **Paso 4 (`4. Remesa y Finalizar`):** El sistema te sugiere automáticamente cuánto dinero retirar al sobre del día (**Monto a Retirar en Sobre / Remesa**) para dejar tu gaveta otra vez en `$400.00` para mañana.
3. Haz clic en el botón verde **`[ Finalizar Corte Z y Cerrar Turno ]`**.

### Explora tu Reporte de Cierre de Caja (Corte Z):
En cuanto se cierra el turno, se abre automáticamente la ventana **Cierre de Caja (Corte Z)**:
- **Pestaña `[ Ventas y Servicios ]`:** Muestra las 4 tarjetas financieras del turno (*Ventas Cobradas, Costo Refacciones, Utilidad Bruta Est. y Gastos Caja Chica*) y debajo el **Desglose de Servicios y Refacciones por Vehículo** con cada auto cobrado, sus piezas, mano de obra y margen de ganancia.
- **Pestaña `[ Balance de Caja ]`:** Muestra el arqueo de efectivo (Fondo Inicial, Cobros en Efectivo, Salidas de Mostrador, Saldo Esperado vs Contado), transferencias SPEI por banco, tarjetas TPV, remesa retirada y las firmas de entrega.
- **Pestaña `[ Ticket 80mm ]`:** Vista compacta por si deseas imprimirlo en impresora térmica de tickets.
- **Botón verde `[ Descargar Reporte en Excel ]`:** Haz clic para descargar un archivo Excel (`.xlsx`) con diseño ejecutivo y **3 pestañas separadas** (*1. Balance y Arqueo, 2. Ventas y Partidas, 3. Gastos y Compras*), listo para enviar a administración o contabilidad.
- **Botón azul `[ Imprimir Comprobante de Cierre ]`:** Haz clic para abrir la vista de impresión limpia (o elegir **"Guardar como PDF"**) en hojas tamaño Carta.

---

## 🗂️ Misión 6: Consultar Cortes de Turnos Anteriores

> **Objetivo:** Comprobar que aunque la caja ya esté cerrada o pasen los días, siempre puedes volver a abrir, reimprimir o descargar en Excel cualquier corte anterior.

1. En **Terminal de Caja**, haz clic en la pestaña superior **`[ Historial de Cortes ]`** (o en el botón **`[ Consultar Cortes Anteriores ]`** de la franja de turno).
2. Arriba verás la tabla **`HISTORIAL DE TURNOS Y CORTES DE CAJA (CIERRE Z)`** con todos los turnos cerrados (incluyendo el corte completo del turno matutino con **15 órdenes cobradas por `$36,540.00`** y el turno que acabas de cerrar).
3. En cualquiera de los turnos con estado **`CERRADO`**, prueba los dos botones de la columna derecha (**ACCIÓN**):
   - Haz clic en **`[ Ver Cierre (Corte Z) ]`**: Se vuelve a abrir el reporte completo con sus pestañas de *Ventas y Servicios*, *Balance de Caja*, impresión en PDF y descarga en Excel.
   - Haz clic en **`[ Excel / Detalle ]`**: Abre la ventana de auditoría administrativa con desglose de métodos de pago y compras a proveedores.

---

## ✅ Lista de Verificación Final (Para tu tranquilidad)

Marca con una palomita si sentiste cómodo y claro cada punto durante tu prueba:

- [ ] Pude agregar una refacción a una orden, calcular su precio de venta y adjuntar los datos de garantía de su proveedor.
- [ ] Pude abrir el turno de caja y cobrar órdenes en efectivo (con cálculo de cambio), tarjeta y pago dividido (Multi-Método).
- [ ] Pude previsualizar el comprobante de cobro del cliente tanto en hoja carta como en ticket de 80mm.
- [ ] Pude registrar un gasto en Caja Chica y ver la foto de evidencia de un ticket de proveedor.
- [ ] Pude cerrar el turno (Corte Z), ver el desglose de ventas y utilidad por vehículo, **imprimir/guardar el PDF** y **descargar el archivo Excel de 3 hojas**.
- [ ] Pude entrar a **Historial de Cortes** y volver a consultar el Corte Z completo de turnos anteriores.

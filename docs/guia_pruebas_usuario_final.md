# Guía Práctica de Prueba — Sistema Operativo Cova

¡Bienvenido(a)! Esta guía está diseñada para que puedas recorrer y probar por tu cuenta las nuevas herramientas de **Órdenes de Servicio, Refacciones, Cobros en Caja y Corte del Día (Corte Z)** a tu propio ritmo.

No necesitas conocimientos técnicos ni acompañamiento para seguirla. Todo lo que hagas aquí es seguro para probar el flujo diario del taller.

---

## ⏱️ ¿Qué vas a probar en los próximos 15 minutos?

1. **Presupuesto y Refacciones:** Cómo agregar una pieza a un vehículo, calcular tu ganancia automáticamente y guardar la foto de la factura/garantía del proveedor.
2. **Apertura de Caja:** Cómo iniciar el día con tu fondo de morralla/cambio y cómo el sistema protege tus cobros.
3. **Cobro a Clientes (POS):** Cómo cobrar en efectivo (con cálculo de cambio), con tarjeta o combinando dos formas de pago, y entregar el recibo por impreso o WhatsApp.
4. **Gastos y Caja Chica:** Cómo anotar un gasto del día o el pago de una refacción y consultar la foto del ticket.
5. **Cierre del Día (Corte Z):** Cómo hacer el conteo de billetes al final del turno, ver tu utilidad del día, imprimir la hoja de cierre y descargar tu **Excel contable**.
6. **Historial de Cortes:** Cómo volver a consultar o descargar el cierre de días anteriores en cualquier momento.

---

## 🔑 Paso 0: Ingreso al Sistema

1. Abre el enlace del sistema en tu navegador (Google Chrome o Edge).
2. Ingresa con tu correo y contraseña:
   - **Usuario:** `eduardo@cova.mx` *(o tu cuenta asignada)*
   - **Contraseña:** `Cova2026!`
3. Verifica que arriba a la izquierda aparezca el logotipo de **COVA** y tu sucursal activa (**Cova Matriz Culiacán**).

---

## 🛠️ Misión 1: Agregar una Refacción, Calcular Precio y Guardar Garantía

> **Objetivo:** Ver qué tan fácil es cargar una pieza a la orden de un cliente, decidir cuánto cobrarle y dejar guardada la nota del proveedor por si algún día falla la pieza.

1. En el menú lateral izquierdo, haz clic en **[ Tablero Taller ]** (o **[ Órdenes ]**).
2. Haz clic sobre **cualquier vehículo / orden abierta** para abrir su ventana de trabajo.
3. Dentro de la ventana de la orden, ubica la sección **Refacciones e Insumos** y haz clic en el botón **[ + Refacción ]**.
4. **Prueba el calculador inteligente de precios:**
   - Escribe el nombre de la pieza (ejemplo: `Amortiguador Delantero Gas`).
   - En **Costo Unitario**, escribe lo que te costó a ti (ejemplo: `850`).
   - **Opción A (Por porcentaje):** En **% Margen**, escribe `35`. Verás cómo el **Precio Público** se calcula solo.
   - **Opción B (Precio directo):** Ahora borra el **Precio Público** y escribe directamente `1200`. Observa cómo el sistema calcula al revés y te dice automáticamente qué porcentaje de ganancia estás obteniendo.
5. **Prueba el registro de Proveedor y Garantía:**
   - En ese mismo cuadro, haz clic en el botón **[ + Garantía y Factura ]**.
   - En **Proveedor**, elige uno de la lista (ejemplo: *Obal Zapata*, *AutoZone* o *Dar Refaccionaria*).
   - En **Folio Ticket / Factura**, escribe por ejemplo: `FAC-901`.
   - En **Garantía (Meses)**, deja `12`.
   - En **Evidencia (Foto / PDF)**, selecciona cualquier imagen o PDF desde tu computadora para simular la foto de la nota.
   - *(Opcional)* Si esa refacción se pagó con dinero de la caja del mostrador, deja marcada la casilla **☑ Registrar salida automática en Caja Chica**.
6. Haz clic en **[ Agregar Refacción ]**. Verás que la pieza queda agregada a la cuenta del cliente con su etiqueta de proveedor y garantía.

---

## 🔓 Misión 2: Abrir el Turno de Caja

> **Objetivo:** Antes de poder cobrarle a un cliente, la caja debe estar abierta para saber con cuánto dinero en efectivo iniciamos el día.

1. En el menú izquierdo, haz clic en **[ Terminal de Caja ]** (o bien, desde la misma Orden de Servicio haz clic en el botón **[ Cobrar Orden ]**).
2. En la franja superior verás un aviso amarillo que dice **"Caja Cerrada"**.
3. Haz clic en el botón **[ Aperturar Turno ]**.
4. Se abrirá una ventana pidiendo confirmar con cuánto dinero arrancas:
   - **Fondo 1 (Operativo / Mostrador):** Es el dinero en caja para dar cambio (ejemplo: `$400.00`).
   - **Fondo 2 (Reserva / Caja Chica):** Es el fondo de respaldo en el taller (ejemplo: `$8,500.00`).
5. Haz clic en **[ Confirmar Apertura ]**.
6. **¿Qué debes ver ahora?** La franja superior cambia a **"Turno en Curso"** con un punto verde parpadeando. Si quieres ver u ocultar los montos en pantalla por privacidad frente a los clientes, haz clic en el **ícono del ojito (👁️)** al lado de los saldos.

---

## 💳 Misión 3: Cobrar Órdenes de Servicio (3 Casos Reales)

> **Objetivo:** Probar los 3 tipos de cobro más comunes en el mostrador. Asegúrate de estar en la primera pestaña llamada **[ Terminal POS ]**.

### Caso A: El cliente paga todo en Efectivo (y necesita cambio)
1. En la lista del lado izquierdo, haz clic sobre una orden por cobrar (por ejemplo, el **Nissan Versa** o cualquier orden con saldo pendiente).
2. En el panel derecho, elige el método **[ Efectivo ]**.
3. Donde dice **Efectivo Recibido**, haz clic en los botones rápidos de billetes (por ejemplo **`+$1,000`** y **`+$500`**) o escribe una cantidad mayor a lo que debe el cliente.
4. **Observa:** El sistema te muestra en grande y en color verde exactamente **cuánto cambio debes entregarle**.
5. Haz clic en el botón principal **[ Confirmar Cobro ]**.
6. **Comprobante de Pago:** Se abrirá en pantalla el recibo oficial de Cova:
   - Arriba puedes cambiar entre **[ Hoja Carta ]** y **[ Ticket 80mm ]** para ver cómo se adapta a impresora normal o miniprinter.
   - Puedes hacer clic en **[ WhatsApp ]** para enviárselo al teléfono del cliente, o en **[ Imprimir Comprobante ]**.
   - Al terminar, haz clic en **[ Listo ]**.

### Caso B: El cliente paga con Tarjeta (Terminal Bancaria)
1. Selecciona otra orden pendiente de la lista izquierda.
2. En los métodos de pago, selecciona la tarjeta o **[ Terminal TPV ]**.
3. En el campo de **Folio / Voucher / Autorización**, escribe los números del bauche impreso por tu terminal física (ejemplo: `44912`).
4. Haz clic en **[ Confirmar Cobro ]**.
   > 💡 **Nota importante:** Como este dinero entró directo al banco, el sistema lo registra en tus ventas del día pero **no lo revuelve** con el efectivo físico que tienes en tu cajón.

### Caso C: El cliente paga una parte en Efectivo y otra por Transferencia (Multi-Método)
1. Selecciona una tercera orden pendiente en la lista izquierda.
2. Haz clic en el botón **[ Multi-Método (Dividir pago) ]**.
3. Verás que puedes partir la cuenta en dos o más pagos:
   - En el **Pago 1**, deja **Efectivo** y escribe una parte del total (ejemplo: `$1,000`).
   - Haz clic en **[ + Agregar otro método ]**.
   - En el **Pago 2**, elige **Transferencia SPEI**, selecciona la cuenta bancaria del taller (ej. *BanBajío* o *Inbursa*) y verifica que el indicador diga **Restante por asignar: `$0.00`**.
4. Haz clic en **[ Confirmar Cobro ]**. En el recibo aparecerán desglosados ambos pagos claramente.

---

## 🧾 Misión 4: Registrar un Gasto Rápido en Caja Chica

> **Objetivo:** Anotar cuando sacas efectivo del cajón para pagar algo del taller (garrafones de agua, comida, material de limpieza o una refacción urgente).

1. En la parte superior derecha de **Terminal de Caja**, haz clic en la pestaña **[ Caja Chica ]**.
2. Haz clic en el botón **[ + Registrar Movimiento ]**.
3. Prueba registrando un gasto sencillo:
   - **Tipo:** *Salida / Gasto*
   - **Categoría:** *Gasto Operativo* (o *Pago a Proveedor* si quieres adjuntar foto de factura y garantía).
   - **Monto:** `150`
   - **Concepto:** `Garrafones de agua y artículos de limpieza`
4. Guarda el movimiento.
5. **¿Qué debes ver?** El gasto aparece inmediatamente en la lista inferior y se descuenta automáticamente del efectivo que el sistema espera que tengas en tu cajón al final del día. Si el movimiento tiene foto de nota o factura adjunta, puedes darle clic a la etiqueta **`Ticket #...`** en la tabla para ver la foto en grande.

---

## 📊 Misión 5: Hacer el Cierre del Día (Corte Z), Imprimir PDF y Descargar Excel

> **Objetivo:** Cerrar la caja al final del día contando el dinero físico, revisar qué se vendió, cuánto se ganó y descargar los reportes.

1. En la franja superior del turno, haz clic en el botón negro **[ Corte Z (Arqueo) ]**.
2. Sigue el asistente de **4 pasos rápidos**:
   - **Paso 1 (Conteo Físico):** Escribe cuántos billetes y monedas de cada denominación tienes en mano (o el monto total contado). El sistema te suma todo automáticamente. Haz clic en **[ Siguiente ]**.
   - **Paso 2 (Bancos y Tarjetas):** Revisa el resumen de lo que se cobró por tarjeta y transferencia. Haz clic en **[ Siguiente ]**.
   - **Paso 3 (Comparativa):** El sistema compara lo que contaste contra lo que debería haber:
     - Si coincide, verás un aviso verde de **Cuadrado Exacto**.
     - Si sobra o falta dinero, te pedirá escribir una breve nota explicando el motivo (ejemplo: *"Faltaron $20 de cambio"*). Haz clic en **[ Siguiente ]**.
   - **Paso 4 (Retiro / Remesa):** El sistema te sugiere cuánto efectivo retirar al sobre/caja fuerte (**Remesa**) y cuánto dejar en el cajón para abrir mañana (**Fondo Siguiente Turno**).
3. Haz clic en **[ Finalizar y Cerrar Turno ]**.

### Explora tu Reporte de Cierre (Corte Z):
Al cerrar el turno, se abrirá automáticamente el **Reporte de Cierre de Caja**:
- **Pestaña `[ Ventas y Servicios ]`:** Muestra las 4 tarjetas ejecutivas del día (*Ventas Cobradas, Costo de Refacciones, Utilidad Bruta Estimada y Gastos de Caja Chica*) y debajo el **desglose vehículo por vehículo** con las piezas y mano de obra que se cobraron.
- **Pestaña `[ Balance de Caja ]`:** Muestra las cuentas claras del efectivo en mostrador, caja fuerte, transferencias SPEI, tarjetas, el retiro del día y las líneas de firma para entregar el turno.
- **Pestaña `[ Ticket 80mm ]`:** Versión compacta por si deseas imprimirlo en impresora de tickets.
- **Botón verde `[ Descargar Reporte en Excel ]`:** Haz clic aquí para descargar un archivo de Excel (`.xlsx`) profesional con **3 hojas separadas** (*Resumen de Efectivo, Ventas por Vehículo y Gastos de Caja Chica*), listo para enviar al contador o guardar en tus archivos.
- **Botón `[ Imprimir Comprobante de Cierre ]`:** Haz clic para abrir la vista de impresión limpia (sin menús ni fondos grises) donde puedes mandarlo a tu impresora o elegir **"Guardar como PDF"**.

---

## 🗂️ Misión 6: Consultar Cortes de Días Anteriores

> **Objetivo:** Comprobar que aunque la caja ya esté cerrada o pasen los días, siempre puedes volver a ver, imprimir o descargar en Excel cualquier corte anterior.

1. En **Terminal de Caja**, haz clic en el botón **[ Consultar Cortes Anteriores ]** (en la barra superior) o entra directamente a la pestaña **[ Historial de Cortes ]**.
2. Justo al inicio de la pantalla verás la tabla **Historial de Cortes de Caja** con todos los turnos registrados.
3. En la fila del turno que acabas de cerrar (o cualquiera de la lista), prueba los dos botones de la derecha:
   - Haz clic en **[ Ver Cierre (Corte Z) ]**: Se vuelve a abrir el reporte completo para reimprimir el PDF, revisar qué carros se cobraron ese día o descargar su Excel.
   - Haz clic en **[ Excel / Detalle ]**: Abre la vista de auditoría detallada por métodos de pago y proveedores.

---

## ✅ Lista de Verificación Final (Para tu tranquilidad)

Marca con una palomita si sentiste cómodo y claro cada punto durante tu prueba:

- [ ] Pude agregar una refacción a una orden, ajustar su precio/ganancia y adjuntar la foto de garantía de su proveedor.
- [ ] Pude abrir el turno de caja y cobrar órdenes en efectivo, tarjeta y pago dividido sin confusiones.
- [ ] Pude imprimir o previsualizar el comprobante de cobro del cliente tanto en hoja carta como en ticket.
- [ ] Pude registrar un gasto en Caja Chica y ver cómo se reflejó en mi saldo de efectivo.
- [ ] Pude cerrar el turno (Corte Z), ver el desglose de ventas y utilidad por vehículo, **imprimir el PDF** sin que salga en blanco y **descargar el archivo Excel**.
- [ ] Pude entrar a **Historial de Cortes** y volver a abrir el reporte de un turno ya cerrado.

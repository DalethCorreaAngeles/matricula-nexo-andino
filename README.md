# Nexo Andino – Matrícula

Aplicación web desarrollada en **Angular** conectada a **Supabase** para la gestión de oferta académica, matrícula de estudiantes, registro de comprobantes de pago y validación desde el panel del asesor.

---

## 📋 Características Principales

1. **Oferta de Cursos:**
   - Visualización de la oferta académica con horario, modalidad (`PRESENCIAL`/`VIRTUAL`), docente asignado, precio y vacantes disponibles.
   - Filtro interactivo por modalidad y buscador en tiempo real.
   - Las secciones con 0 vacantes se destacan automáticamente como **"Agotado"**.

2. **Matricularme:**
   - Selección de estudiante existente (tabla `estudiante`) y sección con vacantes disponibles (tabla `seccion`).
   - Generación automática de ID con formato: `"M"` + 5 dígitos (el mayor existente + 1, ej. `M00001`).
   - Registro en tabla `matricula` con estado inicial `'PENDIENTE'` y `monto_total` igual al precio del curso.
   - Manejo y presentación clara de errores de base de datos en pantalla (ej. restricciones de vacantes o matrícula duplicada).

3. **Registrar Pago:**
   - Selección de matrícula en estado `'PENDIENTE'`.
   - Selección de método de pago: `TRANSFERENCIA`, `TARJETA`, `BILLETERA`, `EFECTIVO`.
   - Ingreso de número o código de operación (`nro_operacion`).
   - Generación de ID con formato: `"P"` + 5 dígitos (el mayor existente + 1, ej. `P00001`).
   - Inserción en tabla `pago` con estado `'REGISTRADO'` y monto igual a `monto_total` de la matrícula.

4. **Panel del Asesor:**
   - Listado de matrículas con estudiante, curso, sección, monto, detalle del pago y estado.
   - Botón **"Validar pago y confirmar"**: actualiza el pago a `'VALIDADO'` y la matrícula a `'CONFIRMADA'`.
   - Botón **"Anular"**: actualiza la matrícula a `'ANULADA'`.
   - Refresco de datos automático tras cada acción para reflejar los cambios en tiempo real.

---

## 🚀 Cómo Ejecutar la Aplicación

Para iniciar el servidor de desarrollo de Angular:
```bash
npm start
```
Abre tu navegador en [http://localhost:4200](http://localhost:4200).

Para compilar para producción:
```bash
npm run build
```

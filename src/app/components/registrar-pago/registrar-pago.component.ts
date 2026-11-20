import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { MatriculaConDetalle, MetodoPago, Pago } from '../../models/database.models';

@Component({
  selector: 'app-registrar-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registrar-pago.component.html',
  styleUrl: './registrar-pago.component.css'
})
export class RegistrarPagoComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  matriculasPendientes = signal<MatriculaConDetalle[]>([]);
  selectedMatriculaId = signal<string>('');

  metodosDisponibles: MetodoPago[] = ['TRANSFERENCIA', 'TARJETA', 'BILLETERA', 'EFECTIVO'];
  selectedMetodo = signal<MetodoPago>('TRANSFERENCIA');
  nroOperacion = signal<string>('');

  proximoIdPago = signal<string>('...');
  isLoadingData = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  successMessage = signal<string | null>(null);
  pagoRegistrado = signal<Pago | null>(null);
  errorMessage = signal<string | null>(null);

  // Selected matricula computed
  matriculaSeleccionada = computed(() => {
    const id = this.selectedMatriculaId();
    return this.matriculasPendientes().find(m => m.id_matricula === id) || null;
  });

  montoAPagar = computed(() => {
    const mat = this.matriculaSeleccionada();
    return mat?.monto_total ?? 0;
  });

  ngOnInit(): void {
    this.cargarDatos();

    this.route.queryParams.subscribe(params => {
      if (params['matricula']) {
        this.selectedMatriculaId.set(params['matricula']);
      }
    });
  }

  async cargarDatos(): Promise<void> {
    this.isLoadingData.set(true);
    this.errorMessage.set(null);

    try {
      const [pendientes, nextId] = await Promise.all([
        this.supabaseService.getMatriculasPendientes(),
        this.supabaseService.getNextPagoId()
      ]);

      this.matriculasPendientes.set(pendientes);
      this.proximoIdPago.set(nextId);

      // If pre-selected id is not in pending, check
      if (this.selectedMatriculaId()) {
        const found = pendientes.find(m => m.id_matricula === this.selectedMatriculaId());
        if (!found) {
          // It might already be confirmed or non-existent
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al obtener matrículas pendientes.');
    } finally {
      this.isLoadingData.set(false);
    }
  }

  setMetodo(m: MetodoPago): void {
    this.selectedMetodo.set(m);
  }

  async procesarPago(): Promise<void> {
    const idMat = this.selectedMatriculaId();
    const metodo = this.selectedMetodo();
    const nroOp = this.nroOperacion().trim();
    const monto = this.montoAPagar();

    if (!idMat) {
      this.errorMessage.set('Por favor selecciona una matrícula pendiente.');
      return;
    }

    if (!nroOp) {
      this.errorMessage.set('Por favor ingresa el número o código de operación del pago.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const nuevoPago = await this.supabaseService.registrarPago(
        idMat,
        monto,
        metodo,
        nroOp
      );

      this.pagoRegistrado.set(nuevoPago);
      this.successMessage.set(
        `¡Pago registrado correctamente! Código: ${nuevoPago.id_pago}. Método: ${nuevoPago.metodo}. N° Operación: ${nuevoPago.nro_operacion}. Estado: ${nuevoPago.estado_pago}.`
      );

      // Refresh list of pending enrollments and next ID
      await this.cargarDatos();

      // Clear form
      this.selectedMatriculaId.set('');
      this.nroOperacion.set('');
    } catch (err: any) {
      console.error('Error al registrar pago:', err);
      let msg = err.message || 'Error al guardar el pago en la base de datos.';
      if (err.details) msg += ` Detalle: ${err.details}`;
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  nuevoPago(): void {
    this.successMessage.set(null);
    this.pagoRegistrado.set(null);
    this.errorMessage.set(null);
  }
}

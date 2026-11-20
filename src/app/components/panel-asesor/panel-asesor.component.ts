import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { MatriculaConDetalle } from '../../models/database.models';

@Component({
  selector: 'app-panel-asesor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-asesor.component.html',
  styleUrl: './panel-asesor.component.css'
})
export class PanelAsesorComponent implements OnInit {
  private supabaseService = inject(SupabaseService);

  matriculas = signal<MatriculaConDetalle[]>([]);
  filtroEstado = signal<string>('TODAS');
  filtroBusqueda = signal<string>('');

  isLoading = signal<boolean>(false);
  actionProcessingId = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filtered enrollments
  matriculasFiltradas = computed(() => {
    let list = this.matriculas();
    const estado = this.filtroEstado();
    const search = this.filtroBusqueda().toLowerCase().trim();

    if (estado !== 'TODAS') {
      list = list.filter(m => (m.estado || '').toUpperCase() === estado);
    }

    if (search) {
      list = list.filter(m => {
        const idMat = (m.id_matricula || '').toLowerCase();
        const estNombre = `${m.estudiante?.nombres || ''} ${m.estudiante?.apellidos || ''}`.toLowerCase();
        const estDni = (m.estudiante?.dni || '').toLowerCase();
        const cursoNombre = (m.curso?.nombre || '').toLowerCase();
        const cursoCodigo = (m.seccion?.codigo_curso || '').toLowerCase();
        const nroOp = (m.pago?.nro_operacion || '').toLowerCase();
        return (
          idMat.includes(search) ||
          estNombre.includes(search) ||
          estDni.includes(search) ||
          cursoNombre.includes(search) ||
          cursoCodigo.includes(search) ||
          nroOp.includes(search)
        );
      });
    }

    return list;
  });

  // Summary Metrics
  totalMatriculas = computed(() => this.matriculas().length);
  totalPendientes = computed(() => this.matriculas().filter(m => m.estado === 'PENDIENTE').length);
  totalConfirmadas = computed(() => this.matriculas().filter(m => m.estado === 'CONFIRMADA').length);
  totalAnuladas = computed(() => this.matriculas().filter(m => m.estado === 'ANULADA').length);
  montoConfirmado = computed(() => 
    this.matriculas()
      .filter(m => m.estado === 'CONFIRMADA')
      .reduce((sum, m) => sum + (m.monto_total || 0), 0)
  );

  ngOnInit(): void {
    this.cargarMatriculas();
  }

  async cargarMatriculas(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.supabaseService.getMatriculasConDetalle();
      this.matriculas.set(data);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al cargar las matrículas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setEstado(estado: string): void {
    this.filtroEstado.set(estado);
  }

  async validarPagoYConfirmar(matricula: MatriculaConDetalle): Promise<void> {
    this.actionProcessingId.set(matricula.id_matricula);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.supabaseService.validarPagoYConfirmar(
        matricula.id_matricula,
        matricula.pago?.id_pago
      );

      this.successMessage.set(
        `Matrícula ${matricula.id_matricula} CONFIRMADA con éxito. El pago ha sido VALIDADO.`
      );

      // Refresh data
      await this.cargarMatriculas();
    } catch (err: any) {
      console.error('Error al validar pago y confirmar:', err);
      let msg = err.message || 'Error al validar y confirmar la matrícula.';
      if (err.details) msg += ` Detalle: ${err.details}`;
      this.errorMessage.set(msg);
    } finally {
      this.actionProcessingId.set(null);
    }
  }

  async anularMatricula(matricula: MatriculaConDetalle): Promise<void> {
    const confirm = window.confirm(
      `¿Estás seguro de anular la matrícula ${matricula.id_matricula} de ${matricula.estudiante?.nombres || 'estudiante'}?`
    );
    if (!confirm) return;

    this.actionProcessingId.set(matricula.id_matricula);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.supabaseService.anularMatricula(matricula.id_matricula);

      this.successMessage.set(
        `Matrícula ${matricula.id_matricula} ANULADA correctamente.`
      );

      // Refresh data
      await this.cargarMatriculas();
    } catch (err: any) {
      console.error('Error al anular matrícula:', err);
      let msg = err.message || 'Error al anular la matrícula.';
      if (err.details) msg += ` Detalle: ${err.details}`;
      this.errorMessage.set(msg);
    } finally {
      this.actionProcessingId.set(null);
    }
  }
}

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Estudiante, SeccionConDetalle, Matricula } from '../../models/database.models';

@Component({
  selector: 'app-matricularme',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './matricularme.component.html',
  styleUrl: './matricularme.component.css'
})
export class MatricularmeComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  estudiantes = signal<Estudiante[]>([]);
  seccionesDisponibles = signal<SeccionConDetalle[]>([]);

  selectedEstudianteId = signal<string>('');
  selectedSeccionId = signal<string>('');

  proximoIdMatricula = signal<string>('...');
  isLoadingData = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  successMessage = signal<string | null>(null);
  matriculaCreada = signal<Matricula | null>(null);
  errorMessage = signal<string | null>(null);

  // Selected entities computed
  estudianteSeleccionado = computed(() => {
    const id = this.selectedEstudianteId();
    return this.estudiantes().find(e => e.id_estudiante === id) || null;
  });

  seccionSeleccionada = computed(() => {
    const id = this.selectedSeccionId();
    return this.seccionesDisponibles().find(s => s.id_seccion === id) || null;
  });

  montoTotal = computed(() => {
    const sec = this.seccionSeleccionada();
    return sec?.curso?.precio ?? 0;
  });

  ngOnInit(): void {
    this.cargarDatos();

    // Check if section query param is provided
    this.route.queryParams.subscribe(params => {
      if (params['seccion']) {
        this.selectedSeccionId.set(params['seccion']);
      }
    });
  }

  async cargarDatos(): Promise<void> {
    this.isLoadingData.set(true);
    this.errorMessage.set(null);

    try {
      const [estList, secList, nextId] = await Promise.all([
        this.supabaseService.getEstudiantes(),
        this.supabaseService.getSeccionesDisponibles(),
        this.supabaseService.getNextMatriculaId()
      ]);

      this.estudiantes.set(estList);
      this.seccionesDisponibles.set(secList);
      this.proximoIdMatricula.set(nextId);

      // If pre-selected section is not in available sections (e.g. out of stock), keep or warn
      if (this.selectedSeccionId()) {
        const found = secList.find(s => s.id_seccion === this.selectedSeccionId());
        if (!found) {
          // If queryParam section had 0 vacancies
          this.errorMessage.set(`La sección ${this.selectedSeccionId()} no tiene vacantes disponibles o no existe.`);
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al cargar datos desde Supabase.');
    } finally {
      this.isLoadingData.set(false);
    }
  }

  async confirmarMatricula(): Promise<void> {
    const idEst = this.selectedEstudianteId();
    const idSec = this.selectedSeccionId();
    const sec = this.seccionSeleccionada();

    if (!idEst) {
      this.errorMessage.set('Por favor selecciona un estudiante.');
      return;
    }
    if (!idSec || !sec) {
      this.errorMessage.set('Por favor selecciona una sección con vacantes disponibles.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const monto = this.montoTotal();
      const nuevaMatricula = await this.supabaseService.matricularEstudiante(
        idEst,
        idSec,
        monto
      );

      this.matriculaCreada.set(nuevaMatricula);
      this.successMessage.set(
        `¡Matrícula registrada con éxito! Código: ${nuevaMatricula.id_matricula}. Estado: ${nuevaMatricula.estado}. Monto: S/ ${nuevaMatricula.monto_total}.`
      );

      // Refresh data so vacancy counts and next IDs are updated
      await this.cargarDatos();

      // Clear selection for next enrollment
      this.selectedEstudianteId.set('');
      this.selectedSeccionId.set('');
    } catch (err: any) {
      // Show exact database error
      console.error('Error al registrar matrícula:', err);
      let msg = err.message || 'Ocurrió un error en la base de datos al registrar la matrícula.';
      if (err.details) msg += ` Detalle: ${err.details}`;
      if (err.hint) msg += ` Sugerencia: ${err.hint}`;
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  nuevaMatricula(): void {
    this.successMessage.set(null);
    this.matriculaCreada.set(null);
    this.errorMessage.set(null);
  }
}

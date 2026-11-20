import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { SeccionConDetalle } from '../../models/database.models';

@Component({
  selector: 'app-oferta-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './oferta-cursos.component.html',
  styleUrl: './oferta-cursos.component.css'
})
export class OfertaCursosComponent implements OnInit {
  private supabaseService = inject(SupabaseService);

  secciones = signal<SeccionConDetalle[]>([]);
  filtroModalidad = signal<string>('TODAS');
  filtroBusqueda = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Computed filtered list
  seccionesFiltradas = computed(() => {
    let list = this.secciones();
    const modalidad = this.filtroModalidad();
    const search = this.filtroBusqueda().toLowerCase().trim();

    if (modalidad !== 'TODAS') {
      list = list.filter(s => (s.modalidad || '').toUpperCase() === modalidad);
    }

    if (search) {
      list = list.filter(s => {
        const nombreCurso = (s.curso?.nombre || '').toLowerCase();
        const codigoCurso = (s.codigo_curso || '').toLowerCase();
        const docenteNombre = `${s.docente?.nombres || ''} ${s.docente?.apellidos || ''}`.toLowerCase();
        const horario = (s.horario || '').toLowerCase();
        return (
          nombreCurso.includes(search) ||
          codigoCurso.includes(search) ||
          docenteNombre.includes(search) ||
          horario.includes(search)
        );
      });
    }

    return list;
  });

  // Computed summary metrics
  totalSecciones = computed(() => this.secciones().length);
  totalVacantesDisponibles = computed(() => 
    this.secciones().reduce((acc, s) => acc + (s.vacantes_disponibles || 0), 0)
  );

  ngOnInit(): void {
    this.cargarOferta();
  }

  async cargarOferta(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.supabaseService.getOfertaCursos();
      this.secciones.set(data);
    } catch (err: any) {
      this.errorMessage.set(
        err.message || 'Error al obtener la oferta de cursos de Supabase.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  setModalidad(modalidad: string): void {
    this.filtroModalidad.set(modalidad);
  }
}

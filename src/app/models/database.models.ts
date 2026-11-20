export interface Estudiante {
  id_estudiante: string;
  nombres: string;
  apellidos: string;
  dni: string;
  correo: string;
  telefono: string;
}

export interface Docente {
  id_docente: string;
  nombres: string;
  apellidos: string;
  especialidad: string;
  correo: string;
}

export interface AsesorAcademico {
  id_asesor: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
}

export interface Curso {
  codigo: string;
  nombre: string;
  nivel: string;
  horas_totales: number;
  precio: number;
  activo: boolean;
}

export type ModalidadCurso = 'PRESENCIAL' | 'VIRTUAL';

export interface Seccion {
  id_seccion: string;
  codigo_curso: string;
  id_docente: string;
  modalidad: ModalidadCurso | string;
  horario: string;
  vacantes_totales: number;
  vacantes_disponibles: number;
  aula?: string;
  enlace_virtual?: string;
}

export type EstadoMatricula = 'PENDIENTE' | 'CONFIRMADA' | 'ANULADA';

export interface Matricula {
  id_matricula: string;
  id_estudiante: string;
  id_seccion: string;
  id_asesor: string | null;
  fecha_registro: string;
  estado: EstadoMatricula | string;
  monto_total: number;
}

export type MetodoPago = 'TRANSFERENCIA' | 'TARJETA' | 'BILLETERA' | 'EFECTIVO';
export type EstadoPago = 'REGISTRADO' | 'VALIDADO';

export interface Pago {
  id_pago: string;
  id_matricula: string;
  monto: number;
  metodo: MetodoPago | string;
  fecha: string;
  nro_operacion: string;
  estado_pago: EstadoPago | string;
}

export interface SeccionConDetalle extends Seccion {
  curso?: Curso;
  docente?: Docente;
}

export interface MatriculaConDetalle extends Matricula {
  estudiante?: Estudiante;
  seccion?: Seccion;
  curso?: Curso;
  docente?: Docente;
  pago?: Pago;
}

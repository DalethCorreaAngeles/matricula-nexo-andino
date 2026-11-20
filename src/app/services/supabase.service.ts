import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import {
  Estudiante,
  Docente,
  AsesorAcademico,
  Curso,
  Seccion,
  Matricula,
  Pago,
  SeccionConDetalle,
  MatriculaConDetalle,
  MetodoPago
} from '../models/database.models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  
  // Reactive connection state
  public isConnected = signal<boolean>(false);
  public connectionError = signal<string | null>(null);
  public currentUrl = signal<string>('');
  public currentKey = signal<string>('');

  constructor() {
    this.initClient();
  }

  private sanitizeUrl(url: string): string {
    if (!url) return '';
    return url.trim()
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }

  public initClient(): void {
    const rawSavedUrl = (typeof window !== 'undefined' && localStorage.getItem('nexo_supabase_url')) 
      || environment.supabaseUrl 
      || '';
    const savedUrl = this.sanitizeUrl(rawSavedUrl);
    const savedKey = ((typeof window !== 'undefined' && localStorage.getItem('nexo_supabase_key')) 
      || environment.supabaseKey 
      || '').trim();

    this.currentUrl.set(savedUrl);
    this.currentKey.set(savedKey);

    if (savedUrl && savedKey) {
      try {
        this.client = createClient(savedUrl, savedKey);
        this.testConnection();
      } catch (err: any) {
        this.client = null;
        this.isConnected.set(false);
        this.connectionError.set(err.message || 'Error al inicializar cliente Supabase');
      }
    } else {
      this.client = null;
      this.isConnected.set(false);
      this.connectionError.set('No se han configurado las credenciales de Supabase');
    }
  }

  public saveCredentials(url: string, key: string): void {
    const cleanUrl = this.sanitizeUrl(url);
    const cleanKey = key.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexo_supabase_url', cleanUrl);
      localStorage.setItem('nexo_supabase_key', cleanKey);
    }
    this.initClient();
  }

  public clearCredentials(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexo_supabase_url');
      localStorage.removeItem('nexo_supabase_key');
    }
    this.initClient();
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    if (!this.client) {
      this.isConnected.set(false);
      this.connectionError.set('Cliente no configurado');
      return { success: false, message: 'Cliente no configurado' };
    }

    try {
      // Test querying curso
      const { data, error } = await this.client.from('curso').select('codigo').limit(1);
      if (error) {
        this.isConnected.set(false);
        this.connectionError.set(error.message);
        return { success: false, message: error.message };
      }
      this.isConnected.set(true);
      this.connectionError.set(null);
      return { success: true };
    } catch (err: any) {
      this.isConnected.set(false);
      this.connectionError.set(err.message || 'Error de conexión');
      return { success: false, message: err.message };
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase no está configurado. Por favor ingresa la URL y la Anon Key de tu proyecto en la esquina superior derecha.');
    }
    return this.client;
  }

  // ID GENERATORS
  // "M" + 5 digits: mayor existente + 1
  public async getNextMatriculaId(): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.from('matricula').select('id_matricula');
    if (error) throw error;

    let maxNum = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        const idStr = String(row.id_matricula || '').trim();
        const numPart = idStr.replace(/^M/i, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `M${String(nextNum).padStart(5, '0')}`;
  }

  // "P" + 5 digits: mayor existente + 1
  public async getNextPagoId(): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.from('pago').select('id_pago');
    if (error) throw error;

    let maxNum = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        const idStr = String(row.id_pago || '').trim();
        const numPart = idStr.replace(/^P/i, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `P${String(nextNum).padStart(5, '0')}`;
  }

  // SCREEN 1: Oferta de cursos
  public async getOfertaCursos(): Promise<SeccionConDetalle[]> {
    const client = this.getClient();
    
    // Fetch sections, courses, and teachers in parallel
    const [seccionesRes, cursosRes, docentesRes] = await Promise.all([
      client.from('seccion').select('*'),
      client.from('curso').select('*'),
      client.from('docente').select('*')
    ]);

    if (seccionesRes.error) throw seccionesRes.error;
    if (cursosRes.error) throw cursosRes.error;
    if (docentesRes.error) throw docentesRes.error;

    const cursosMap = new Map<string, Curso>();
    (cursosRes.data || []).forEach(c => cursosMap.set(c.codigo, c));

    const docentesMap = new Map<string, Docente>();
    (docentesRes.data || []).forEach(d => docentesMap.set(d.id_docente, d));

    const secciones: SeccionConDetalle[] = (seccionesRes.data || []).map(sec => {
      const curso = cursosMap.get(sec.codigo_curso);
      const docente = docentesMap.get(sec.id_docente);
      return {
        ...sec,
        curso,
        docente
      };
    });

    // Sort by course name and section id
    secciones.sort((a, b) => {
      const nameA = a.curso?.nombre || '';
      const nameB = b.curso?.nombre || '';
      return nameA.localeCompare(nameB) || a.id_seccion.localeCompare(b.id_seccion);
    });

    return secciones;
  }

  // SCREEN 2: Matricularme
  public async getEstudiantes(): Promise<Estudiante[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('estudiante')
      .select('*')
      .order('apellidos', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  public async getAsesores(): Promise<AsesorAcademico[]> {
    const client = this.getClient();
    try {
      const { data, error } = await client.from('asesor_academico').select('*');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  public async getSeccionesDisponibles(): Promise<SeccionConDetalle[]> {
    const todas = await this.getOfertaCursos();
    // Only return sections with vacantes_disponibles > 0
    return todas.filter(s => (s.vacantes_disponibles ?? 0) > 0);
  }

  public async matricularEstudiante(
    idEstudiante: string, 
    idSeccion: string, 
    montoTotal: number
  ): Promise<Matricula> {
    const client = this.getClient();

    // 1. Generate new ID
    const newId = await this.getNextMatriculaId();

    // 2. Obtain an advisor if table has any
    let idAsesor: string | null = null;
    const asesores = await this.getAsesores();
    if (asesores.length > 0) {
      idAsesor = asesores[0].id_asesor;
    }

    const fechaRegistro = new Date().toISOString();

    const nuevaMatricula = {
      id_matricula: newId,
      id_estudiante: idEstudiante,
      id_seccion: idSeccion,
      id_asesor: idAsesor,
      fecha_registro: fechaRegistro,
      estado: 'PENDIENTE',
      monto_total: montoTotal
    };

    const { data, error } = await client
      .from('matricula')
      .insert([nuevaMatricula])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // SCREEN 3: Registrar Pago
  public async getMatriculasPendientes(): Promise<MatriculaConDetalle[]> {
    const client = this.getClient();
    
    const [matriculasRes, estudiantesRes, seccionesRes, cursosRes, pagosRes] = await Promise.all([
      client.from('matricula').select('*').eq('estado', 'PENDIENTE').order('fecha_registro', { ascending: false }),
      client.from('estudiante').select('*'),
      client.from('seccion').select('*'),
      client.from('curso').select('*'),
      client.from('pago').select('*')
    ]);

    if (matriculasRes.error) throw matriculasRes.error;
    if (estudiantesRes.error) throw estudiantesRes.error;
    if (seccionesRes.error) throw seccionesRes.error;
    if (cursosRes.error) throw cursosRes.error;

    const estudiantesMap = new Map<string, Estudiante>();
    (estudiantesRes.data || []).forEach(e => estudiantesMap.set(e.id_estudiante, e));

    const cursosMap = new Map<string, Curso>();
    (cursosRes.data || []).forEach(c => cursosMap.set(c.codigo, c));

    const seccionesMap = new Map<string, Seccion>();
    (seccionesRes.data || []).forEach(s => seccionesMap.set(s.id_seccion, s));

    const pagosMap = new Map<string, Pago>();
    (pagosRes.data || []).forEach(p => pagosMap.set(p.id_matricula, p));

    return (matriculasRes.data || []).map(mat => {
      const seccion = seccionesMap.get(mat.id_seccion);
      const curso = seccion ? cursosMap.get(seccion.codigo_curso) : undefined;
      return {
        ...mat,
        estudiante: estudiantesMap.get(mat.id_estudiante),
        seccion,
        curso,
        pago: pagosMap.get(mat.id_matricula)
      };
    });
  }

  public async registrarPago(
    idMatricula: string,
    monto: number,
    metodo: MetodoPago,
    nroOperacion: string
  ): Promise<Pago> {
    const client = this.getClient();

    // Generate new ID
    const newId = await this.getNextPagoId();
    const fecha = new Date().toISOString();

    const nuevoPago = {
      id_pago: newId,
      id_matricula: idMatricula,
      monto: monto,
      metodo: metodo,
      fecha: fecha,
      nro_operacion: nroOperacion,
      estado_pago: 'REGISTRADO'
    };

    const { data, error } = await client
      .from('pago')
      .insert([nuevoPago])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // SCREEN 4: Panel del asesor
  public async getMatriculasConDetalle(): Promise<MatriculaConDetalle[]> {
    const client = this.getClient();

    const [matriculasRes, estudiantesRes, seccionesRes, cursosRes, docentesRes, pagosRes] = await Promise.all([
      client.from('matricula').select('*').order('fecha_registro', { ascending: false }),
      client.from('estudiante').select('*'),
      client.from('seccion').select('*'),
      client.from('curso').select('*'),
      client.from('docente').select('*'),
      client.from('pago').select('*')
    ]);

    if (matriculasRes.error) throw matriculasRes.error;

    const estudiantesMap = new Map<string, Estudiante>();
    (estudiantesRes.data || []).forEach(e => estudiantesMap.set(e.id_estudiante, e));

    const cursosMap = new Map<string, Curso>();
    (cursosRes.data || []).forEach(c => cursosMap.set(c.codigo, c));

    const docentesMap = new Map<string, Docente>();
    (docentesRes.data || []).forEach(d => docentesMap.set(d.id_docente, d));

    const seccionesMap = new Map<string, SeccionConDetalle>();
    (seccionesRes.data || []).forEach(s => {
      seccionesMap.set(s.id_seccion, {
        ...s,
        curso: cursosMap.get(s.codigo_curso),
        docente: docentesMap.get(s.id_docente)
      });
    });

    // Map the latest payment per matricula
    const pagosMap = new Map<string, Pago>();
    (pagosRes.data || []).forEach(p => {
      pagosMap.set(p.id_matricula, p);
    });

    return (matriculasRes.data || []).map(mat => {
      const seccion = seccionesMap.get(mat.id_seccion);
      return {
        ...mat,
        estudiante: estudiantesMap.get(mat.id_estudiante),
        seccion,
        curso: seccion?.curso,
        docente: seccion?.docente,
        pago: pagosMap.get(mat.id_matricula)
      };
    });
  }

  public async validarPagoYConfirmar(idMatricula: string, idPago?: string): Promise<void> {
    const client = this.getClient();

    // 1. Update pago to 'VALIDADO' if it exists
    if (idPago) {
      const { error: pagoError } = await client
        .from('pago')
        .update({ estado_pago: 'VALIDADO' })
        .eq('id_pago', idPago);
      if (pagoError) throw pagoError;
    } else {
      // Find payment for this matricula
      const { data: pagos, error: findError } = await client
        .from('pago')
        .select('id_pago')
        .eq('id_matricula', idMatricula);
      
      if (!findError && pagos && pagos.length > 0) {
        const { error: pagoError } = await client
          .from('pago')
          .update({ estado_pago: 'VALIDADO' })
          .eq('id_matricula', idMatricula);
        if (pagoError) throw pagoError;
      }
    }

    // 2. Update matricula to 'CONFIRMADA'
    const { error: matError } = await client
      .from('matricula')
      .update({ estado: 'CONFIRMADA' })
      .eq('id_matricula', idMatricula);

    if (matError) throw matError;
  }

  public async anularMatricula(idMatricula: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('matricula')
      .update({ estado: 'ANULADA' })
      .eq('id_matricula', idMatricula);

    if (error) throw error;
  }
}

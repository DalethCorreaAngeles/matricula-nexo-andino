import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-supabase-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supabase-config-modal.component.html',
  styleUrl: './supabase-config-modal.component.css'
})
export class SupabaseConfigModalComponent {
  private supabaseService = inject(SupabaseService);

  @Output() close = new EventEmitter<void>();

  url = signal(this.supabaseService.currentUrl());
  key = signal(this.supabaseService.currentKey());
  isTesting = signal(false);
  testResult = signal<{ success: boolean; message: string } | null>(null);

  async saveAndTest(): Promise<void> {
    const rawUrl = this.url().trim();
    const rawKey = this.key().trim();

    if (!rawUrl || !rawKey) {
      this.testResult.set({
        success: false,
        message: 'Por favor completa la URL y la Anon Key de Supabase.'
      });
      return;
    }

    this.isTesting.set(true);
    this.testResult.set(null);

    this.supabaseService.saveCredentials(rawUrl, rawKey);
    const result = await this.supabaseService.testConnection();

    this.isTesting.set(false);
    if (result.success) {
      this.testResult.set({
        success: true,
        message: '¡Conexión establecida con éxito con Supabase!'
      });
      setTimeout(() => {
        this.close.emit();
      }, 1000);
    } else {
      this.testResult.set({
        success: false,
        message: 'Error al conectar: ' + (result.message || 'Verifica la URL y la Anon Key.')
      });
    }
  }

  clearCredentials(): void {
    this.supabaseService.clearCredentials();
    this.url.set('');
    this.key.set('');
    this.testResult.set({
      success: false,
      message: 'Credenciales borradas.'
    });
  }

  onClose(): void {
    this.close.emit();
  }
}

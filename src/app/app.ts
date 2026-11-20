import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SupabaseConfigModalComponent } from './components/supabase-config-modal/supabase-config-modal.component';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SupabaseConfigModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public supabaseService = inject(SupabaseService);

  showConfigModal = signal<boolean>(false);

  openConfig(): void {
    this.showConfigModal.set(true);
  }

  closeConfig(): void {
    this.showConfigModal.set(false);
  }
}

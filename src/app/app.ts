import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Footer } from './components/footer/footer';

type Modo = 'cifrar' | 'descifrar' | null;
type CipherType = 'cesar' | 'atbash';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule,Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {

  charset = '';
  charsetNormalizado = '';
  tieneRepetidos = false;

  charsetConfirmado = false;
  charsetBloqueado = false;

  modo: Modo = null;
  tipoCifrado: CipherType = 'cesar';
  shift = 3;

  inputText = '';
  outputText = '';

  loading = false;
  copiado = false;

  mostrarResultado = false;

  constructor(private cdr: ChangeDetectorRef) {}

  // FUNCION 1
  get charsetListo(): boolean {
    return this.charsetConfirmado && this.charsetNormalizado.length > 0;
  }

  // FUNCION 2
  get charsetLength(): number {
    return this.charsetNormalizado.length;
  }

  // FUNCION 3
  get puedeConfirmarCharset(): boolean {
    return !this.loading && !this.charsetConfirmado && this.charsetNormalizado.length > 0;
  }

  // FUNCION 4
  get puedeEjecutar(): boolean {
    return this.charsetListo && !!this.modo && !this.loading && this.inputText.trim().length > 0;
  }

  // FUNCION 5
  private ocultarResultado(): void {
    this.mostrarResultado = false;
    this.outputText = '';
    this.copiado = false;
  }

  // FUNCION 6
  onCharsetChange(): void {
    if (this.charsetConfirmado || this.charsetBloqueado) return;

    const raw = this.charset ?? '';
    const seen = new Set<string>();
    let dup = false;
    let out = '';

    for (const ch of raw) {
      if (seen.has(ch)) {
        dup = true;
        continue;
      }
      seen.add(ch);
      out += ch;
    }

    this.tieneRepetidos = dup;
    this.charsetNormalizado = out;

    if (this.charset !== out) {
      setTimeout(() => {
        this.charset = out;
      });
    }

    this.ocultarResultado();

    if (this.charsetNormalizado.length === 0) {
      this.modo = null;
      this.inputText = '';
    }

    this.cdr.detectChanges();
  }

  // FUNCION 7
  confirmCharset(): void {
    if (!this.puedeConfirmarCharset) return;

    this.charsetConfirmado = true;
    this.charsetBloqueado = true;

    this.modo = null;
    this.inputText = '';

    this.ocultarResultado();

    this.cdr.detectChanges();
  }

  // FUNCION 8
  seleccionarModo(m: Exclude<Modo, null>): void {
    if (!this.charsetListo || this.loading) return;

    this.modo = m;

    this.inputText = '';
    this.ocultarResultado();

    this.cdr.detectChanges();
  }

  // FUNCION 9
  alCambiarCifrado(): void {
    if (!this.charsetListo || this.loading) return;

    this.inputText = '';
    this.ocultarResultado();

    this.cdr.detectChanges();
  }

  // FUNCION 10
  alEditarTexto(): void {
    if (this.loading) return;
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  // FUNCION 11
  cambiarCharset(): void {
    if (this.loading) return;

    this.charsetBloqueado = false;
    this.charsetConfirmado = false;

    this.modo = null;
    this.inputText = '';

    this.ocultarResultado();

    this.cdr.detectChanges();
  }

  // FUNCION 12
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // FUNCION 13
  async run(): Promise<void> {
    if (!this.puedeEjecutar) return;

    this.loading = true;

    this.ocultarResultado();
    this.cdr.detectChanges();

    try {
      await this.sleep(900);

      const text = this.inputText;
      const cs = this.charsetNormalizado;
      const N = cs.length;

      if (N === 0) return;

      if (this.tipoCifrado === 'atbash') {
        this.outputText = this.atbash(text, cs);
      } else {
        const k = ((this.shift % N) + N) % N;
        const signed = this.modo === 'cifrar' ? k : -k;
        this.outputText = this.cesar(text, cs, signed);
      }

      this.mostrarResultado = true;
      this.cdr.detectChanges();
    } catch (error) {
      this.outputText = 'Error al procesar';
      this.mostrarResultado = true;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // FUNCION 14
  cesar(text: string, charset: string, k: number): string {
    const N = charset.length;
    let out = '';
    for (const ch of text) {
      const idx = charset.indexOf(ch);
      if (idx === -1) {
        out += ch;
        continue;
      }
      const j = (idx + k) % N;
      out += charset[(j + N) % N];
    }
    return out;
  }

  // FUNCION 15
  atbash(text: string, charset: string): string {
    const N = charset.length;
    let out = '';
    for (const ch of text) {
      const idx = charset.indexOf(ch);
      if (idx === -1) {
        out += ch;
        continue;
      }
      out += charset[N - 1 - idx];
    }
    return out;
  }

  // FUNCION 16
  async copiarResultado(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.outputText);
      this.copiado = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiado = false;
        this.cdr.detectChanges();
      }, 1400);
    } catch {
      this.copiado = false;
      this.cdr.detectChanges();
    }
  }
}
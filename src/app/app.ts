import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Footer } from './components/footer/footer';

type Modo = 'cifrar' | 'descifrar' | null;
type CipherType = 'cesar' | 'atbash';
type TipoDescifrado = 'manual' | 'detectar' | 'masa';

interface CandidateResult {
  tipo: CipherType;
  shift?: number;
  texto: string;
  score: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Footer],
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
  tipoDescifrado: TipoDescifrado = 'manual';
  shift = 3;

  inputText = '';
  outputText = '';

  loading = false;
  copiado = false;

  mostrarResultado = false;
  resultadosMasa: CandidateResult[] = [];
  mostrarResultadosMasa = false;
  infoDeteccion = '';

  constructor(private cdr: ChangeDetectorRef) {}

  get charsetListo(): boolean {
    return this.charsetConfirmado && this.charsetNormalizado.length > 0;
  }

  get charsetLength(): number {
    return this.charsetNormalizado.length;
  }

  get puedeConfirmarCharset(): boolean {
    return !this.loading && !this.charsetConfirmado && this.charsetNormalizado.length > 0;
  }

  get puedeEjecutar(): boolean {
    return this.charsetListo && !!this.modo && !this.loading && this.inputText.trim().length > 0;
  }

  private ocultarResultado(): void {
    this.mostrarResultado = false;
    this.outputText = '';
    this.copiado = false;
    this.resultadosMasa = [];
    this.mostrarResultadosMasa = false;
    this.infoDeteccion = '';
  }

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

  confirmCharset(): void {
    if (!this.puedeConfirmarCharset) return;

    this.charsetConfirmado = true;
    this.charsetBloqueado = true;
    this.modo = null;
    this.inputText = '';
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  seleccionarModo(m: Exclude<Modo, null>): void {
    if (!this.charsetListo || this.loading) return;

    this.modo = m;
    this.inputText = '';
    this.tipoDescifrado = 'manual';
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  alCambiarCifrado(): void {
    if (!this.charsetListo || this.loading) return;

    this.inputText = '';
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  alCambiarTipoDescifrado(): void {
    if (!this.charsetListo || this.loading) return;

    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  alEditarTexto(): void {
    if (this.loading) return;
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  cambiarCharset(): void {
    if (this.loading) return;

    this.charsetBloqueado = false;
    this.charsetConfirmado = false;
    this.modo = null;
    this.inputText = '';
    this.tipoDescifrado = 'manual';
    this.ocultarResultado();
    this.cdr.detectChanges();
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run(): Promise<void> {
    if (!this.puedeEjecutar) return;

    this.loading = true;
    this.ocultarResultado();
    this.cdr.detectChanges();

    try {
      await this.sleep(700);

      const text = this.inputText;
      const cs = this.charsetNormalizado;
      const N = cs.length;

      if (N === 0) return;

      if (this.modo === 'cifrar') {
        if (this.tipoCifrado === 'atbash') {
          this.outputText = this.atbash(text, cs);
        } else {
          const k = ((this.shift % N) + N) % N;
          this.outputText = this.cesar(text, cs, k);
        }

        this.mostrarResultado = true;
        this.cdr.detectChanges();
        return;
      }

      if (this.tipoDescifrado === 'manual') {
        if (this.tipoCifrado === 'atbash') {
          this.outputText = this.atbash(text, cs);
        } else {
          const k = ((this.shift % N) + N) % N;
          this.outputText = this.cesar(text, cs, -k);
        }

        this.mostrarResultado = true;
        this.cdr.detectChanges();
        return;
      }

      if (this.tipoDescifrado === 'detectar') {
        const mejor = this.detectarMejorCandidato(text, cs);

        this.outputText = mejor.texto;
        this.infoDeteccion =
          mejor.tipo === 'atbash'
            ? `Tipo detectado: Atbash | módulo ${N} | score ${mejor.score}`
            : `Tipo detectado: César | módulo ${N} | shift ${mejor.shift} | score ${mejor.score}`;

        this.mostrarResultado = true;
        this.cdr.detectChanges();
        return;
      }

      if (this.tipoDescifrado === 'masa') {
        this.resultadosMasa = this.generarDescifradoEnMasa(text, cs);
        this.mostrarResultadosMasa = true;
        this.cdr.detectChanges();
      }
    } catch {
      this.outputText = 'Error al procesar';
      this.mostrarResultado = true;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

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

  detectarMejorCandidato(text: string, charset: string): CandidateResult {
    const candidatos: CandidateResult[] = [];
    const N = charset.length;

    const atbashTexto = this.atbash(text, charset);
    candidatos.push({
      tipo: 'atbash',
      texto: atbashTexto,
      score: this.scoreTexto(atbashTexto),
    });

    for (let k = 0; k < N; k++) {
      const descifrado = this.cesar(text, charset, -k);
      candidatos.push({
        tipo: 'cesar',
        shift: k,
        texto: descifrado,
        score: this.scoreTexto(descifrado),
      });
    }

    candidatos.sort((a, b) => b.score - a.score);
    return candidatos[0];
  }

  generarDescifradoEnMasa(text: string, charset: string): CandidateResult[] {
    const resultados: CandidateResult[] = [];
    const N = charset.length;

    resultados.push({
      tipo: 'atbash',
      texto: this.atbash(text, charset),
      score: this.scoreTexto(this.atbash(text, charset)),
    });

    for (let k = 0; k < N; k++) {
      const descifrado = this.cesar(text, charset, -k);
      resultados.push({
        tipo: 'cesar',
        shift: k,
        texto: descifrado,
        score: this.scoreTexto(descifrado),
      });
    }

    return resultados.sort((a, b) => b.score - a.score);
  }

  scoreTexto(text: string): number {
    const t = text.toLowerCase();

    const palabrasComunes = [
      ' de ', ' la ', ' el ', ' que ', ' y ', ' en ', ' los ', ' las ',
      ' un ', ' una ', ' es ', ' se ', ' no ', ' por ', ' con ', ' para '
    ];

    let score = 0;

    for (const palabra of palabrasComunes) {
      const coincidencias = t.split(palabra).length - 1;
      score += coincidencias * 8;
    }

    const vocales = (t.match(/[aeiouáéíóú]/g) || []).length;
    const letras = (t.match(/[a-záéíóúñ]/g) || []).length;

    if (letras > 0) {
      const ratio = vocales / letras;
      if (ratio >= 0.30 && ratio <= 0.60) {
        score += 10;
      }
    }

    return score;
  }

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

  async copiarTexto(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {}
  }
}
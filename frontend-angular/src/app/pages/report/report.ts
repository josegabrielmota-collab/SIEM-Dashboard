import { CommonModule } from '@angular/common';
import {
  AfterViewInit, ChangeDetectorRef, Component,
  ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CountItem } from '../../models/wazuh.models';
import { WazuhApiService } from '../../services/wazuh-api';

declare const Chart: any;

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './report.html',
  styleUrls: ['./report.scss'],
})
export class ReportComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineCanvas')   lineCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas')  donutCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')    barCanvas!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('donut2Canvas') donut2Canvas!: ElementRef<HTMLCanvasElement>;

  loading = false;
  userMenuOpen = false;
  lastHours = 24;
  errorMessage = '';

  severityData: CountItem[] = [];
  topRules:     CountItem[] = [];
  agents:       CountItem[] = [];

  private lineChart:   any = null;
  private donutChart:  any = null;
  private barChart:    any = null;
  private donut2Chart: any = null;
  private chartsReady = false;
  private observer: IntersectionObserver | null = null;

  constructor(
    private wazuhApi: WazuhApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void {
    this.initScrollReveal();
    this.loadChartJs().then(() => {
      this.chartsReady = true;
      if (this.severityData.length || this.topRules.length || this.agents.length) {
        this.buildCharts();
      }
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    [this.lineChart, this.donutChart, this.barChart, this.donut2Chart]
      .forEach(c => c?.destroy());
  }

  private loadChartJs(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private initScrollReveal(): void {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); this.observer?.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => this.observer!.observe(el));
  }

  private refreshReveal(): void {
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach(el => this.observer?.observe(el));
    }, 60);
  }

  setHours(h: number): void { this.lastHours = h; this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      alerts:   this.wazuhApi.getAlerts(this.lastHours, 0, 500).pipe(catchError(() => of({ ok: false, total: 0, alerts: [] }))),
      severity: this.wazuhApi.getAlertsBySeverity(this.lastHours).pipe(catchError(() => of({ ok: false, data: [] }))),
      rules:    this.wazuhApi.getTopRules(this.lastHours).pipe(catchError(() => of({ ok: false, data: [] }))),
      agents:   this.wazuhApi.getAlertsByAgent(this.lastHours).pipe(catchError(() => of({ ok: false, data: [] }))),
    }).subscribe({
      next: result => {
        this.severityData = result.severity.data;
        this.topRules     = result.rules.data;
        this.agents       = result.agents.data;

        // Agrupa alertas por hora para o gráfico de linha
        this._alertsOverTime = this.groupByHour(result.alerts.alerts);
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar dados do relatório.';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.refreshReveal();
        if (this.chartsReady) this.buildCharts();
      }
    });
  }

  _alertsOverTime: { label: string; count: number }[] = [];

  private groupByHour(alerts: any[]): { label: string; count: number }[] {
    const buckets = new Map<string, number>();
    alerts.forEach(a => {
      if (!a.timestamp) return;
      const d   = new Date(a.timestamp);
      const key = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}h`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return [...buckets.entries()]
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
  }

  private buildCharts(): void {
    setTimeout(() => {
      this.buildLineChart();
      this.buildDonutChart();
      this.buildBarChart();
      this.buildDonut2Chart();
    }, 120);
  }

  /* ── Paleta ── */
  private readonly COLORS = ['#00d4ff','#a78bfa','#3dffa0','#ff4d4d','#ff8c42','#f472b6','#facc15','#38bdf8'];
  private readonly SEVERITYCOLORS: Record<string,string> = {
    critical: '#ff4d4d', high: '#ff8c42', medium: '#00d4ff', low: '#3dffa0'
  };

  private getSevColor(label: string): string {
    const n = Number(label);
    if (n >= 12) return this.SEVERITYCOLORS['critical'];
    if (n >= 7)  return this.SEVERITYCOLORS['high'];
    if (n >= 4)  return this.SEVERITYCOLORS['medium'];
    return this.SEVERITYCOLORS['low'];
  }

  private chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { family: "'Barlow', sans-serif", size: 11 }, boxWidth: 10 } },
        tooltip: {
          backgroundColor: '#0e1018',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#f0f2f7',
          bodyColor: '#9ca3af',
        }
      }
    };
  }

  /* ── 1. Linha: evolução ao longo do tempo ── */
  private buildLineChart(): void {
    if (!this.lineCanvas) return;
    this.lineChart?.destroy();

    const labels = this._alertsOverTime.map(d => d.label);
    const data   = this._alertsOverTime.map(d => d.count);

    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Alertas',
          data,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0,212,255,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#00d4ff',
          pointRadius: 3,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        ...this.chartDefaults(),
        scales: {
          x: { ticks: { color: '#6b7280', maxTicksLimit: 10, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  }

  /* ── 2. Donut: top regras (táticas) ── */
  private buildDonutChart(): void {
    if (!this.donutCanvas) return;
    this.donutChart?.destroy();

    const top = this.topRules.slice(0, 7);
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: top.map(d => d.label.length > 30 ? d.label.slice(0,30)+'…' : d.label),
        datasets: [{ data: top.map(d => d.count), backgroundColor: this.COLORS, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        ...this.chartDefaults(),
        cutout: '60%',
        plugins: { ...this.chartDefaults().plugins, legend: { ...this.chartDefaults().plugins.legend, position: 'right' } }
      }
    });
  }

  /* ── 3. Barras: alertas por agente ── */
  private buildBarChart(): void {
    if (!this.barCanvas) return;
    this.barChart?.destroy();

    const top = this.agents.slice(0, 8);
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: top.map(d => d.label),
        datasets: [{
          label: 'Alertas',
          data: top.map(d => d.count),
          backgroundColor: this.COLORS.map(c => c + '99'),
          borderColor: this.COLORS,
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        ...this.chartDefaults(),
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        },
        plugins: { ...this.chartDefaults().plugins, legend: { display: false } }
      }
    });
  }

  /* ── 4. Donut 2: distribuição por severidade ── */
  private buildDonut2Chart(): void {
    if (!this.donut2Canvas) return;
    this.donut2Chart?.destroy();

    const labels: string[] = [];
    const counts: number[] = [];
    const colors: string[] = [];

    this.severityData.forEach(d => {
      const n = Number(d.label);
      let name = `Nível ${d.label}`;
      if (n >= 12) name = `Crítico (${d.label})`;
      else if (n >= 7) name = `Alto (${d.label})`;
      else if (n >= 4) name = `Médio (${d.label})`;
      else name = `Baixo (${d.label})`;
      labels.push(name);
      counts.push(d.count);
      colors.push(this.getSevColor(d.label));
    });

    this.donut2Chart = new Chart(this.donut2Canvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        ...this.chartDefaults(),
        cutout: '58%',
        plugins: { ...this.chartDefaults().plugins, legend: { ...this.chartDefaults().plugins.legend, position: 'right' } }
      }
    });
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }

  logout(): void { this.router.navigate(['/login']); }

  get totalAlerts(): number { return this._alertsOverTime.reduce((s,d) => s+d.count, 0); }
  get topAgent(): string    { return this.agents[0]?.label || '—'; }
  get topRule(): string {
    const r = this.topRules[0]?.label || '—';
    return r.length > 40 ? r.slice(0,40)+'…' : r;
  }
}
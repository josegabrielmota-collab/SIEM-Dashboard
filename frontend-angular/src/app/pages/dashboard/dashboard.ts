import { CommonModule } from '@angular/common';
<<<<<<< HEAD
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
=======
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
>>>>>>> f726687a5fd2223b0c98353c89edac9334f52b07
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CountItem, WazuhAlert } from '../../models/wazuh.models';
import { WazuhApiService } from '../../services/wazuh-api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = false;
  userMenuOpen = false;
  backendOnline = false;
  wazuhOnline = false;
  errorMessage = '';

  lastHours = 24;
  minLevel = 7;
  size = 20;

  totalAlerts = 0;
  alerts: WazuhAlert[] = [];
  severityData: CountItem[] = [];
  topRules: CountItem[] = [];
  agents: CountItem[] = [];
  sourceIps: CountItem[] = [];

  private observer: IntersectionObserver | null = null;

  // Circumference of the donut ring: 2 * PI * r = 2 * 3.14159 * 72 ≈ 452.4
  private readonly CIRC = 452.4;

  constructor(
    private wazuhApi: WazuhApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private initScrollReveal(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document.querySelectorAll('.reveal').forEach((el) => this.observer!.observe(el));
  }

  private refreshReveal(): void {
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) =>
        this.observer?.observe(el),
      );
    }, 60);
  }

  get apiUrl(): string { return this.wazuhApi.apiUrl; }
  get periodLabel(): string { return `Últimas ${this.lastHours}h`; }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      health:    this.wazuhApi.getHealth().pipe(catchError(() => of(null))),
      status:    this.wazuhApi.getWazuhStatus().pipe(catchError(() => of(null))),
      alerts:    this.wazuhApi.getAlerts(this.lastHours, this.minLevel, this.size).pipe(
                   catchError(() => of({ ok: false, total: 0, alerts: [] })),
                 ),
      severity:  this.wazuhApi.getAlertsBySeverity(this.lastHours).pipe(
                   catchError(() => of({ ok: false, data: [] })),
                 ),
      topRules:  this.wazuhApi.getTopRules(this.lastHours).pipe(
                   catchError(() => of({ ok: false, data: [] })),
                 ),
      agents:    this.wazuhApi.getAlertsByAgent(this.lastHours).pipe(
                   catchError(() => of({ ok: false, data: [] })),
                 ),
      sourceIps: this.wazuhApi.getTopSourceIps(this.lastHours).pipe(
                   catchError(() => of({ ok: false, data: [] })),
                 ),
    }).subscribe({
      next: (result) => {
        this.backendOnline = Boolean(result.health?.ok);
        this.wazuhOnline   = Boolean(result.status?.ok);
        this.alerts        = result.alerts.alerts;
        this.severityData  = this.sortSeverity(result.severity.data);
        this.topRules      = result.topRules.data;
        this.agents        = result.agents.data;
        this.sourceIps     = result.sourceIps.data;
        this.totalAlerts   = this.totalFromSeverity || result.alerts.total;

        if (!this.backendOnline) {
          this.errorMessage = `Não foi possível conectar ao backend em ${this.apiUrl}.`;
        } else if (!this.wazuhOnline) {
          this.errorMessage = 'Backend online, mas sem conexão com o Wazuh Indexer.';
        }
      },
      error: () => {
        this.errorMessage = 'Erro inesperado ao carregar o dashboard.';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
<<<<<<< HEAD
        this.refreshReveal();
=======
>>>>>>> f726687a5fd2223b0c98353c89edac9334f52b07
      },
    });
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }

  logout(): void { this.router.navigate(['/login']); }

  // ── Donut chart helpers ─────────────────────────────
  /** Retorna stroke-dasharray para um valor no total */
  getDonutDash(value: number): string {
    if (!this.totalAlerts) return `0 ${this.CIRC}`;
    const filled = (value / this.totalAlerts) * this.CIRC;
    return `${filled} ${this.CIRC - filled}`;
  }

  /**
   * Retorna stroke-dashoffset para posicionar a fatia.
   * offsetCount = soma dos valores anteriores a esta fatia.
   */
  getDonutOffset(offsetCount: number): string {
    if (!this.totalAlerts) return `${this.CIRC}`;
    const offset = this.CIRC - (offsetCount / this.totalAlerts) * this.CIRC;
    return `${offset}`;
  }

  // ── Severity getters ────────────────────────────────
  get totalFromSeverity(): number {
    return this.severityData.reduce((sum, item) => sum + item.count, 0);
  }

  get criticalAlerts(): number { return this.countSeverityRange(12, 16); }
  get highAlerts(): number     { return this.countSeverityRange(7, 11); }
  get mediumAlerts(): number   { return this.countSeverityRange(4, 6); }
  get lowAlerts(): number      { return this.countSeverityRange(0, 3); }

  get monitoredAgents(): number { return this.agents.length; }
  get topSourceIp(): string     { return this.sourceIps[0]?.label || '—'; }

  getSeverityClass(level: number | null): string {
    const v = level ?? 0;
    if (v >= 12) return 'critical';
    if (v >= 7)  return 'high';
    if (v >= 4)  return 'medium';
    return 'low';
  }

  getSeverityText(level: number | null): string {
    const v = level ?? 0;
    if (v >= 12) return 'Crítico';
    if (v >= 7)  return 'Alto';
    if (v >= 4)  return 'Médio';
    return 'Baixo';
  }

  getBarWidth(count: number, data: CountItem[]): string {
    const max = Math.max(...data.map((i) => i.count), 1);
    return `${Math.max((count / max) * 100, 4)}%`;
  }

  trackByAlertId(_: number, alert: WazuhAlert): string {
    return alert.id || `${alert.timestamp}-${alert.description}`;
  }

  trackByLabel(_: number, item: CountItem): string {
    return item.label;
  }

  private countSeverityRange(min: number, max: number): number {
    return this.severityData.reduce((sum, item) => {
      const level = Number(item.label);
      return level >= min && level <= max ? sum + item.count : sum;
    }, 0);
  }

  private sortSeverity(data: CountItem[]): CountItem[] {
    return [...data].sort((a, b) => Number(b.label) - Number(a.label));
  }
}
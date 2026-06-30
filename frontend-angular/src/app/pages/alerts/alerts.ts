import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CountItem, WazuhAlert } from '../../models/wazuh.models';
import { WazuhApiService } from '../../services/wazuh-api';

export interface ChartBar {
  hour: string;
  count: number;
  severity: string;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './alerts.html',
  styleUrls: ['./alerts.scss'],
})
export class AlertsComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = false;
  userMenuOpen = false;
  errorMessage = '';

  lastHours = 24;
  minLevel = 0;
  size = 100;
  searchTerm = '';
  expandedAlertId: string | null = null;

  total = 0;
  alerts: WazuhAlert[] = [];
  severityData: CountItem[] = [];
  topRules: CountItem[] = [];
  agents: CountItem[] = [];
  chartBars: ChartBar[] = [];

  private observer: IntersectionObserver | null = null;

  constructor(
    private wazuhApi: WazuhApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
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

  setHours(h: number): void {
    this.lastHours = h;
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      alerts:   this.wazuhApi.getAlerts(this.lastHours, this.minLevel, this.size).pipe(
                  catchError(() => of({ ok: false, total: 0, alerts: [] })),
                ),
      severity: this.wazuhApi.getAlertsBySeverity(this.lastHours).pipe(
                  catchError(() => of({ ok: false, data: [] })),
                ),
      topRules: this.wazuhApi.getTopRules(this.lastHours).pipe(
                  catchError(() => of({ ok: false, data: [] })),
                ),
      agents:   this.wazuhApi.getAlertsByAgent(this.lastHours).pipe(
                  catchError(() => of({ ok: false, data: [] })),
                ),
    }).subscribe({
      next: (result) => {
        const loadedAlerts = result.alerts.alerts;

        this.total        = result.alerts.total;
        this.alerts       = loadedAlerts;
        this.severityData = this.buildSeverityData(loadedAlerts);
        this.topRules     = this.aggregateBy(loadedAlerts, (alert) => alert.description, 10);
        this.agents       = this.aggregateBy(loadedAlerts, (alert) => alert.agentName, 10);
        this.chartBars    = this.buildChartBars(loadedAlerts);
      },
      error: () => {
        this.errorMessage = `Erro ao buscar alertas. Verifique o backend em ${this.apiUrl}.`;
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.refreshReveal();
      },
    });
  }

  private aggregateBy(
    alerts: WazuhAlert[],
    selector: (alert: WazuhAlert) => string | null | undefined,
    limit = 10,
  ): CountItem[] {
    const counts = new Map<string, number>();

    alerts.forEach((alert) => {
      const rawValue = selector(alert);
      const label = this.normalizeLabel(rawValue);

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));
  }

  private buildSeverityData(alerts: WazuhAlert[]): CountItem[] {
    const counts = new Map<string, number>();

    alerts.forEach((alert) => {
      const label = alert.level === null || alert.level === undefined
        ? 'Não informado'
        : String(alert.level);

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([label, count]) => ({ label, count }));
  }

  private normalizeLabel(value: string | null | undefined): string {
    if (!value || !value.trim() || value === '-') {
      return 'Não informado';
    }

    return value.trim();
  }

  private buildChartBars(alerts: WazuhAlert[]): ChartBar[] {
    if (!alerts.length) return [];

    const buckets = new Map<string, { count: number; maxLevel: number }>();

    alerts.forEach((alert) => {
      if (!alert.timestamp) return;
      const d    = new Date(alert.timestamp);
      const key  = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
      const prev = buckets.get(key) || { count: 0, maxLevel: 0 };
      buckets.set(key, {
        count:    prev.count + 1,
        maxLevel: Math.max(prev.maxLevel, alert.level ?? 0),
      });
    });

    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, { count, maxLevel }]) => ({
        hour,
        count,
        severity: this.getSeverityClass(maxLevel),
      }));
  }

  getChartBarHeight(count: number): string {
    const max = Math.max(...this.chartBars.map((b) => b.count), 1);
    return `${Math.max((count / max) * 100, 4)}%`;
  }

  get filteredAlerts(): WazuhAlert[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.alerts;

    return this.alerts.filter((alert) => {
      const fields = [
        alert.description,
        alert.agentName,
        alert.agentIp,
        alert.srcIp,
        alert.dstIp,
        alert.location,
        alert.fullLog,
        ...(alert.groups || []),
        ...(alert.mitreTechnique || []),
        ...(alert.mitreTactic || []),
      ];
      return fields.some((v) => v?.toLowerCase().includes(term));
    });
  }

  toggleDetails(alert: WazuhAlert): void {
    const id = this.getAlertIdentity(alert);
    this.expandedAlertId = this.expandedAlertId === id ? null : id;
  }

  isExpanded(alert: WazuhAlert): boolean {
    return this.expandedAlertId === this.getAlertIdentity(alert);
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }

  logout(): void { this.router.navigate(['/login']); }

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

  trackByAlertId(_: number, alert: WazuhAlert): string {
    return this.getAlertIdentity(alert);
  }

  trackByLabel(_: number, item: CountItem): string { return item.label; }

  trackByHour(_: number, bar: ChartBar): string { return bar.hour; }

  private getAlertIdentity(alert: WazuhAlert): string {
    return alert.id || `${alert.timestamp}-${alert.agentName}-${alert.description}`;
  }

  private sortSeverity(data: CountItem[]): CountItem[] {
    return [...data].sort((a, b) => Number(b.label) - Number(a.label));
  }
}
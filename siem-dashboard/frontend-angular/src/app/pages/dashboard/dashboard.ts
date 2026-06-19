import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
export class DashboardComponent implements OnInit {
  loading = false;
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

  constructor(
    private wazuhApi: WazuhApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  get apiUrl(): string {
    return this.wazuhApi.apiUrl;
  }

  get periodLabel(): string {
    return `Últimas ${this.lastHours}h`;
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      health: this.wazuhApi.getHealth().pipe(catchError(() => of(null))),
      status: this.wazuhApi.getWazuhStatus().pipe(catchError(() => of(null))),
      alerts: this.wazuhApi.getAlerts(this.lastHours, this.minLevel, this.size).pipe(
        catchError(() => of({ ok: false, total: 0, alerts: [] })),
      ),
      severity: this.wazuhApi.getAlertsBySeverity(this.lastHours).pipe(
        catchError(() => of({ ok: false, data: [] })),
      ),
      topRules: this.wazuhApi.getTopRules(this.lastHours).pipe(
        catchError(() => of({ ok: false, data: [] })),
      ),
      agents: this.wazuhApi.getAlertsByAgent(this.lastHours).pipe(
        catchError(() => of({ ok: false, data: [] })),
      ),
      sourceIps: this.wazuhApi.getTopSourceIps(this.lastHours).pipe(
        catchError(() => of({ ok: false, data: [] })),
      ),
    }).subscribe({
      next: (result) => {
        this.backendOnline = Boolean(result.health?.ok);
        this.wazuhOnline = Boolean(result.status?.ok);
        this.alerts = result.alerts.alerts;
        this.severityData = this.sortSeverity(result.severity.data);
        this.topRules = result.topRules.data;
        this.agents = result.agents.data;
        this.sourceIps = result.sourceIps.data;
        this.totalAlerts = this.totalFromSeverity || result.alerts.total;

        if (!this.backendOnline) {
          this.errorMessage = `Não foi possível conectar ao backend em ${this.apiUrl}. Verifique se o Spring Boot está rodando.`;
        } else if (!this.wazuhOnline) {
          this.errorMessage = 'O backend respondeu, mas não conseguiu conectar ao Wazuh Indexer. Confira URL, usuário, senha e porta 9200.';
        }
      },
      error: () => {
        this.errorMessage = 'Erro inesperado ao carregar o dashboard.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  get totalFromSeverity(): number {
    return this.severityData.reduce((sum, item) => sum + item.count, 0);
  }

  get criticalAlerts(): number {
    return this.countSeverityRange(12, 16);
  }

  get highAlerts(): number {
    return this.countSeverityRange(7, 11);
  }

  get mediumAlerts(): number {
    return this.countSeverityRange(4, 6);
  }

  get lowAlerts(): number {
    return this.countSeverityRange(0, 3);
  }

  get monitoredAgents(): number {
    return this.agents.length;
  }

  get topSourceIp(): string {
    return this.sourceIps[0]?.label || 'Sem dados';
  }

  getSeverityClass(level: number | null): string {
    const value = level ?? 0;

    if (value >= 12) {
      return 'critical';
    }

    if (value >= 7) {
      return 'high';
    }

    if (value >= 4) {
      return 'medium';
    }

    return 'low';
  }

  getSeverityText(level: number | null): string {
    const value = level ?? 0;

    if (value >= 12) {
      return 'Crítico';
    }

    if (value >= 7) {
      return 'Alto';
    }

    if (value >= 4) {
      return 'Médio';
    }

    return 'Baixo';
  }

  getBarWidth(count: number, data: CountItem[]): string {
    const max = Math.max(...data.map((item) => item.count), 1);
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

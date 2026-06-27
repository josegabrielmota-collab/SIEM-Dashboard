import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { WazuhAlert } from '../../models/wazuh.models';
import { WazuhApiService } from '../../services/wazuh-api';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './alerts.html',
  styleUrls: ['./alerts.scss'],
})
export class AlertsComponent implements OnInit {
  loading = false;
  errorMessage = '';

  lastHours = 24;
  minLevel = 0;
  size = 100;
  searchTerm = '';
  expandedAlertId: string | null = null;

  total = 0;
  alerts: WazuhAlert[] = [];

  constructor(
    private wazuhApi: WazuhApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  get apiUrl(): string {
    return this.wazuhApi.apiUrl;
  }

  loadAlerts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.wazuhApi
      .getAlerts(this.lastHours, this.minLevel, this.size)
      .pipe(
        catchError(() => {
          this.errorMessage = `Não foi possível buscar os alertas. Verifique se o backend Java está rodando em ${this.apiUrl}.`;
          return of({ ok: false, total: 0, alerts: [] });
        }),
      )
      .subscribe((response) => {
        this.total = response.total;
        this.alerts = response.alerts;
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  get filteredAlerts(): WazuhAlert[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.alerts;
    }

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

      return fields.some((value) => value?.toLowerCase().includes(term));
    });
  }

  get criticalVisible(): number {
    return this.filteredAlerts.filter((alert) => (alert.level ?? 0) >= 12).length;
  }

  get highVisible(): number {
    return this.filteredAlerts.filter((alert) => {
      const level = alert.level ?? 0;
      return level >= 7 && level < 12;
    }).length;
  }

  get agentsVisible(): number {
    return new Set(this.filteredAlerts.map((alert) => alert.agentName).filter(Boolean)).size;
  }

  get topSourceIpVisible(): string {
    const counts = new Map<string, number>();

    this.filteredAlerts.forEach((alert) => {
      if (alert.srcIp) {
        counts.set(alert.srcIp, (counts.get(alert.srcIp) || 0) + 1);
      }
    });

    const [topIp] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    return topIp || 'Sem dados';
  }

  setMinLevel(level: number): void {
    this.minLevel = level;
    this.loadAlerts();
  }

  toggleDetails(alert: WazuhAlert): void {
    const id = this.getAlertIdentity(alert);
    this.expandedAlertId = this.expandedAlertId === id ? null : id;
  }

  isExpanded(alert: WazuhAlert): boolean {
    return this.expandedAlertId === this.getAlertIdentity(alert);
  }

  logout(): void {
    this.router.navigate(['/login']);
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

  trackByAlertId(_: number, alert: WazuhAlert): string {
    return this.getAlertIdentity(alert);
  }

  private getAlertIdentity(alert: WazuhAlert): string {
    return alert.id || `${alert.timestamp}-${alert.agentName}-${alert.description}`;
  }
}

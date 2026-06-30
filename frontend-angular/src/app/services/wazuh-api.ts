import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlertListResponse, ApiStatusResponse, CountListResponse } from '../models/wazuh.models';

@Injectable({
  providedIn: 'root',
})
export class WazuhApiService {
  readonly apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  getHealth(): Observable<ApiStatusResponse> {
    return this.http.get<ApiStatusResponse>(`${this.apiUrl}/health`);
  }

  getWazuhStatus(): Observable<ApiStatusResponse> {
    return this.http.get<ApiStatusResponse>(`${this.apiUrl}/wazuh/status`);
  }

  getAlerts(lastHours = 24, minLevel = 7, size = 50): Observable<AlertListResponse> {
    const params = new HttpParams()
      .set('lastHours', String(lastHours))
      .set('minLevel', String(minLevel))
      .set('size', String(size));

    return this.http.get<AlertListResponse>(`${this.apiUrl}/alerts`, { params });
  }

  getAlertsBySeverity(lastHours = 24, minLevel = 0): Observable<CountListResponse> {
    const params = new HttpParams()
      .set('lastHours', String(lastHours))
      .set('minLevel', String(minLevel));

    return this.http.get<CountListResponse>(`${this.apiUrl}/alerts/severity`, { params });
  }

  getTopRules(lastHours = 24, minLevel = 0): Observable<CountListResponse> {
    const params = new HttpParams()
      .set('lastHours', String(lastHours))
      .set('minLevel', String(minLevel));

    return this.http.get<CountListResponse>(`${this.apiUrl}/alerts/top-rules`, { params });
  }

  getAlertsByAgent(lastHours = 24, minLevel = 0): Observable<CountListResponse> {
    const params = new HttpParams()
      .set('lastHours', String(lastHours))
      .set('minLevel', String(minLevel));

    return this.http.get<CountListResponse>(`${this.apiUrl}/alerts/agents`, { params });
  }

  getTopSourceIps(lastHours = 24, minLevel = 0): Observable<CountListResponse> {
    const params = new HttpParams()
      .set('lastHours', String(lastHours))
      .set('minLevel', String(minLevel));

    return this.http.get<CountListResponse>(`${this.apiUrl}/alerts/source-ips`, { params });
  }
}

import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Particle { x: number; y: number; size: number; delay: number; duration: number; }
interface Node3D    { x: number; y: number; z: number; vx: number; vy: number; vz: number; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') bgCanvas!: ElementRef<HTMLCanvasElement>;

  loginForm!: FormGroup;
  errorMessage = '';
  loading = false;
  shaking = false;
  userFocused = false;
  passFocused = false;
  particles: Particle[] = [];

  private animFrameId: number | null = null;
  private nodes: Node3D[] = [];
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    // Gera partículas flutuantes
    this.particles = Array.from({ length: 28 }, () => ({
      x:        Math.random() * 100,
      y:        Math.random() * 100,
      size:     Math.random() * 8 + 4,
      delay:    Math.random() * 8,
      duration: Math.random() * 8 + 6,
    }));
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  /* ── Canvas 3D (rede de nós conectados em perspectiva) ── */
  private initCanvas(): void {
    const canvas = this.bgCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Cria 100 nós em espaço 3D
    this.nodes = Array.from({ length: 100 }, () => ({
      x:  (Math.random() - 0.4) * 2000,
      y:  (Math.random() - 0.5) * 1500,
      z:  Math.random() * 500,
      vx: (Math.random() - 0.4) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      vz: (Math.random() - 0.5) * 0.9,
    }));

    this.animate();
  }

  private animate(): void {
    const canvas = this.bgCanvas?.nativeElement;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const fov = 400;
    const cx  = w / 2;
    const cy  = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Move nós
    this.nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
      if (Math.abs(n.x) > 500) n.vx *= -1;
      if (Math.abs(n.y) > 400) n.vy *= -1;
      if (n.z < 50 || n.z > 650) n.vz *= -1;
    });

    // Projeta para 2D
    const projected = this.nodes.map(n => {
      const scale = fov / (fov + n.z);
      return { x: cx + n.x * scale, y: cy + n.y * scale, scale };
    });

    // Desenha arestas
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const dx   = projected[i].x - projected[j].x;
        const dy   = projected[i].y - projected[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <140) {
          const alpha = (1 - dist / 240) * 0.18;
          ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
          ctx.lineWidth   = 0.8;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.stroke();
        }
      }
    }

    // Desenha nós
    projected.forEach(p => {
      const r = p.scale * 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,255,${p.scale * 0.5})`;
      ctx.fill();
    });

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      // Simula delay de verificação (UX)
      setTimeout(() => {
        const { username, password } = this.loginForm.value;
        if (username === 'admin' && password === 'admin123') {
          this.router.navigate(['/sobre']);
        } else {
          this.loading = false;
          this.errorMessage = 'Credenciais inválidas. Tentativa de acesso registrada.';
          this.shaking = true;
          setTimeout(() => this.shaking = false, 500);
        }
      }, 800);
    }
  }
}
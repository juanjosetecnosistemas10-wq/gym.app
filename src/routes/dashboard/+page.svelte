<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  // ── Estado ──────────────────────────────────────────────────
  let totalMembers   = $state(0);
  let planCounts     = $state({ Mensual: 0, Trimestral: 0, Anual: 0 });
  let monthlyData    = $state<{ month: string; count: number }[]>([]);
  let loading        = $state(true);

  // Animación de conteo
  let displayTotal = $state(0);
  function animateCount(target: number) {
    const duration = 1200;
    const step = target / (duration / 16);
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      displayTotal = Math.floor(current);
      if (current >= target) clearInterval(interval);
    }, 16);
  }

  // ── Cargar datos de Supabase ─────────────────────────────────
  onMount(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('members').select('plan, created_at');

    if (error || !data) { loading = false; return; }

    // Total
    totalMembers = data.length;
    animateCount(totalMembers);

    // Por plan
    const counts = { Mensual: 0, Trimestral: 0, Anual: 0 } as Record<string, number>;
    data.forEach(m => { if (counts[m.plan] !== undefined) counts[m.plan]++; });
    planCounts = counts as typeof planCounts;

    // Por mes (últimos 6 meses)
    const now = new Date();
    const months: { month: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-CO', { month: 'short' }),
        count: 0,
      });
    }
    data.forEach(m => {
      if (!m.created_at) return;
      const key = m.created_at.slice(0, 7);
      const found = months.find(mo => mo.month === key);
      if (found) found.count++;
    });
    monthlyData = months.map(m => ({ month: m.label, count: m.count }));

    loading = false;

    // Renderizar gráficas después de que el DOM esté listo
    setTimeout(() => renderCharts(), 50);
  });

  // ── Chart.js ─────────────────────────────────────────────────
  let chartPlan: any = null;
  let chartMonthly: any = null;

  async function renderCharts() {
    const Chart = (await import('chart.js/auto')).default;

    const accent   = '#c8ff00';
    const orange   = '#ff5c00';
    const blue     = '#00d4ff';
    const gridCol  = 'rgba(255,255,255,0.05)';
    const textCol  = '#888888';

    // Destruir si ya existen
    chartPlan?.destroy();
    chartMonthly?.destroy();

    // ── Dona: distribución por plan ──
    const ctxPlan = document.getElementById('chartPlan') as HTMLCanvasElement;
    if (ctxPlan) {
      chartPlan = new Chart(ctxPlan, {
        type: 'doughnut',
        data: {
          labels: ['Mensual', 'Trimestral', 'Anual'],
          datasets: [{
            data: [planCounts.Mensual, planCounts.Trimestral, planCounts.Anual],
            backgroundColor: [accent, orange, blue],
            borderColor: '#141414',
            borderWidth: 3,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textCol, font: { family: 'Space Mono', size: 11 }, padding: 20, boxWidth: 12 },
            },
            tooltip: {
              backgroundColor: '#1c1c1c',
              borderColor: '#333',
              borderWidth: 1,
              titleColor: '#f0f0f0',
              bodyColor: textCol,
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} miembros`,
              },
            },
          },
        },
      });
    }

    // ── Barras: miembros por mes ──
    const ctxMonthly = document.getElementById('chartMonthly') as HTMLCanvasElement;
    if (ctxMonthly) {
      chartMonthly = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [{
            label: 'Nuevos miembros',
            data: monthlyData.map(d => d.count),
            backgroundColor: monthlyData.map((_, i) =>
              i === monthlyData.length - 1 ? accent : 'rgba(200,255,0,0.2)'
            ),
            borderColor: accent,
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1c1c1c',
              borderColor: '#333',
              borderWidth: 1,
              titleColor: '#f0f0f0',
              bodyColor: textCol,
              callbacks: {
                label: (ctx: any) => ` ${ctx.raw} nuevos`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gridCol },
              ticks: { color: textCol, font: { family: 'Space Mono', size: 11 } },
            },
            y: {
              grid: { color: gridCol },
              ticks: { color: textCol, font: { family: 'Space Mono', size: 11 }, stepSize: 1 },
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
</script>

<div class="dashboard">

  <!-- Encabezado -->
  <div class="page-header animate-fade-up">
    <div>
      <p class="section-label">Dashboard</p>
      <h1 class="page-title">Panel de Control</h1>
    </div>
    <div class="header-meta font-mono">
      {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
    </div>
  </div>

  {#if loading}
    <!-- Skeletons de métricas -->
    <div class="stats-grid">
      {#each { length: 3 } as _}
        <div class="card">
          <div class="skeleton" style="width: 60%; height: 12px; margin-bottom: var(--space-3)"></div>
          <div class="skeleton" style="width: 40%; height: 48px; margin-bottom: var(--space-4)"></div>
          <div class="skeleton" style="width: 100%; height: 3px"></div>
        </div>
      {/each}
    </div>

  {:else}
    <!-- ── Métricas reales ── -->
    <div class="stats-grid animate-fade-up delay-1">

      <div class="card accent">
        <p class="section-label" style="margin-bottom: var(--space-3)">Total Miembros</p>
        <div class="stat-value accent" style="margin-bottom: var(--space-4)">{displayTotal}</div>
        <div class="progress-bar"><div class="progress-fill" style="--pw: 100%"></div></div>
      </div>

      <div class="card">
        <p class="section-label" style="margin-bottom: var(--space-3)">Plan más popular</p>
        <div class="stat-value" style="margin-bottom: var(--space-2); font-size: 2rem">
          {Object.entries(planCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—'}
        </div>
        <p class="font-mono" style="font-size:0.72rem; color: var(--text-muted)">
          {Object.entries(planCounts).sort((a,b) => b[1]-a[1])[0]?.[1] ?? 0} miembros
        </p>
        <div class="progress-bar" style="margin-top: var(--space-4)">
          <div class="progress-fill" style="--pw: {totalMembers ? (Object.entries(planCounts).sort((a,b) => b[1]-a[1])[0]?.[1] / totalMembers * 100) : 0}%"></div>
        </div>
      </div>

      <div class="card">
        <p class="section-label" style="margin-bottom: var(--space-3)">Planes activos</p>
        <div class="plan-pills">
          {#each Object.entries(planCounts) as [plan, count]}
            <div class="plan-pill">
              <span class="plan-pill-label font-mono">{plan}</span>
              <span class="plan-pill-count">{count}</span>
            </div>
          {/each}
        </div>
      </div>

    </div>

    <!-- ── Gráficas ── -->
    <div class="charts-grid animate-fade-up delay-2">

      <!-- Dona: distribución por plan -->
      <div class="card chart-card">
        <p class="section-label" style="margin-bottom: var(--space-6)">Distribución por Plan</p>
        {#if totalMembers === 0}
          <div class="chart-empty">Sin datos aún</div>
        {:else}
          <div class="chart-wrap">
            <canvas id="chartPlan"></canvas>
          </div>
        {/if}
      </div>

      <!-- Barras: nuevos miembros por mes -->
      <div class="card chart-card wide">
        <p class="section-label" style="margin-bottom: var(--space-6)">Nuevos Miembros — Últimos 6 meses</p>
        {#if totalMembers === 0}
          <div class="chart-empty">Sin datos aún</div>
        {:else}
          <div class="chart-wrap">
            <canvas id="chartMonthly"></canvas>
          </div>
        {/if}
      </div>

    </div>

  {/if}

  <!-- Accesos rápidos -->
  <div class="quick-links animate-fade-up delay-3">
    <p class="section-label" style="margin-bottom: var(--space-4)">Accesos Rápidos</p>
    <div class="links-grid">
      <a href="/dashboard/members" class="quick-card">
        <span class="quick-icon">👥</span>
        <span class="quick-label">Gestionar Miembros</span>
        <span class="quick-arrow">→</span>
      </a>
      <a href="/dashboard/classes" class="quick-card">
        <span class="quick-icon">🏋️</span>
        <span class="quick-label">Ver Clases</span>
        <span class="quick-arrow">→</span>
      </a>
    </div>
  </div>

</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: var(--space-8); }

  .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }
  .header-meta { font-size: 0.72rem; letter-spacing: 0.1em; color: var(--text-muted); text-transform: capitalize; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); }

  .progress-bar { height: 3px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
  .progress-fill {
    height: 100%; background: var(--accent); border-radius: var(--radius-full);
    width: 0; animation: grow-w 1.2s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  @keyframes grow-w { to { width: var(--pw, 70%); } }

  /* Pills de planes */
  .plan-pills { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-2); }
  .plan-pill { display: flex; justify-content: space-between; align-items: center; }
  .plan-pill-label { font-size: 0.72rem; letter-spacing: 0.08em; color: var(--text-secondary); }
  .plan-pill-count { font-family: var(--font-display); font-weight: 800; font-size: 1.4rem; color: var(--text-primary); }

  /* Gráficas */
  .charts-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--space-4);
  }
  .chart-card { display: flex; flex-direction: column; }
  .chart-wrap { flex: 1; position: relative; height: 260px; }
  .chart-empty { height: 260px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem; }

  /* Accesos rápidos */
  .links-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); }
  .quick-card {
    background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-6); display: flex; align-items: center; gap: var(--space-4);
    text-decoration: none; color: var(--text-primary); transition: all var(--transition-base);
  }
  .quick-card:hover { border-color: var(--border-accent); background: var(--accent-soft); transform: translateX(4px); }
  .quick-icon { font-size: 1.4rem; }
  .quick-label { flex: 1; font-family: var(--font-display); font-weight: 700; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; }
  .quick-arrow { color: var(--accent); font-size: 1.2rem; transition: transform var(--transition-base); }
  .quick-card:hover .quick-arrow { transform: translateX(4px); }

  @media (max-width: 768px) {
    .charts-grid { grid-template-columns: 1fr; }
  }
</style>
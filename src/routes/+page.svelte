<script>
  const stats = [
    { value: '142', label: 'Miembros activos' },
    { value: '98%', label: 'Retención' },
    { value: '5', label: 'Clases hoy' },
  ];
</script>

<section class="hero">
  <!-- Fondo decorativo -->
  <div class="hero-bg" aria-hidden="true">
    <div class="grid-lines"></div>
    <div class="glow-orb"></div>
  </div>

  <!-- Etiqueta superior -->
  <div class="hero-tag animate-fade-in">
    <span class="tag-dot"></span>
    <span class="font-mono uppercase">Sistema de gestión · v1.0</span>
  </div>

  <!-- Título principal -->
  <h1 class="hero-title animate-fade-up delay-1">
    ENTRENA<br/>
    <span class="title-outline">SIN LÍMITES</span>
  </h1>

  <p class="hero-sub animate-fade-up delay-2">
    Gestiona tu gimnasio con precisión militar. Miembros, clases e ingresos
    — todo en un solo lugar.
  </p>

  <!-- CTA -->
  <div class="hero-actions animate-fade-up delay-3">
    <a href="/dashboard" class="btn btn-primary btn-lg">
      Ir al Panel →
    </a>
    <a href="/dashboard/members" class="btn btn-ghost btn-lg">
      Ver Miembros
    </a>
  </div>

  <!-- Stats rápidos -->
  <div class="hero-stats animate-fade-up delay-4">
    {#each stats as stat, i}
      <div class="hero-stat">
        <span class="stat-value accent">{stat.value}</span>
        <span class="stat-label font-mono">{stat.label}</span>
      </div>
      {#if i < stats.length - 1}
        <div class="stat-divider" aria-hidden="true"></div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .hero {
    position: relative;
    min-height: calc(100vh - var(--navbar-h) - var(--space-20));
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: var(--space-8);
    overflow: hidden;
    padding: var(--space-16) 0;
  }

  /* ── Fondo ── */
  .hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Cuadrícula sutil estilo blueprint */
  .grid-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    opacity: 0.4;
  }

  /* Destello de luz acento */
  .glow-orb {
    position: absolute;
    top: -20%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
  }

  /* ── Contenido ── */
  .hero > * { position: relative; z-index: 1; }

  /* Tag */
  .hero-tag {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: 0.72rem;
    letter-spacing: 0.15em;
    color: var(--text-muted);
  }
  .tag-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  /* Título */
  .hero-title {
    font-size: clamp(4rem, 12vw, 9rem);
    font-weight: 900;
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    color: var(--text-primary);
  }
  .title-outline {
    color: transparent;
    -webkit-text-stroke: 2px var(--accent);
    text-stroke: 2px var(--accent);
  }

  /* Subtítulo */
  .hero-sub {
    max-width: 480px;
    font-size: 1.1rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  /* Acciones */
  .hero-actions {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  /* Stats */
  .hero-stats {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    margin-top: var(--space-6);
    padding-top: var(--space-8);
    border-top: 1px solid var(--border);
    width: 100%;
    max-width: 600px;
  }
  .hero-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .stat-label {
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .stat-divider {
    width: 1px;
    height: 40px;
    background: var(--border-bright);
  }
</style>

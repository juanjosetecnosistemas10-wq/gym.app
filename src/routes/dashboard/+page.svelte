<h1 class="page-title">Panel de Control</h1>

<div class="stats-grid">
  <div class="card">
    <p class="card-label">Miembros Activos</p>
    <h2 class="card-value">142</h2>
  </div>
  
  <div class="card">
    <p class="card-label">Clases Hoy</p>
    <h2 class="card-value">5</h2>
  </div>
  
  <div class="card highlight">
    <p class="card-label">Ingresos del Mes</p>
    <h2 class="card-value">$12,450</h2>
  </div>
</div>

<style>
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    color: var(--text-primary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
  }

  .card {
    background-color: var(--bg-secondary);
    padding: var(--spacing-md);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .card:hover {
    transform: translateY(-3px);
    border-color: var(--text-secondary);
  }

  .card.highlight {
    border-color: var(--accent-color);
    box-shadow: 0 0 15px rgba(204, 255, 0, 0.1);
  }

  .card-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--spacing-xs);
  }

  .card-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .highlight .card-value {
    color: var(--accent-color);
  }
</style>
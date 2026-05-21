<script>
  import '../app.css';
</script>

<div class="app-container">
  <nav class="navbar">
    <a href="/" class="logo">GYM<span>APP</span></a>
    <div class="nav-links">
      <a href="/dashboard">Panel</a>
      <a href="/dashboard/members">Miembros</a>
      <a href="/dashboard/classes">Clases</a>
    </div>
  </nav>

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }
  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    text-decoration: none;
  }
  .logo span {
    color: var(--accent-color);
  }
  .nav-links {
    display: flex;
    gap: var(--spacing-md);
  }
  .nav-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.2s ease;
  }
  .nav-links a:hover {
    color: var(--accent-color);
  }
  .main-content {
    flex: 1;
    padding: var(--spacing-lg);
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
</style>
<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { createClient } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  const navLinks = [
    { href: '/dashboard', label: 'Panel' },
    { href: '/dashboard/members', label: 'Miembros' },
    { href: '/dashboard/classes', label: 'Clases' },
  ];

  // Ocultar navbar en el login
  $: isLoginPage = $page.url.pathname === '/login';

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    goto('/login');
  }
</script>

<div class="app-shell">

  {#if !isLoginPage}
  <header class="navbar">
    <div class="navbar-inner">
      <a href="/" class="logo">
        <span class="logo-icon">⬡</span>
        GYM<span class="logo-accent">APP</span>
      </a>

      <nav class="nav-links">
        {#each navLinks as link}
          <a
            href={link.href}
            class="nav-link"
            class:active={$page.url.pathname.startsWith(link.href)}
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <div class="navbar-end">
        <span class="status-dot"></span>
        <span class="status-label font-mono">ACTIVO</span>
        <button class="btn-logout font-mono" onclick={logout}>
          Salir →
        </button>
      </div>
    </div>
  </header>
  {/if}

  <main class="main-content" class:no-navbar={isLoginPage}>
    <slot />
  </main>

</div>

<style>
  .app-shell { min-height: 100vh; display: flex; flex-direction: column; }

  /* Navbar glassmorphism */
  .navbar {
    position: sticky; top: 0; z-index: 100;
    height: var(--navbar-h);
    background: rgba(13, 13, 13, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 1px 0 rgba(200,255,0,0.08), 0 4px 24px rgba(0,0,0,0.4);
  }

  .navbar-inner {
    max-width: var(--max-width); margin: 0 auto;
    padding: 0 var(--space-8); height: 100%;
    display: flex; align-items: center;
    justify-content: space-between; gap: var(--space-8);
  }

  /* Logo */
  .logo {
    font-family: var(--font-display); font-weight: 900; font-size: 1.4rem;
    letter-spacing: 0.08em; color: var(--text-primary); text-decoration: none;
    display: flex; align-items: center; gap: var(--space-2);
    text-transform: uppercase; flex-shrink: 0;
    transition: opacity var(--transition-fast);
  }
  .logo:hover { opacity: 0.85; }
  .logo-icon { color: var(--accent); font-size: 1rem; }
  .logo-accent { color: var(--accent); }

  /* Nav links */
  .nav-links { display: flex; align-items: center; gap: var(--space-1); flex: 1; justify-content: center; }
  .nav-link {
    font-family: var(--font-display); font-weight: 700; font-size: 0.85rem;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-secondary); text-decoration: none;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md); border: 1px solid transparent;
    transition: all var(--transition-base);
  }
  .nav-link:hover { color: var(--text-primary); background: var(--bg-elevated); border-color: var(--border); }
  .nav-link.active { color: var(--accent); background: var(--accent-soft); border-color: var(--border-accent); }

  /* Lado derecho */
  .navbar-end { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 6px var(--accent);
    animation: pulse 2s ease infinite;
  }
  .status-label { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }

  /* Botón logout */
  .btn-logout {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .btn-logout:hover { color: var(--accent-2); border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* Main */
  .main-content { flex: 1; max-width: var(--max-width); width: 100%; margin: 0 auto; padding: var(--space-10) var(--space-8); }
  .main-content.no-navbar { max-width: 100%; padding: 0; }
</style>
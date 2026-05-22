<script lang="ts">
  import { createClient } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');

  async function login() {
    if (!email || !password) {
      errorMsg = 'Email y contraseña son obligatorios';
      return;
    }
    loading = true;
    errorMsg = '';
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorMsg = 'Credenciales incorrectas. Verifica tu email y contraseña.';
    } else {
      goto('/dashboard');
    }
    loading = false;
  }

  // Permitir login con Enter
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') login();
  }
</script>

<div class="login-shell">

  <!-- Fondo decorativo -->
  <div class="login-bg" aria-hidden="true">
    <div class="grid-lines"></div>
    <div class="glow-orb"></div>
  </div>

  <div class="login-card animate-scale-in">

    <!-- Logo -->
    <div class="login-logo">
      <span class="logo-icon">⬡</span>
      GYM<span class="logo-accent">APP</span>
    </div>

    <div class="login-header">
      <h1 class="login-title">Acceso al Sistema</h1>
      <p class="section-label">Ingresa tus credenciales para continuar</p>
    </div>

    <!-- Formulario -->
    <div class="login-form">
      <div class="field">
        <label class="field-label font-mono">Email</label>
        <input
          type="email"
          placeholder="admin@gymapp.com"
          bind:value={email}
          onkeydown={handleKey}
          autocomplete="email"
        />
      </div>

      <div class="field">
        <label class="field-label font-mono">Contraseña</label>
        <input
          type="password"
          placeholder="••••••••"
          bind:value={password}
          onkeydown={handleKey}
          autocomplete="current-password"
        />
      </div>

      {#if errorMsg}
        <div class="error-msg animate-fade-in">
          <span>⚠</span> {errorMsg}
        </div>
      {/if}

      <button
        class="btn btn-primary w-full login-btn"
        onclick={login}
        disabled={loading}
      >
        {loading ? 'Verificando...' : 'Ingresar →'}
      </button>
    </div>

    <p class="login-footer font-mono">
      Sistema privado · Solo personal autorizado
    </p>

  </div>
</div>

<style>
  /* Ocupa toda la pantalla, centrado */
  .login-shell {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background: var(--bg-primary);
    z-index: 200;
  }

  /* Fondo decorativo (igual que el hero) */
  .login-bg { position: absolute; inset: 0; pointer-events: none; }
  .grid-lines {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    opacity: 0.4;
  }
  .glow-orb {
    position: absolute; top: -20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    filter: blur(80px); opacity: 0.4;
  }

  /* Card central */
  .login-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-top: 2px solid var(--accent);
    border-radius: var(--radius-xl);
    padding: var(--space-10) var(--space-8);
    box-shadow: var(--shadow-lg), 0 0 60px rgba(200,255,0,0.05);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  /* Logo */
  .login-logo {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .logo-icon { color: var(--accent); font-size: 1.1rem; }
  .logo-accent { color: var(--accent); }

  /* Header */
  .login-header { display: flex; flex-direction: column; gap: var(--space-2); }
  .login-title {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  /* Form */
  .login-form { display: flex; flex-direction: column; gap: var(--space-4); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }

  .login-btn { justify-content: center; padding: var(--space-4); font-size: 1rem; }

  /* Error */
  .error-msg {
    background: var(--accent-2-dim);
    border: 1px solid rgba(255, 92, 0, 0.3);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    font-size: 0.85rem;
    color: var(--accent-2);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Footer */
  .login-footer {
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    text-align: center;
  }
</style>
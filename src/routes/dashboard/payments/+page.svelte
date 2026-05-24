<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  let payments = $state<any[]>([]);
  let members = $state<any[]>([]);
  let loading = $state(true);
  let showForm = $state(false);
  let saving = $state(false);
  let formData = $state({ member_id: '', amount: '', plan: 'Mensual', paid_at: new Date().toISOString().slice(0,10), valid_until: '', notes: '' });

  // Búsqueda
  let search = $state('');
  let filtered = $derived(
    payments.filter(p =>
      search === '' ||
      p.members?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.plan?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Toasts
  let toasts = $state<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  let toastId = 0;
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
  }

  // Calcular valid_until automáticamente según el plan
  function updateValidUntil() {
    const start = new Date(formData.paid_at);
    if (formData.plan === 'Mensual')      start.setMonth(start.getMonth() + 1);
    else if (formData.plan === 'Trimestral') start.setMonth(start.getMonth() + 3);
    else if (formData.plan === 'Anual')   start.setFullYear(start.getFullYear() + 1);
    formData.valid_until = start.toISOString().slice(0,10);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function formatMoney(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  }

  // Estado del pago
  function paymentStatus(validUntil: string) {
    const today = new Date();
    const exp = new Date(validUntil);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return { label: 'Vencido',     class: 'badge-orange', days: diff };
    if (diff <= 7) return { label: 'Por vencer',  class: 'badge-orange', days: diff };
    return { label: 'Al día', class: 'badge-green', days: diff };
  }

  // Totales
  let totalIncome = $derived(payments.reduce((acc, p) => acc + Number(p.amount), 0));
  let totalThisMonth = $derived(payments.filter(p => {
    const d = new Date(p.paid_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((acc, p) => acc + Number(p.amount), 0));

  onMount(async () => {
    const supabase = createClient();
    const [{ data: payData }, { data: memData }] = await Promise.all([
      supabase.from('payments').select('*, members(name, email)').order('paid_at', { ascending: false }),
      supabase.from('members').select('id, name, plan').order('name'),
    ]);
    if (payData) payments = payData;
    if (memData) members = memData;
    loading = false;
  });

  function openForm() {
    formData = { member_id: '', amount: '', plan: 'Mensual', paid_at: new Date().toISOString().slice(0,10), valid_until: '', notes: '' };
    updateValidUntil();
    showForm = true;
  }

  async function savePayment() {
    if (!formData.member_id || !formData.amount) {
      showToast('Miembro y monto son obligatorios', 'error'); return;
    }
    saving = true;
    const supabase = createClient();
    const { data, error } = await supabase.from('payments').insert([{
      member_id: formData.member_id,
      amount: parseFloat(formData.amount),
      plan: formData.plan,
      paid_at: formData.paid_at,
      valid_until: formData.valid_until,
      notes: formData.notes || null,
    }]).select('*, members(name, email)');

    if (!error && data?.[0]) {
      payments = [data[0], ...payments];
      showToast(`✓ Pago registrado — ${formatMoney(data[0].amount)}`);
      showForm = false;
    } else {
      showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
    }
    saving = false;
  }

  let confirmDeleteId = $state<number | null>(null);
  async function deletePayment(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (!error) {
      payments = payments.filter(p => p.id !== id);
      confirmDeleteId = null;
      showToast('Pago eliminado');
    } else { showToast('Error: ' + error.message, 'error'); }
  }
</script>

<!-- TOASTS -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">{toast.message}</div>
  {/each}
</div>

<div class="payments-page">

  <!-- Encabezado -->
  <div class="page-header animate-fade-up">
    <div>
      <p class="section-label">Dashboard / Pagos</p>
      <h1 class="page-title">Gestión de Pagos</h1>
    </div>
    <button class="btn {showForm ? 'btn-ghost' : 'btn-primary'}" onclick={() => showForm ? showForm = false : openForm()}>
      {showForm ? '✕ Cancelar' : '+ Registrar Pago'}
    </button>
  </div>

  <!-- Stats de ingresos -->
  {#if !loading}
    <div class="income-stats animate-fade-up delay-1">
      <div class="card accent">
        <p class="section-label" style="margin-bottom:var(--space-3)">Ingresos Este Mes</p>
        <div class="stat-value accent">{formatMoney(totalThisMonth)}</div>
      </div>
      <div class="card">
        <p class="section-label" style="margin-bottom:var(--space-3)">Total Histórico</p>
        <div class="stat-value">{formatMoney(totalIncome)}</div>
      </div>
      <div class="card">
        <p class="section-label" style="margin-bottom:var(--space-3)">Pagos Registrados</p>
        <div class="stat-value">{payments.length}</div>
      </div>
    </div>
  {/if}

  <!-- FORMULARIO -->
  {#if showForm}
    <div class="form-card animate-scale-in">
      <p class="section-label" style="margin-bottom:var(--space-5)">Registrar Nuevo Pago</p>
      <div class="form-grid">
        <div class="field">
          <label class="field-label font-mono">Miembro</label>
          <select bind:value={formData.member_id}>
            <option value="">Selecciona un miembro...</option>
            {#each members as m}
              <option value={m.id}>{m.name}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label class="field-label font-mono">Monto (COP)</label>
          <input type="number" placeholder="80000" bind:value={formData.amount} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Plan</label>
          <select bind:value={formData.plan} onchange={updateValidUntil}>
            <option value="Mensual">Mensual</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label font-mono">Fecha de pago</label>
          <input type="date" bind:value={formData.paid_at} onchange={updateValidUntil} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Válido hasta</label>
          <input type="date" bind:value={formData.valid_until} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Notas (opcional)</label>
          <input type="text" placeholder="Ej: Pago en efectivo" bind:value={formData.notes} />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-sm" onclick={() => showForm = false}>Cancelar</button>
        <button class="btn btn-primary" onclick={savePayment} disabled={saving}>
          {saving ? 'Guardando...' : '✓ Registrar Pago'}
        </button>
      </div>
    </div>
  {/if}

  <!-- BÚSQUEDA -->
  {#if !loading && payments.length > 0}
    <div class="search-wrap animate-fade-up">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder="Buscar por miembro o plan..." bind:value={search} class="search-input" />
      {#if search}<button class="search-clear" onclick={() => search = ''}>✕</button>{/if}
    </div>
  {/if}

  <!-- TABLA -->
  {#if loading}
    <div class="table-card">
      {#each { length: 4 } as _}
        <div class="skeleton-row">
          <div class="skeleton" style="width:150px;height:14px"></div>
          <div class="skeleton" style="width:100px;height:14px"></div>
          <div class="skeleton" style="width:80px;height:24px;border-radius:99px"></div>
        </div>
      {/each}
    </div>

  {:else if payments.length === 0}
    <div class="empty-state">
      <span class="empty-icon">💰</span>
      <p class="empty-title font-display">Sin pagos registrados</p>
      <p class="text-secondary" style="font-size:0.9rem">Registra el primer pago con el botón de arriba.</p>
    </div>

  {:else}
    <div class="table-card animate-fade-in">
      <div class="table-meta font-mono">
        {filtered.length} pago{filtered.length !== 1 ? 's' : ''}
        {#if search} · búsqueda: "{search}"{/if}
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Miembro</th>
            <th>Plan</th>
            <th>Monto</th>
            <th>Fecha Pago</th>
            <th>Válido Hasta</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as p, i (p.id)}
            {@const status = paymentStatus(p.valid_until)}
            <tr class="animate-fade-up" style="animation-delay:{i * 0.03}s">
              <td>
                <div>
                  <div class="pay-member">{p.members?.name ?? '—'}</div>
                  <div class="pay-email font-mono">{p.members?.email ?? ''}</div>
                </div>
              </td>
              <td><span class="badge badge-gray">{p.plan}</span></td>
              <td><span class="pay-amount">{formatMoney(p.amount)}</span></td>
              <td><span class="pay-date font-mono">{formatDate(p.paid_at)}</span></td>
              <td><span class="pay-date font-mono">{formatDate(p.valid_until)}</span></td>
              <td>
                <span class="badge {status.class}">
                  {status.label}
                  {#if status.days >= 0} · {status.days}d{/if}
                </span>
              </td>
              <td>
                {#if confirmDeleteId === p.id}
                  <div class="confirm-del">
                    <span class="confirm-text font-mono">¿Eliminar?</span>
                    <button class="btn btn-danger btn-sm" onclick={() => deletePayment(p.id)}>Sí</button>
                    <button class="btn btn-ghost btn-sm" onclick={() => confirmDeleteId = null}>No</button>
                  </div>
                {:else}
                  <button class="btn-icon" onclick={() => confirmDeleteId = p.id} title="Eliminar">🗑️</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<style>
  .payments-page { display: flex; flex-direction: column; gap: var(--space-6); }
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }

  .income-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); }

  .form-card { background: var(--bg-secondary); border: 1px solid var(--border); border-top: 2px solid var(--accent); border-radius: var(--radius-lg); padding: var(--space-6); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }

  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: var(--space-4); font-size: 0.9rem; pointer-events: none; }
  .search-input { width: 100%; padding-left: calc(var(--space-4) * 2 + 1rem) !important; }
  .search-clear { position: absolute; right: var(--space-3); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; }

  .table-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .table-meta { padding: var(--space-4) var(--space-6); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
  .table { width: 100%; border-collapse: collapse; text-align: left; }
  .table thead { background: var(--bg-void); }
  .table th { padding: var(--space-4) var(--space-6); font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); font-weight: 400; }
  .table td { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); vertical-align: middle; }
  .table tbody tr { transition: background var(--transition-fast); }
  .table tbody tr:hover { background: var(--accent-soft); }

  .pay-member { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
  .pay-email { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
  .pay-amount { font-family: var(--font-display); font-weight: 800; font-size: 1rem; color: var(--accent); }
  .pay-date { font-size: 0.78rem; color: var(--text-secondary); }

  .btn-icon { background: none; border: 1px solid transparent; border-radius: var(--radius-md); padding: var(--space-2); cursor: pointer; font-size: 0.9rem; opacity: 0.4; transition: all var(--transition-fast); }
  .btn-icon:hover { opacity: 1; border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }
  .confirm-del { display: flex; align-items: center; gap: var(--space-2); }
  .confirm-text { font-size: 0.72rem; color: var(--accent-2); }

  .skeleton-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); }
  .skeleton-row:first-child { border-top: none; }
  .empty-state { text-align: center; padding: var(--space-20) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .empty-icon { font-size: 3rem; }
  .empty-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }

  @media (max-width: 768px) {
    .form-grid { grid-template-columns: 1fr; }
    .table th:nth-child(4), .table td:nth-child(4),
    .table th:nth-child(5), .table td:nth-child(5) { display: none; }
  }
</style>
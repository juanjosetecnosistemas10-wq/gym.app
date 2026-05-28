<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  let member = $state<any>(null);
  let enrollments = $state<any[]>([]);
  let availableClasses = $state<any[]>([]);
  let payments = $state<any[]>([]);
  let loading = $state(true);
  let enrolling = $state(false);
  let selectedClass = $state('');

  // Pago rápido desde perfil
  let showPayForm = $state(false);
  let savingPay = $state(false);
  let payData = $state({ amount: '', plan: 'Mensual', paid_at: new Date().toISOString().slice(0,10), valid_until: '' });

  // Toasts
  let toasts = $state<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  let toastId = 0;
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
  }

  // Helpers
  function getInitials(name: string) {
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }
  const avatarColors = ['#c8ff00', '#ff5c00', '#00d4ff', '#ff3399', '#a855f7'];
  function getAvatarColor(name: string) {
    return avatarColors[name.charCodeAt(0) % avatarColors.length];
  }
  function planClass(plan: string) {
    if (plan === 'Anual')      return 'badge badge-green';
    if (plan === 'Trimestral') return 'badge badge-orange';
    return 'badge badge-gray';
  }
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function formatMoney(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  }
  const classIcons: Record<string, string> = {
    yoga: '🧘', spinning: '🚴', crossfit: '🏋️', boxeo: '🥊',
    pilates: '🤸', zumba: '💃', natacion: '🏊', cardio: '🔥',
    funcional: '⚡', default: '📋',
  };
  function getIcon(name: string) {
    const key = name.toLowerCase();
    for (const k of Object.keys(classIcons)) {
      if (key.includes(k)) return classIcons[k];
    }
    return classIcons.default;
  }

  // Estado de pago basado en último pago
  let paymentStatus = $derived(() => {
    if (payments.length === 0) return { label: 'Sin pagos', class: 'badge-gray', days: null };
    const latest = payments[0];
    const today = new Date();
    const exp = new Date(latest.valid_until);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return { label: `Vencido hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`, class: 'badge-orange', days: diff };
    if (diff <= 7) return { label: `Vence en ${diff} día${diff !== 1 ? 's' : ''}`, class: 'badge-orange', days: diff };
    return { label: 'Al día', class: 'badge-green', days: diff };
  });

  let enrolledClassIds = $derived(enrollments.map(e => e.class_id));
  let classesToEnroll = $derived(availableClasses.filter(c => !enrolledClassIds.includes(c.id)));

  // Calcular valid_until automáticamente
  function updateValidUntil() {
    const start = new Date(payData.paid_at);
    if (payData.plan === 'Mensual')       start.setMonth(start.getMonth() + 1);
    else if (payData.plan === 'Trimestral') start.setMonth(start.getMonth() + 3);
    else if (payData.plan === 'Anual')    start.setFullYear(start.getFullYear() + 1);
    payData.valid_until = start.toISOString().slice(0,10);
  }

  onMount(async () => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    const supabase = createClient();

    const [
      { data: memberData, error: memberError },
      { data: enrollData },
      { data: classData },
      { data: paymentData },
    ] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('enrollments').select('*, classes(*)').eq('member_id', id).order('enrolled_at', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
      supabase.from('payments').select('*').eq('member_id', id).order('paid_at', { ascending: false }),
    ]);

    if (memberError || !memberData) {
      showToast('Miembro no encontrado', 'error');
      setTimeout(() => goto('/dashboard/members'), 1500);
      return;
    }

    member = memberData;
    if (enrollData) enrollments = enrollData;
    if (classData) availableClasses = classData;
    if (paymentData) payments = paymentData;

    // Precalcular valid_until del form de pago
    updateValidUntil();
    loading = false;
  });

  async function enroll() {
    if (!selectedClass) { showToast('Selecciona una clase', 'error'); return; }
    enrolling = true;
    const supabase = createClient();
    const { data: enrollData, error } = await supabase
      .from('enrollments')
      .insert([{ member_id: member.id, class_id: parseInt(selectedClass) }])
      .select('*, classes(*)');
    if (!error && enrollData?.[0]) {
      enrollments = [enrollData[0], ...enrollments];
      selectedClass = '';
      showToast('✓ Inscripción exitosa');
    } else {
      showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
    }
    enrolling = false;
  }

  async function unenroll(enrollmentId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (!error) {
      enrollments = enrollments.filter(e => e.id !== enrollmentId);
      showToast('Inscripción eliminada');
    } else {
      showToast('Error al eliminar', 'error');
    }
  }

  async function savePayment() {
    if (!payData.amount) { showToast('Ingresa el monto', 'error'); return; }
    savingPay = true;
    const supabase = createClient();
    const { data, error } = await supabase.from('payments').insert([{
      member_id: member.id,
      amount: parseFloat(payData.amount),
      plan: payData.plan,
      paid_at: payData.paid_at,
      valid_until: payData.valid_until,
    }]).select();
    if (!error && data?.[0]) {
      payments = [data[0], ...payments];
      showToast(`✓ Pago de ${formatMoney(data[0].amount)} registrado`);
      showPayForm = false;
      payData = { amount: '', plan: 'Mensual', paid_at: new Date().toISOString().slice(0,10), valid_until: '' };
      updateValidUntil();
    } else {
      showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
    }
    savingPay = false;
  }
</script>

<!-- TOASTS -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">{toast.message}</div>
  {/each}
</div>

{#if loading}
  <div class="profile-page">
    <div class="skeleton" style="width:120px;height:14px;border-radius:4px"></div>
    <div class="profile-header" style="margin-top:var(--space-6)">
      <div class="skeleton" style="width:80px;height:80px;border-radius:50%"></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="skeleton" style="width:220px;height:28px"></div>
        <div class="skeleton" style="width:160px;height:14px"></div>
      </div>
    </div>
  </div>

{:else if member}
  <div class="profile-page">

    <a href="/dashboard/members" class="back-link animate-fade-in">← Volver a Miembros</a>

    <!-- Header del perfil -->
    <div class="profile-header animate-fade-up">
      <div class="profile-avatar" style="--av-color:{getAvatarColor(member.name)}">
        {getInitials(member.name)}
      </div>
      <div class="profile-info">
        <div class="profile-name-row">
          <h1 class="profile-name">{member.name}</h1>
          <span class={planClass(member.plan)}>{member.plan}</span>
          <span class="badge {paymentStatus().class}">{paymentStatus().label}</span>
        </div>
        <p class="profile-id font-mono">ID #{String(member.id).slice(0,8).toUpperCase()}</p>
        <div class="profile-meta">
          {#if member.email}<span class="meta-item">✉️ {member.email}</span>{/if}
          {#if member.phone}<span class="meta-item">📞 {member.phone}</span>{/if}
          {#if member.created_at}<span class="meta-item">📅 Desde {formatDate(member.created_at)}</span>{/if}
        </div>
      </div>
    </div>

    <div class="divider divider-accent"></div>

    <!-- Grid principal -->
    <div class="profile-grid animate-fade-up delay-1">

      <!-- Columna izquierda -->
      <div class="left-col">

        <!-- Clases inscritas -->
        <div class="card">
          <p class="section-label" style="margin-bottom:var(--space-5)">
            Clases Inscritas
            <span class="count-badge">{enrollments.length}</span>
          </p>
          {#if enrollments.length === 0}
            <div class="empty-small"><span>📋</span><p>Sin clases asignadas aún</p></div>
          {:else}
            <div class="enrollment-list">
              {#each enrollments as e (e.id)}
                <div class="enrollment-item">
                  <div class="enrollment-icon">{getIcon(e.classes?.name ?? '')}</div>
                  <div class="enrollment-info">
                    <span class="enrollment-name">{e.classes?.name ?? 'Clase eliminada'}</span>
                    <span class="enrollment-instructor font-mono">{e.classes?.instructor ?? ''} · {e.classes?.schedule ?? ''}</span>
                  </div>
                  <button class="btn-icon" onclick={() => unenroll(e.id)} title="Quitar">✕</button>
                </div>
              {/each}
            </div>
          {/if}
          {#if classesToEnroll.length > 0}
            <div class="enroll-form">
              <p class="section-label" style="margin-top:var(--space-6);margin-bottom:var(--space-3)">Inscribir a clase</p>
              <div class="enroll-row">
                <select bind:value={selectedClass} style="flex:1">
                  <option value="">Selecciona una clase...</option>
                  {#each classesToEnroll as cls}
                    <option value={cls.id}>{cls.name} — {cls.instructor}</option>
                  {/each}
                </select>
                <button class="btn btn-primary btn-sm" onclick={enroll} disabled={enrolling}>
                  {enrolling ? '...' : '+ Inscribir'}
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Historial de pagos -->
        <div class="card">
          <div class="pay-header">
            <p class="section-label">
              Historial de Pagos
              <span class="count-badge">{payments.length}</span>
            </p>
            <button
              class="btn {showPayForm ? 'btn-ghost' : 'btn-primary'} btn-sm"
              onclick={() => showPayForm = !showPayForm}
            >
              {showPayForm ? '✕ Cancelar' : '+ Registrar Pago'}
            </button>
          </div>

          <!-- Formulario de pago rápido -->
          {#if showPayForm}
            <div class="pay-form animate-scale-in">
              <div class="pay-form-grid">
                <div class="field">
                  <label class="field-label font-mono">Monto (COP)</label>
                  <input type="number" placeholder="80000" bind:value={payData.amount} />
                </div>
                <div class="field">
                  <label class="field-label font-mono">Plan</label>
                  <select bind:value={payData.plan} onchange={updateValidUntil}>
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label font-mono">Fecha de pago</label>
                  <input type="date" bind:value={payData.paid_at} onchange={updateValidUntil} />
                </div>
                <div class="field">
                  <label class="field-label font-mono">Válido hasta</label>
                  <input type="date" bind:value={payData.valid_until} />
                </div>
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:var(--space-4)">
                <button class="btn btn-primary btn-sm" onclick={savePayment} disabled={savingPay}>
                  {savingPay ? 'Guardando...' : '✓ Registrar Pago'}
                </button>
              </div>
            </div>
          {/if}

          <!-- Lista de pagos -->
          {#if payments.length === 0}
            <div class="empty-small" style="margin-top:var(--space-4)">
              <span>💰</span>
              <p>Sin pagos registrados aún</p>
            </div>
          {:else}
            <div class="pay-list">
              {#each payments as p, i (p.id)}
                {@const today = new Date()}
                {@const exp = new Date(p.valid_until)}
                {@const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))}
                <div class="pay-item animate-fade-up" style="animation-delay:{i * 0.04}s">
                  <div class="pay-item-left">
                    <span class="pay-amount-val">{formatMoney(p.amount)}</span>
                    <span class="pay-item-detail font-mono">
                      {formatDateShort(p.paid_at)} · {p.plan}
                    </span>
                  </div>
                  <div class="pay-item-right">
                    <span class="badge {diff < 0 ? 'badge-orange' : diff <= 7 ? 'badge-orange' : 'badge-green'}" style="font-size:0.65rem">
                      {diff < 0 ? 'Vencido' : `Hasta ${formatDateShort(p.valid_until)}`}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      </div>

      <!-- Columna derecha: resumen -->
      <div class="stats-col">
        <div class="card">
          <p class="section-label" style="margin-bottom:var(--space-4)">Resumen</p>
          <div class="stat-list">
            <div class="stat-row">
              <span class="stat-row-label font-mono">Estado de pago</span>
              <span class="badge {paymentStatus().class}" style="font-size:0.7rem">{paymentStatus().label}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label font-mono">Clases activas</span>
              <span class="stat-row-value">{enrollments.length}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label font-mono">Plan actual</span>
              <span class="stat-row-value">{member.plan}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label font-mono">Total pagado</span>
              <span class="stat-row-value" style="color:var(--accent);font-size:1rem">
                {formatMoney(payments.reduce((acc, p) => acc + Number(p.amount), 0))}
              </span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label font-mono">Miembro desde</span>
              <span class="stat-row-value" style="font-size:0.85rem">
                {member.created_at ? formatDate(member.created_at) : '—'}
              </span>
            </div>
          </div>
        </div>

        <!-- Último pago -->
        {#if payments.length > 0}
          <div class="card last-payment">
            <p class="section-label" style="margin-bottom:var(--space-4)">Último Pago</p>
            <div class="last-pay-amount">{formatMoney(payments[0].amount)}</div>
            <div class="last-pay-detail font-mono">{payments[0].plan} · {formatDateShort(payments[0].paid_at)}</div>
            <div class="last-pay-until font-mono">Válido hasta {formatDateShort(payments[0].valid_until)}</div>
          </div>
        {/if}

      </div>
    </div>
  </div>
{/if}

<style>
  .profile-page { display: flex; flex-direction: column; gap: var(--space-8); }
  .back-link { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; display: inline-flex; align-items: center; gap: var(--space-2); transition: color var(--transition-fast); }
  .back-link:hover { color: var(--accent); }

  .profile-header { display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap; }
  .profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--av-color, var(--accent)); color: var(--bg-void); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 1.6rem; flex-shrink: 0; box-shadow: 0 0 0 4px var(--bg-secondary), 0 0 0 5px var(--border); }
  .profile-info { display: flex; flex-direction: column; gap: var(--space-2); }
  .profile-name-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .profile-name { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; line-height: 1; }
  .profile-id { font-size: 0.7rem; letter-spacing: 0.15em; color: var(--text-muted); }
  .profile-meta { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-2); }
  .meta-item { font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: var(--space-2); }

  .profile-grid { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4); align-items: start; }
  .left-col { display: flex; flex-direction: column; gap: var(--space-4); }
  .stats-col { display: flex; flex-direction: column; gap: var(--space-4); }

  .count-badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); color: var(--bg-void); font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700; margin-left: var(--space-2); }

  /* Clases */
  .enrollment-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .enrollment-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-void); transition: border-color var(--transition-fast); }
  .enrollment-item:hover { border-color: var(--border-bright); }
  .enrollment-icon { width: 36px; height: 36px; border-radius: var(--radius-md); background: var(--accent-soft); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
  .enrollment-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .enrollment-name { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
  .enrollment-instructor { font-size: 0.7rem; letter-spacing: 0.06em; color: var(--text-muted); }
  .enroll-row { display: flex; gap: var(--space-3); align-items: center; }
  .enroll-form { margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border); }

  /* Pagos */
  .pay-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
  .pay-form { background: var(--bg-void); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4); }
  .pay-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }

  .pay-list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
  .pay-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--bg-void); border: 1px solid var(--border); transition: border-color var(--transition-fast); }
  .pay-item:hover { border-color: var(--border-bright); }
  .pay-item-left { display: flex; flex-direction: column; gap: 3px; }
  .pay-amount-val { font-family: var(--font-display); font-weight: 800; font-size: 1rem; color: var(--accent); }
  .pay-item-detail { font-size: 0.7rem; letter-spacing: 0.06em; color: var(--text-muted); }

  /* Stats */
  .stat-list { display: flex; flex-direction: column; gap: var(--space-4); }
  .stat-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
  .stat-row-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .stat-row-value { font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }

  /* Último pago */
  .last-payment { border-color: var(--border-accent) !important; }
  .last-pay-amount { font-family: var(--font-display); font-weight: 900; font-size: 2rem; color: var(--accent); line-height: 1; margin-bottom: var(--space-2); }
  .last-pay-detail { font-size: 0.72rem; letter-spacing: 0.08em; color: var(--text-secondary); }
  .last-pay-until { font-size: 0.68rem; letter-spacing: 0.08em; color: var(--text-muted); margin-top: var(--space-2); }

  /* Botón icono */
  .btn-icon { background: none; border: 1px solid transparent; border-radius: var(--radius-md); padding: var(--space-2); cursor: pointer; font-size: 0.8rem; line-height: 1; transition: all var(--transition-fast); opacity: 0.3; color: var(--text-primary); }
  .btn-icon:hover { opacity: 1; border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); color: var(--accent-2); }

  /* Empty */
  .empty-small { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-8); color: var(--text-muted); font-size: 0.85rem; text-align: center; }
  .empty-small span { font-size: 1.8rem; }

  @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } .pay-form-grid { grid-template-columns: 1fr; } }
</style>
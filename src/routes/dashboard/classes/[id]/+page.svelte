<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  let cls = $state<any>(null);
  let enrollments = $state<any[]>([]);
  let attendance = $state<any[]>([]);
  let selectedDate = $state(new Date().toISOString().slice(0, 10));
  let loading = $state(true);
  let saving = $state(false);

  let toasts = $state<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  let toastId = 0;
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
  }

  function getInitials(name: string) {
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }
  const avatarColors = ['#c8ff00', '#ff5c00', '#00d4ff', '#ff3399', '#a855f7'];
  function getAvatarColor(name: string) {
    return avatarColors[name.charCodeAt(0) % avatarColors.length];
  }
  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // IDs de miembros presentes en la fecha seleccionada
  let presentIds = $derived(
    new Set(
      attendance
        .filter(a => a.date === selectedDate)
        .map(a => a.member_id)
    )
  );

  // Estadísticas
  let totalSessions = $derived(new Set(attendance.map(a => a.date)).size);
  let totalPresences = $derived(attendance.length);

  onMount(async () => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const supabase = createClient();

    const [
      { data: classData, error: classError },
      { data: enrollData },
      { data: attendData },
    ] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('enrollments').select('*, members(id, name, email)').eq('class_id', id),
      supabase.from('attendance').select('*').eq('class_id', id).order('date', { ascending: false }),
    ]);

    if (classError || !classData) {
      showToast('Clase no encontrada', 'error');
      setTimeout(() => goto('/dashboard/classes'), 1500);
      return;
    }

    cls = classData;
    if (enrollData) enrollments = enrollData;
    if (attendData) attendance = attendData;
    loading = false;
  });

  async function toggleAttendance(memberId: string) {
    const supabase = createClient();
    const isPresent = presentIds.has(memberId);

    if (isPresent) {
      // Quitar asistencia
      const record = attendance.find(a => a.member_id === memberId && a.date === selectedDate);
      if (!record) return;
      const { error } = await supabase.from('attendance').delete().eq('id', record.id);
      if (!error) {
        attendance = attendance.filter(a => a.id !== record.id);
      } else { showToast('Error al quitar asistencia', 'error'); }
    } else {
      // Marcar asistencia
      const { data, error } = await supabase.from('attendance').insert([{
        class_id: cls.id,
        member_id: memberId,
        date: selectedDate,
      }]).select();
      if (!error && data?.[0]) {
        attendance = [...attendance, data[0]];
      } else { showToast('Error al marcar asistencia', 'error'); }
    }
  }

  async function markAll() {
    saving = true;
    const supabase = createClient();
    const absentMembers = enrollments
      .map(e => e.members)
      .filter(m => m && !presentIds.has(m.id));

    if (absentMembers.length === 0) { showToast('Todos ya están marcados'); saving = false; return; }

    const toInsert = absentMembers.map(m => ({
      class_id: cls.id,
      member_id: m.id,
      date: selectedDate,
    }));

    const { data, error } = await supabase.from('attendance').insert(toInsert).select();
    if (!error && data) {
      attendance = [...attendance, ...data];
      showToast(`✓ ${data.length} miembros marcados`);
    } else { showToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); }
    saving = false;
  }

  // Historial: últimas fechas con asistencia
  let recentDates = $derived(
    [...new Set(attendance.map(a => a.date))]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10)
  );

  function attendanceForDate(date: string) {
    return attendance.filter(a => a.date === date).length;
  }
</script>

<!-- TOASTS -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">{toast.message}</div>
  {/each}
</div>

{#if loading}
  <div class="attend-page">
    <div class="skeleton" style="width:120px;height:14px;border-radius:4px"></div>
    <div style="margin-top:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
      {#each { length: 4 } as _}
        <div class="skeleton" style="width:100%;height:60px;border-radius:12px"></div>
      {/each}
    </div>
  </div>

{:else if cls}
  <div class="attend-page">

    <a href="/dashboard/classes" class="back-link animate-fade-in">← Volver a Clases</a>

    <!-- Header -->
    <div class="attend-header animate-fade-up">
      <div>
        <p class="section-label">Clases / Asistencia</p>
        <h1 class="page-title">{cls.name}</h1>
        <div class="class-meta">
          <span class="meta-item font-mono">👤 {cls.instructor}</span>
          <span class="meta-item font-mono">🕐 {cls.schedule}</span>
          <span class="meta-item font-mono">👥 {enrollments.length} inscritos</span>
        </div>
      </div>
    </div>

    <!-- Stats rápidos -->
    <div class="stats-row animate-fade-up delay-1">
      <div class="card stat-mini">
        <p class="section-label" style="margin-bottom:var(--space-2)">Sesiones</p>
        <span class="stat-value">{totalSessions}</span>
      </div>
      <div class="card stat-mini">
        <p class="section-label" style="margin-bottom:var(--space-2)">Asistencias totales</p>
        <span class="stat-value">{totalPresences}</span>
      </div>
      <div class="card stat-mini accent">
        <p class="section-label" style="margin-bottom:var(--space-2)">Hoy presentes</p>
        <span class="stat-value accent">{presentIds.size}</span>
      </div>
      <div class="card stat-mini">
        <p class="section-label" style="margin-bottom:var(--space-2)">% Asistencia hoy</p>
        <span class="stat-value">
          {enrollments.length > 0 ? Math.round((presentIds.size / enrollments.length) * 100) : 0}%
        </span>
      </div>
    </div>

    <div class="divider divider-accent"></div>

    <div class="attend-grid animate-fade-up delay-2">

      <!-- Panel de asistencia -->
      <div class="attend-main">
        <div class="card">
          <!-- Selector de fecha y acciones -->
          <div class="attend-controls">
            <div class="date-wrap">
              <label class="field-label font-mono">Fecha de clase</label>
              <input type="date" bind:value={selectedDate} style="width:auto" />
            </div>
            <div class="attend-actions">
              <span class="present-count font-mono">
                {presentIds.size}/{enrollments.length} presentes
              </span>
              <button class="btn btn-ghost btn-sm" onclick={markAll} disabled={saving}>
                {saving ? '...' : '✓ Marcar todos'}
              </button>
            </div>
          </div>

          <p class="date-label font-mono">{formatDate(selectedDate)}</p>

          <!-- Lista de miembros -->
          {#if enrollments.length === 0}
            <div class="empty-small">
              <span>👥</span>
              <p>Sin miembros inscritos en esta clase</p>
              <a href="/dashboard/members" class="btn btn-ghost btn-sm">Gestionar miembros</a>
            </div>
          {:else}
            <div class="member-list">
              {#each enrollments as e, i (e.id)}
                {@const member = e.members}
                {@const present = member && presentIds.has(member.id)}
                {#if member}
                  <button
                    class="member-row {present ? 'present' : ''}"
                    onclick={() => toggleAttendance(member.id)}
                    style="animation-delay:{i * 0.04}s"
                  >
                    <div class="member-avatar" style="--av-color:{getAvatarColor(member.name)}">
                      {getInitials(member.name)}
                    </div>
                    <div class="member-info">
                      <span class="member-name">{member.name}</span>
                      <span class="member-email font-mono">{member.email}</span>
                    </div>
                    <div class="attend-check {present ? 'checked' : ''}">
                      {present ? '✓' : '○'}
                    </div>
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Historial -->
      <div class="attend-sidebar">
        <div class="card">
          <p class="section-label" style="margin-bottom:var(--space-5)">Historial Reciente</p>
          {#if recentDates.length === 0}
            <div class="empty-small">
              <span>📅</span>
              <p>Sin sesiones registradas</p>
            </div>
          {:else}
            <div class="history-list">
              {#each recentDates as date}
                {@const count = attendanceForDate(date)}
                {@const pct = enrollments.length > 0 ? Math.round((count / enrollments.length) * 100) : 0}
                <button
                  class="history-item {selectedDate === date ? 'selected' : ''}"
                  onclick={() => selectedDate = date}
                >
                  <div class="history-info">
                    <span class="history-date font-mono">{formatDate(date)}</span>
                    <span class="history-count font-mono">{count} / {enrollments.length}</span>
                  </div>
                  <div class="history-bar-wrap">
                    <div class="history-bar" style="width:{pct}%"></div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  .attend-page { display: flex; flex-direction: column; gap: var(--space-8); }

  .back-link { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; display: inline-flex; align-items: center; gap: var(--space-2); transition: color var(--transition-fast); }
  .back-link:hover { color: var(--accent); }

  .attend-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }
  .class-meta { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-3); }
  .meta-item { font-size: 0.78rem; letter-spacing: 0.06em; color: var(--text-secondary); }

  /* Stats */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-4); }
  .stat-mini { padding: var(--space-4) var(--space-5); }

  /* Grid principal */
  .attend-grid { display: grid; grid-template-columns: 1fr 300px; gap: var(--space-4); align-items: start; }

  /* Controles */
  .attend-controls { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-3); }
  .date-wrap { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .attend-actions { display: flex; align-items: center; gap: var(--space-4); }
  .present-count { font-size: 0.72rem; letter-spacing: 0.1em; color: var(--text-muted); }
  .date-label { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: capitalize; color: var(--text-muted); margin-bottom: var(--space-5); }

  /* Lista de miembros */
  .member-list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
  .member-row {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-4); border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--bg-void);
    cursor: pointer; text-align: left; width: 100%;
    transition: all var(--transition-fast);
    animation: fade-up 0.3s ease both;
  }
  .member-row:hover { border-color: var(--border-bright); background: var(--bg-elevated); }
  .member-row.present { border-color: var(--border-accent); background: var(--accent-soft); }

  .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--av-color); color: var(--bg-void); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 0.85rem; flex-shrink: 0; }
  .member-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .member-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
  .member-email { font-size: 0.72rem; color: var(--text-muted); }

  .attend-check { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-bright); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: var(--text-muted); flex-shrink: 0; transition: all var(--transition-fast); }
  .attend-check.checked { border-color: var(--accent); background: var(--accent); color: var(--bg-void); font-weight: 900; }

  /* Historial */
  .history-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .history-item { background: var(--bg-void); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); cursor: pointer; text-align: left; width: 100%; transition: all var(--transition-fast); display: flex; flex-direction: column; gap: var(--space-2); }
  .history-item:hover { border-color: var(--border-bright); }
  .history-item.selected { border-color: var(--accent); background: var(--accent-soft); }
  .history-info { display: flex; justify-content: space-between; align-items: center; }
  .history-date { font-size: 0.72rem; letter-spacing: 0.06em; color: var(--text-secondary); text-transform: capitalize; }
  .history-count { font-size: 0.7rem; color: var(--text-muted); }
  .history-bar-wrap { height: 3px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
  .history-bar { height: 100%; background: var(--accent); border-radius: var(--radius-full); transition: width 0.5s ease; }

  /* Empty */
  .empty-small { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-8); color: var(--text-muted); font-size: 0.85rem; text-align: center; }
  .empty-small span { font-size: 1.8rem; }

  @media (max-width: 768px) { .attend-grid { grid-template-columns: 1fr; } }
</style>
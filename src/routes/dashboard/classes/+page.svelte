<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  let classes = $state<any[]>([]);
  let loading = $state(true);
  let formMode = $state<null | 'add' | 'edit'>(null);
  let editingClass = $state<any>(null);
  let formData = $state({ name: '', instructor: '', schedule: '', capacity: 20 });
  let saving = $state(false);
  let confirmDeleteId = $state<number | null>(null);
  let deleting = $state(false);

  // Vista: 'cards' o 'calendar'
  let view = $state<'cards' | 'calendar'>('cards');

  // Búsqueda
  let search = $state('');
  let filtered = $derived(
    classes.filter(c =>
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.toLowerCase().includes(search.toLowerCase())
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
  function capacityColor(cap: number) {
    if (cap >= 30) return 'badge-green';
    if (cap >= 15) return 'badge-orange';
    return 'badge-gray';
  }

  // ── Calendario: detectar días del texto ──────────────────────
  const DAYS = [
    { key: 'Lun', label: 'Lunes',     abbr: 'LUN' },
    { key: 'Mar', label: 'Martes',    abbr: 'MAR' },
    { key: 'Mié', label: 'Miércoles', abbr: 'MIÉ' },
    { key: 'Jue', label: 'Jueves',    abbr: 'JUE' },
    { key: 'Vie', label: 'Viernes',   abbr: 'VIE' },
    { key: 'Sáb', label: 'Sábado',    abbr: 'SÁB' },
    { key: 'Dom', label: 'Domingo',   abbr: 'DOM' },
  ];

  // Alias adicionales para detectar días escritos diferente
  const DAY_ALIASES: Record<string, string> = {
    'lun': 'Lun', 'lunes': 'Lun',
    'mar': 'Mar', 'martes': 'Mar',
    'mié': 'Mié', 'mie': 'Mié', 'miércoles': 'Mié', 'miercoles': 'Mié',
    'jue': 'Jue', 'jueves': 'Jue',
    'vie': 'Vie', 'viernes': 'Vie',
    'sáb': 'Sáb', 'sab': 'Sáb', 'sábado': 'Sáb', 'sabado': 'Sáb',
    'dom': 'Dom', 'domingo': 'Dom',
  };

  function getDaysFromSchedule(schedule: string): string[] {
    const lower = schedule.toLowerCase();
    const found = new Set<string>();
    for (const [alias, key] of Object.entries(DAY_ALIASES)) {
      if (lower.includes(alias)) found.add(key);
    }
    return Array.from(found);
  }

  function getTimeFromSchedule(schedule: string): string {
    const match = schedule.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/);
    return match ? match[0] : '';
  }

  // Clases por día para el calendario
  let calendarByDay = $derived(() => {
    const map: Record<string, any[]> = {};
    DAYS.forEach(d => map[d.key] = []);
    classes.forEach(cls => {
      const days = getDaysFromSchedule(cls.schedule);
      days.forEach(day => {
        if (map[day]) map[day].push(cls);
      });
    });
    return map;
  });

  function openAdd() {
    formData = { name: '', instructor: '', schedule: '', capacity: 20 };
    editingClass = null; formMode = 'add'; confirmDeleteId = null;
  }
  function openEdit(cls: any) {
    formData = { name: cls.name, instructor: cls.instructor, schedule: cls.schedule, capacity: cls.capacity };
    editingClass = cls; formMode = 'edit'; confirmDeleteId = null;
  }
  function closeForm() { formMode = null; editingClass = null; }

  onMount(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('classes').select('*').order('id');
    if (error) showToast('Error al cargar: ' + error.message, 'error');
    if (data) classes = data;
    loading = false;
  });

  async function saveClass() {
    if (!formData.name || !formData.instructor || !formData.schedule) {
      showToast('Nombre, instructor y horario son obligatorios', 'error'); return;
    }
    saving = true;
    const supabase = createClient();
    if (formMode === 'add') {
      const { data, error } = await supabase.from('classes').insert([formData]).select();
      if (!error && data?.[0]) {
        classes = [...classes, data[0]];
        showToast(`✓ Clase "${data[0].name}" creada`); closeForm();
      } else { showToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); }
    } else if (formMode === 'edit' && editingClass) {
      const { data, error } = await supabase.from('classes').update(formData).eq('id', editingClass.id).select();
      if (!error && data?.[0]) {
        classes = classes.map(c => c.id === editingClass.id ? data[0] : c);
        showToast(`✓ "${data[0].name}" actualizada`); closeForm();
      } else { showToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); }
    }
    saving = false;
  }

  async function deleteClass(id: number) {
    deleting = true;
    const supabase = createClient();
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
      classes = classes.filter(c => c.id !== id);
      confirmDeleteId = null; showToast('Clase eliminada');
    } else { showToast('Error al eliminar: ' + error.message, 'error'); }
    deleting = false;
  }
</script>

<!-- TOASTS -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">{toast.message}</div>
  {/each}
</div>

<div class="classes-page">

  <!-- Encabezado -->
  <div class="page-header animate-fade-up">
    <div>
      <p class="section-label">Dashboard / Clases</p>
      <h1 class="page-title">Clases del Gym</h1>
    </div>
    <div class="header-actions">
      <!-- Toggle de vista -->
      <div class="view-toggle">
        <button class="toggle-btn {view === 'cards' ? 'active' : ''}" onclick={() => view = 'cards'}>
          ▦ Cards
        </button>
        <button class="toggle-btn {view === 'calendar' ? 'active' : ''}" onclick={() => view = 'calendar'}>
          📅 Calendario
        </button>
      </div>
      <button
        class="btn {formMode === 'add' ? 'btn-ghost' : 'btn-primary'}"
        onclick={() => formMode === 'add' ? closeForm() : openAdd()}
      >
        {formMode === 'add' ? '✕ Cancelar' : '+ Nueva Clase'}
      </button>
    </div>
  </div>

  <!-- FORMULARIO -->
  {#if formMode !== null}
    <div class="form-card animate-scale-in">
      <p class="section-label" style="margin-bottom: var(--space-5)">
        {formMode === 'add' ? 'Registrar Nueva Clase' : `Editando — ${editingClass?.name}`}
      </p>
      <div class="form-grid">
        <div class="field">
          <label class="field-label font-mono">Nombre de la clase</label>
          <input type="text" placeholder="Ej: Crossfit Matutino" bind:value={formData.name} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Instructor</label>
          <input type="text" placeholder="Ej: Carlos Ruiz" bind:value={formData.instructor} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Horario</label>
          <input type="text" placeholder="Ej: Lun/Mié/Vie 6:00 AM" bind:value={formData.schedule} />
          <span class="field-hint font-mono">Usa: Lun Mar Mié Jue Vie Sáb Dom</span>
        </div>
        <div class="field">
          <label class="field-label font-mono">Capacidad máxima</label>
          <input type="number" min="1" max="100" bind:value={formData.capacity} />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-sm" onclick={closeForm}>Cancelar</button>
        <button class="btn btn-primary" onclick={saveClass} disabled={saving}>
          {saving ? 'Guardando...' : formMode === 'add' ? '✓ Crear Clase' : '✓ Guardar Cambios'}
        </button>
      </div>
    </div>
  {/if}

  <!-- BÚSQUEDA (solo en vista cards) -->
  {#if !loading && classes.length > 0 && view === 'cards'}
    <div class="search-bar animate-fade-up">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="Buscar por nombre o instructor..." bind:value={search} />
        {#if search}<button class="search-clear" onclick={() => search = ''}>✕</button>{/if}
      </div>
    </div>
  {/if}

  <!-- CONTENIDO -->
  {#if loading}
    <div class="cards-grid">
      {#each { length: 4 } as _}
        <div class="class-card">
          <div class="skeleton" style="width:48px;height:48px;border-radius:12px;margin-bottom:var(--space-4)"></div>
          <div class="skeleton" style="width:70%;height:18px;margin-bottom:var(--space-2)"></div>
          <div class="skeleton" style="width:50%;height:13px;margin-bottom:var(--space-4)"></div>
          <div class="skeleton" style="width:100%;height:1px;margin-bottom:var(--space-4)"></div>
          <div class="skeleton" style="width:40%;height:13px"></div>
        </div>
      {/each}
    </div>

  {:else if classes.length === 0}
    <div class="empty-state">
      <span class="empty-icon">🏋️</span>
      <p class="empty-title font-display">Sin clases aún</p>
      <p class="text-secondary" style="font-size:0.9rem">Crea tu primera clase con el botón de arriba.</p>
    </div>

  {:else if view === 'cards'}
    <!-- ── VISTA CARDS ── -->
    <div class="list-meta font-mono animate-fade-in">
      {#if search}
        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {classes.length}
      {:else}
        {classes.length} clase{classes.length !== 1 ? 's' : ''} registrada{classes.length !== 1 ? 's' : ''}
      {/if}
    </div>

    {#if filtered.length === 0}
      <div class="no-results">
        <span>🔍</span>
        <p class="font-mono">Sin resultados para "<strong>{search}</strong>"</p>
        <button class="btn btn-ghost btn-sm" onclick={() => search = ''}>Limpiar búsqueda</button>
      </div>
    {:else}
      <div class="cards-grid">
        {#each filtered as cls, i (cls.id)}
          <div class="class-card animate-fade-up" style="animation-delay:{i * 0.06}s">
            <div class="class-top">
              <div class="class-icon">{getIcon(cls.name)}</div>
              <div class="action-btns">
                {#if confirmDeleteId === cls.id}
                  <span class="confirm-text font-mono">¿Eliminar?</span>
                  <button class="btn btn-danger btn-sm" onclick={() => deleteClass(cls.id)} disabled={deleting}>
                    {deleting ? '...' : 'Sí'}
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick={() => confirmDeleteId = null}>No</button>
                {:else}
                  <button class="btn-icon edit" onclick={() => openEdit(cls)} title="Editar">✏️</button>
                  <button class="btn-icon delete" onclick={() => { confirmDeleteId = cls.id; formMode = null; }} title="Eliminar">🗑️</button>
                {/if}
              </div>
            </div>
            <h3 class="class-name">{cls.name}</h3>
            <p class="class-instructor font-mono">👤 {cls.instructor}</p>
            <div class="divider" style="margin: var(--space-4) 0"></div>
            <div class="class-footer">
              <div class="class-schedule"><span>🕐</span><span>{cls.schedule}</span></div>
              <span class="badge {capacityColor(cls.capacity)}">{cls.capacity} cupos</span>
            </div>
            <a href="/dashboard/classes/{cls.id}" class="btn btn-ghost btn-sm attend-btn">
              📋 Asistencia
            </a>
          </div>
        {/each}
      </div>
    {/if}

  {:else}
    <!-- ── VISTA CALENDARIO ── -->
    <div class="calendar animate-fade-in">
      <div class="calendar-header">
        {#each DAYS as day}
          <div class="cal-day-header">
            <span class="cal-day-abbr font-mono">{day.abbr}</span>
            <span class="cal-day-label">{day.label}</span>
          </div>
        {/each}
      </div>

      <div class="calendar-body">
        {#each DAYS as day}
          {@const dayClasses = calendarByDay()[day.key] ?? []}
          <div class="cal-col {dayClasses.length > 0 ? 'has-classes' : ''}">
            {#if dayClasses.length === 0}
              <div class="cal-empty font-mono">—</div>
            {:else}
              {#each dayClasses as cls (cls.id)}
                <div class="cal-class-card" onclick={() => openEdit(cls)}>
                  <div class="cal-class-icon">{getIcon(cls.name)}</div>
                  <div class="cal-class-info">
                    <span class="cal-class-name">{cls.name}</span>
                    <span class="cal-class-time font-mono">{getTimeFromSchedule(cls.schedule)}</span>
                    <span class="cal-class-instructor font-mono">👤 {cls.instructor}</span>
                  </div>
                  <span class="badge {capacityColor(cls.capacity)}" style="font-size:0.6rem;align-self:flex-start">
                    {cls.capacity}p
                  </span>
                </div>
              {/each}
            {/if}
          </div>
        {/each}
      </div>

      <!-- Leyenda -->
      <div class="cal-legend">
        <span class="cal-legend-item font-mono">
          <span class="cal-dot"></span>
          Clic en una clase para editarla
        </span>
        <span class="cal-legend-item font-mono">
          {classes.length} clase{classes.length !== 1 ? 's' : ''} · 
          {Object.values(calendarByDay()).flat().length} apariciones en la semana
        </span>
      </div>
    </div>
  {/if}

</div>

<style>
  .classes-page { display: flex; flex-direction: column; gap: var(--space-6); }

  .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }
  .header-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }

  /* Toggle de vista */
  .view-toggle { display: flex; background: var(--bg-void); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
  .toggle-btn { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: var(--space-2) var(--space-4); background: none; border: none; color: var(--text-muted); cursor: pointer; transition: all var(--transition-fast); }
  .toggle-btn.active { background: var(--accent); color: var(--bg-void); }
  .toggle-btn:not(.active):hover { color: var(--text-primary); background: var(--bg-elevated); }

  /* Formulario */
  .form-card { background: var(--bg-secondary); border: 1px solid var(--border); border-top: 2px solid var(--accent); border-radius: var(--radius-lg); padding: var(--space-6); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .field-hint { font-size: 0.65rem; letter-spacing: 0.08em; color: var(--text-muted); margin-top: 2px; }
  .form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }

  /* Búsqueda */
  .search-bar { display: flex; gap: var(--space-3); align-items: center; }
  .search-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: var(--space-4); font-size: 0.9rem; pointer-events: none; }
  .search-input { width: 100%; padding-left: calc(var(--space-4) * 2 + 1rem) !important; padding-right: var(--space-8) !important; }
  .search-clear { position: absolute; right: var(--space-3); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; }

  .list-meta { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }

  /* Cards grid */
  .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }
  .class-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); display: flex; flex-direction: column; transition: transform var(--transition-slow), border-color var(--transition-base), box-shadow var(--transition-base); position: relative; overflow: hidden; }
  .class-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 60%); pointer-events: none; }
  .class-card:hover { transform: translateY(-4px); border-color: var(--border-accent); box-shadow: var(--shadow-lg), 0 0 20px var(--accent-glow); }
  .class-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); }
  .class-icon { width: 48px; height: 48px; background: var(--accent-soft); border: 1px solid var(--border-accent); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
  .action-btns { display: flex; gap: var(--space-1); align-items: center; }
  .btn-icon { background: none; border: 1px solid transparent; border-radius: var(--radius-md); padding: var(--space-2); cursor: pointer; font-size: 0.9rem; line-height: 1; transition: all var(--transition-fast); opacity: 0.4; }
  .btn-icon:hover { opacity: 1; border-color: var(--border-bright); background: var(--bg-elevated); }
  .btn-icon.delete:hover { border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }
  .confirm-text { font-size: 0.68rem; letter-spacing: 0.08em; color: var(--accent-2); }
  .class-name { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text-primary); margin-bottom: var(--space-2); }
  .class-instructor { font-size: 0.75rem; letter-spacing: 0.06em; color: var(--text-muted); }
  .class-footer { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-top: auto; }
  .class-schedule { display: flex; align-items: center; gap: var(--space-2); font-size: 0.82rem; color: var(--text-secondary); }
  .attend-btn { margin-top: var(--space-3); justify-content: center; width: 100%; }

  /* ── Calendario ── */
  .calendar { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }

  .calendar-header { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--bg-void); border-bottom: 1px solid var(--border); }
  .cal-day-header { display: flex; flex-direction: column; align-items: center; padding: var(--space-4) var(--space-2); gap: var(--space-1); }
  .cal-day-abbr { font-size: 0.65rem; letter-spacing: 0.15em; color: var(--accent); }
  .cal-day-label { font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-body); }

  .calendar-body { display: grid; grid-template-columns: repeat(7, 1fr); min-height: 300px; }
  .cal-col { border-right: 1px solid var(--border); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
  .cal-col:last-child { border-right: none; }
  .cal-col.has-classes { background: rgba(200,255,0,0.01); }

  .cal-empty { font-size: 0.7rem; color: var(--text-muted); text-align: center; padding-top: var(--space-6); opacity: 0.5; }

  .cal-class-card { background: var(--bg-elevated); border: 1px solid var(--border-accent); border-radius: var(--radius-md); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); cursor: pointer; transition: all var(--transition-fast); }
  .cal-class-card:hover { background: var(--accent-soft); border-color: var(--accent); transform: scale(1.02); }
  .cal-class-icon { font-size: 1rem; line-height: 1; }
  .cal-class-info { display: flex; flex-direction: column; gap: 2px; }
  .cal-class-name { font-weight: 700; font-size: 0.78rem; color: var(--text-primary); line-height: 1.2; }
  .cal-class-time { font-size: 0.65rem; letter-spacing: 0.06em; color: var(--accent); }
  .cal-class-instructor { font-size: 0.62rem; color: var(--text-muted); }

  .cal-legend { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); border-top: 1px solid var(--border); background: var(--bg-void); flex-wrap: wrap; gap: var(--space-3); }
  .cal-legend-item { font-size: 0.65rem; letter-spacing: 0.08em; color: var(--text-muted); display: flex; align-items: center; gap: var(--space-2); }
  .cal-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }

  /* Empty / No results */
  .no-results { text-align: center; padding: var(--space-12) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); color: var(--text-secondary); }
  .no-results span { font-size: 2rem; }
  .empty-state { text-align: center; padding: var(--space-20) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .empty-icon { font-size: 3rem; }
  .empty-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }

  @media (max-width: 768px) {
    .form-grid { grid-template-columns: 1fr; }
    .calendar-header, .calendar-body { grid-template-columns: repeat(7, minmax(100px, 1fr)); overflow-x: auto; }
    .calendar { overflow-x: auto; }
  }
</style>
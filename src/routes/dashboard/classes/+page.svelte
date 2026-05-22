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

  // Toasts
  let toasts = $state<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  let toastId = 0;
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
  }

  // Íconos por tipo de clase
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

  // Color de capacidad
  function capacityColor(cap: number) {
    if (cap >= 30) return 'badge-green';
    if (cap >= 15) return 'badge-orange';
    return 'badge-gray';
  }

  function openAdd() {
    formData = { name: '', instructor: '', schedule: '', capacity: 20 };
    editingClass = null;
    formMode = 'add';
    confirmDeleteId = null;
  }

  function openEdit(cls: any) {
    formData = { name: cls.name, instructor: cls.instructor, schedule: cls.schedule, capacity: cls.capacity };
    editingClass = cls;
    formMode = 'edit';
    confirmDeleteId = null;
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
      showToast('Nombre, instructor y horario son obligatorios', 'error');
      return;
    }
    saving = true;
    const supabase = createClient();

    if (formMode === 'add') {
      const { data, error } = await supabase.from('classes').insert([formData]).select();
      if (!error && data?.[0]) {
        classes = [...classes, data[0]];
        showToast(`✓ Clase "${data[0].name}" creada`);
        closeForm();
      } else {
        showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
      }
    } else if (formMode === 'edit' && editingClass) {
      const { data, error } = await supabase.from('classes').update(formData).eq('id', editingClass.id).select();
      if (!error && data?.[0]) {
        classes = classes.map(c => c.id === editingClass.id ? data[0] : c);
        showToast(`✓ "${data[0].name}" actualizada`);
        closeForm();
      } else {
        showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
      }
    }
    saving = false;
  }

  async function deleteClass(id: number) {
    deleting = true;
    const supabase = createClient();
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
      classes = classes.filter(c => c.id !== id);
      confirmDeleteId = null;
      showToast('Clase eliminada');
    } else {
      showToast('Error al eliminar: ' + error.message, 'error');
    }
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
    <button
      class="btn {formMode === 'add' ? 'btn-ghost' : 'btn-primary'}"
      onclick={() => formMode === 'add' ? closeForm() : openAdd()}
    >
      {formMode === 'add' ? '✕ Cancelar' : '+ Nueva Clase'}
    </button>
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

  {:else}
    <!-- Contador -->
    <div class="list-meta font-mono animate-fade-in">
      {classes.length} clase{classes.length !== 1 ? 's' : ''} registrada{classes.length !== 1 ? 's' : ''}
    </div>

    <!-- Grid de cards -->
    <div class="cards-grid">
      {#each classes as cls, i (cls.id)}
        <div class="class-card animate-fade-up" style="animation-delay:{i * 0.06}s">

          <!-- Ícono y acciones -->
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

          <!-- Info -->
          <h3 class="class-name">{cls.name}</h3>
          <p class="class-instructor font-mono">👤 {cls.instructor}</p>

          <div class="divider" style="margin: var(--space-4) 0"></div>

          <div class="class-footer">
            <div class="class-schedule">
              <span class="schedule-icon">🕐</span>
              <span>{cls.schedule}</span>
            </div>
            <span class="badge {capacityColor(cls.capacity)}">
              {cls.capacity} cupos
            </span>
          </div>

        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  .classes-page { display: flex; flex-direction: column; gap: var(--space-6); }

  /* Header */
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }

  /* Formulario */
  .form-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-top: 2px solid var(--accent);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }

  /* Meta */
  .list-meta { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }

  /* Grid de cards */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  /* Card de clase */
  .class-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    transition: transform var(--transition-slow), border-color var(--transition-base), box-shadow var(--transition-base);
    position: relative;
    overflow: hidden;
  }
  .class-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 60%);
    pointer-events: none;
  }
  .class-card:hover {
    transform: translateY(-4px);
    border-color: var(--border-accent);
    box-shadow: var(--shadow-lg), 0 0 20px var(--accent-glow);
  }

  /* Top de la card */
  .class-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); }
  .class-icon {
    width: 48px; height: 48px;
    background: var(--accent-soft);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-md);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
  }

  /* Acciones */
  .action-btns { display: flex; gap: var(--space-1); align-items: center; }
  .btn-icon {
    background: none; border: 1px solid transparent; border-radius: var(--radius-md);
    padding: var(--space-2); cursor: pointer; font-size: 0.9rem; line-height: 1;
    transition: all var(--transition-fast); opacity: 0.4;
  }
  .btn-icon:hover { opacity: 1; border-color: var(--border-bright); background: var(--bg-elevated); }
  .btn-icon.delete:hover { border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }
  .confirm-text { font-size: 0.68rem; letter-spacing: 0.08em; color: var(--accent-2); }

  /* Info */
  .class-name { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em; color: var(--text-primary); margin-bottom: var(--space-2); }
  .class-instructor { font-size: 0.75rem; letter-spacing: 0.06em; color: var(--text-muted); }

  /* Footer */
  .class-footer { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-top: auto; }
  .class-schedule { display: flex; align-items: center; gap: var(--space-2); font-size: 0.82rem; color: var(--text-secondary); }
  .schedule-icon { font-size: 0.9rem; }

  /* Empty */
  .empty-state { text-align: center; padding: var(--space-20) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .empty-icon { font-size: 3rem; }
  .empty-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }

  /* Responsive */
  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
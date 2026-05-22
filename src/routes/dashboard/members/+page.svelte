<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  let members = $state<any[]>([]);
  let loading = $state(true);

  // Modo: null = cerrado, 'add' = nuevo, 'edit' = editando
  let formMode = $state<null | 'add' | 'edit'>(null);
  let editingMember = $state<any>(null);
  let formData = $state({ name: '', email: '', phone: '', plan: 'Mensual' });
  let saving = $state(false);

  // Confirmación de borrado inline
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

  // Helpers visuales
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

  // Abrir formulario de nuevo miembro
  function openAdd() {
    formData = { name: '', email: '', phone: '', plan: 'Mensual' };
    editingMember = null;
    formMode = 'add';
    confirmDeleteId = null;
  }

  // Abrir formulario de edición
  function openEdit(member: any) {
    formData = { name: member.name, email: member.email, phone: member.phone ?? '', plan: member.plan };
    editingMember = member;
    formMode = 'edit';
    confirmDeleteId = null;
  }

  // Cerrar formulario
  function closeForm() {
    formMode = null;
    editingMember = null;
  }

  // Cargar miembros
  onMount(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('members').select('*').order('id');
    if (error) showToast('Error al cargar: ' + error.message, 'error');
    if (data) members = data;
    loading = false;
  });

  // Guardar (crear o editar)
  async function saveMember() {
    if (!formData.name || !formData.email) {
      showToast('Nombre y Email son obligatorios', 'error');
      return;
    }
    saving = true;
    const supabase = createClient();

    if (formMode === 'add') {
      const { data, error } = await supabase.from('members').insert([formData]).select();
      if (!error && data?.[0]) {
        members = [...members, data[0]];
        showToast(`✓ ${data[0].name} registrado`);
        closeForm();
      } else {
        showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
      }

    } else if (formMode === 'edit' && editingMember) {
      const { data, error } = await supabase
        .from('members')
        .update(formData)
        .eq('id', editingMember.id)
        .select();
      if (!error && data?.[0]) {
        members = members.map(m => m.id === editingMember.id ? data[0] : m);
        showToast(`✓ ${data[0].name} actualizado`);
        closeForm();
      } else {
        showToast('Error: ' + (error?.message ?? 'desconocido'), 'error');
      }
    }
    saving = false;
  }

  // Eliminar miembro
  async function deleteMember(id: number) {
    deleting = true;
    const supabase = createClient();
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (!error) {
      members = members.filter(m => m.id !== id);
      confirmDeleteId = null;
      showToast('Miembro eliminado');
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

<div class="members-page">

  <!-- Encabezado -->
  <div class="page-header animate-fade-up">
    <div>
      <p class="section-label">Dashboard / Miembros</p>
      <h1 class="page-title">Miembros del Gym</h1>
    </div>
    <button
      class="btn {formMode === 'add' ? 'btn-ghost' : 'btn-primary'}"
      onclick={() => formMode === 'add' ? closeForm() : openAdd()}
    >
      {formMode === 'add' ? '✕ Cancelar' : '+ Nuevo Miembro'}
    </button>
  </div>

  <!-- FORMULARIO (crear o editar) -->
  {#if formMode !== null}
    <div class="form-card animate-scale-in">
      <p class="section-label" style="margin-bottom: var(--space-5)">
        {formMode === 'add' ? 'Registrar Nuevo Miembro' : `Editando — ${editingMember?.name}`}
      </p>
      <div class="form-grid">
        <div class="field">
          <label class="field-label font-mono">Nombre completo</label>
          <input type="text" placeholder="Ej: Carlos Rodríguez" bind:value={formData.name} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Correo electrónico</label>
          <input type="email" placeholder="correo@ejemplo.com" bind:value={formData.email} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Teléfono</label>
          <input type="text" placeholder="+57 300 000 0000" bind:value={formData.phone} />
        </div>
        <div class="field">
          <label class="field-label font-mono">Plan</label>
          <select bind:value={formData.plan}>
            <option value="Mensual">Mensual</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-sm" onclick={closeForm}>Cancelar</button>
        <button class="btn btn-primary" onclick={saveMember} disabled={saving}>
          {saving ? 'Guardando...' : formMode === 'add' ? '✓ Guardar Miembro' : '✓ Guardar Cambios'}
        </button>
      </div>
    </div>
  {/if}

  <!-- TABLA / ESTADOS -->
  {#if loading}
    <div class="table-card">
      {#each { length: 5 } as _}
        <div class="skeleton-row">
          <div class="skeleton" style="width:40px;height:40px;border-radius:50%"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div class="skeleton" style="width:40%;height:14px"></div>
            <div class="skeleton" style="width:60%;height:12px"></div>
          </div>
          <div class="skeleton" style="width:80px;height:24px;border-radius:99px"></div>
        </div>
      {/each}
    </div>

  {:else if members.length === 0}
    <div class="empty-state">
      <span class="empty-icon">🏋️</span>
      <p class="empty-title font-display">Sin miembros aún</p>
      <p class="text-secondary" style="font-size:0.9rem">Agrega tu primer miembro con el botón de arriba.</p>
    </div>

  {:else}
    <div class="table-card animate-fade-in">
      <div class="table-meta font-mono">
        {members.length} miembro{members.length !== 1 ? 's' : ''} registrado{members.length !== 1 ? 's' : ''}
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Miembro</th>
            <th>Contacto</th>
            <th>Plan</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each members as member, i (member.id)}
            <tr class="animate-fade-up" style="animation-delay:{i * 0.04}s">
              <td>
                <div class="member-cell">
                  <div class="avatar" style="--av-color:{getAvatarColor(member.name)}">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <div class="member-name">{member.name}</div>
                    <div class="member-id font-mono">#{String(member.id).padStart(4, '0')}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="contact-cell">
                  <span class="contact-email">{member.email}</span>
                  {#if member.phone}
                    <span class="contact-phone font-mono">{member.phone}</span>
                  {/if}
                </div>
              </td>
              <td>
                <span class={planClass(member.plan)}>{member.plan}</span>
              </td>
              <td>
                <!-- Confirmación de borrado inline -->
                {#if confirmDeleteId === member.id}
                  <div class="confirm-delete">
                    <span class="confirm-text font-mono">¿Eliminar?</span>
                    <button
                      class="btn btn-danger btn-sm"
                      onclick={() => deleteMember(member.id)}
                      disabled={deleting}
                    >
                      {deleting ? '...' : 'Sí'}
                    </button>
                    <button
                      class="btn btn-ghost btn-sm"
                      onclick={() => confirmDeleteId = null}
                    >
                      No
                    </button>
                  </div>
                {:else}
                  <div class="action-btns">
                    <button
                      class="btn-icon edit"
                      onclick={() => openEdit(member)}
                      title="Editar"
                    >✏️</button>
                    <button
                      class="btn-icon delete"
                      onclick={() => { confirmDeleteId = member.id; formMode = null; }}
                      title="Eliminar"
                    >🗑️</button>
                  </div>
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
  .members-page { display: flex; flex-direction: column; gap: var(--space-6); }

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

  /* Tabla */
  .table-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .table-meta { padding: var(--space-4) var(--space-6); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
  .table { width: 100%; border-collapse: collapse; text-align: left; }
  .table thead { background: var(--bg-void); }
  .table th { padding: var(--space-4) var(--space-6); font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); font-weight: 400; }
  .table td { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); vertical-align: middle; }
  .table tbody tr { transition: background var(--transition-fast); }
  .table tbody tr:hover { background: var(--accent-soft); }

  /* Celdas */
  .member-cell { display: flex; align-items: center; gap: var(--space-4); }
  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--av-color, var(--accent));
    color: var(--bg-void);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-weight: 900; font-size: 0.85rem;
    flex-shrink: 0; opacity: 0.9;
  }
  .member-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
  .member-id { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
  .contact-cell { display: flex; flex-direction: column; gap: 3px; }
  .contact-email { font-size: 0.9rem; color: var(--text-secondary); }
  .contact-phone { font-size: 0.75rem; color: var(--text-muted); }

  /* Botones de acción */
  .action-btns { display: flex; gap: var(--space-2); align-items: center; }
  .btn-icon {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-2);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    transition: all var(--transition-fast);
    opacity: 0.5;
  }
  .btn-icon:hover { opacity: 1; border-color: var(--border-bright); background: var(--bg-elevated); }
  .btn-icon.delete:hover { border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }

  /* Confirmación de borrado */
  .confirm-delete { display: flex; align-items: center; gap: var(--space-2); }
  .confirm-text { font-size: 0.72rem; letter-spacing: 0.08em; color: var(--accent-2); }

  /* Skeleton */
  .skeleton-row { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); }
  .skeleton-row:first-child { border-top: none; }

  /* Empty */
  .empty-state { text-align: center; padding: var(--space-20) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .empty-icon { font-size: 3rem; }
  .empty-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }

  /* Responsive */
  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .table th:nth-child(2), .table td:nth-child(2) { display: none; }
  }
</style>
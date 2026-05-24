<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  let members = $state<any[]>([]);
  let loading = $state(true);
  let formMode = $state<null | 'add' | 'edit'>(null);
  let editingMember = $state<any>(null);
  let formData = $state({ name: '', email: '', phone: '', plan: 'Mensual' });
  let saving = $state(false);
  let confirmDeleteId = $state<number | null>(null);
  let deleting = $state(false);

  // Búsqueda y filtros
  let search = $state('');
  let filterPlan = $state('Todos');
  const plans = ['Todos', 'Mensual', 'Trimestral', 'Anual'];
  let filtered = $derived(
    members.filter(m => {
      const matchSearch = search === '' ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchPlan = filterPlan === 'Todos' || m.plan === filterPlan;
      return matchSearch && matchPlan;
    })
  );

  // Toasts
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
  function planClass(plan: string) {
    if (plan === 'Anual')      return 'badge badge-green';
    if (plan === 'Trimestral') return 'badge badge-orange';
    return 'badge badge-gray';
  }

  function openAdd() {
    formData = { name: '', email: '', phone: '', plan: 'Mensual' };
    editingMember = null; formMode = 'add'; confirmDeleteId = null;
  }
  function openEdit(member: any) {
    formData = { name: member.name, email: member.email, phone: member.phone ?? '', plan: member.plan };
    editingMember = member; formMode = 'edit'; confirmDeleteId = null;
  }
  function closeForm() { formMode = null; editingMember = null; }

  onMount(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    if (error) showToast('Error al cargar: ' + error.message, 'error');
    if (data) members = data;
    loading = false;
  });

  async function saveMember() {
    if (!formData.name || !formData.email) {
      showToast('Nombre y Email son obligatorios', 'error'); return;
    }
    saving = true;
    const supabase = createClient();
    if (formMode === 'add') {
      const { data, error } = await supabase.from('members').insert([formData]).select();
      if (!error && data?.[0]) {
        members = [data[0], ...members];
        showToast(`✓ ${data[0].name} registrado`); closeForm();
      } else { showToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); }
    } else if (formMode === 'edit' && editingMember) {
      const { data, error } = await supabase.from('members').update(formData).eq('id', editingMember.id).select();
      if (!error && data?.[0]) {
        members = members.map(m => m.id === editingMember.id ? data[0] : m);
        showToast(`✓ ${data[0].name} actualizado`); closeForm();
      } else { showToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); }
    }
    saving = false;
  }

  async function deleteMember(id: string) {
    deleting = true;
    const supabase = createClient();
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (!error) {
      members = members.filter(m => m.id !== id);
      confirmDeleteId = null;
      showToast('Miembro eliminado');
    } else { showToast('Error al eliminar: ' + error.message, 'error'); }
    deleting = false;
  }

  // ── EXPORTAR CSV ──────────────────────────────────────────────
  function exportCSV() {
    const headers = ['nombre', 'email', 'telefono', 'plan'];
    const rows = members.map(m => [
      `"${m.name}"`, `"${m.email}"`, `"${m.phone ?? ''}"`, `"${m.plan}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miembros_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ ${members.length} miembros exportados`);
  }

  // ── IMPORTAR CSV ──────────────────────────────────────────────
  let showImport = $state(false);
  let importing = $state(false);
  let importErrors = $state<string[]>([]);
  let importPreview = $state<any[]>([]);

  function openImport() { showImport = true; importPreview = []; importErrors = []; formMode = null; }
  function closeImport() { showImport = false; importPreview = []; importErrors = []; }

  function parseCSV(text: string) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    return lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: any = { _row: i + 2 };
      headers.forEach((h, j) => {
        if (h === 'nombre' || h === 'name')       obj.name = vals[j] ?? '';
        else if (h === 'email')                    obj.email = vals[j] ?? '';
        else if (h === 'telefono' || h === 'phone') obj.phone = vals[j] ?? '';
        else if (h === 'plan')                     obj.plan = vals[j] ?? 'Mensual';
      });
      return obj;
    }).filter(r => r.name || r.email);
  }

  function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      importErrors = [];
      parsed.forEach(row => {
        if (!row.name)  importErrors = [...importErrors, `Fila ${row._row}: falta el nombre`];
        if (!row.email) importErrors = [...importErrors, `Fila ${row._row}: falta el email`];
        if (!['Mensual','Trimestral','Anual'].includes(row.plan)) row.plan = 'Mensual';
      });
      importPreview = parsed;
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function confirmImport() {
    if (importPreview.length === 0) return;
    importing = true;
    const supabase = createClient();
    const toInsert = importPreview.map(({ _row, ...m }) => m);
    const { data, error } = await supabase.from('members').insert(toInsert).select();
    if (!error && data) {
      members = [...data, ...members];
      showToast(`✓ ${data.length} miembros importados`);
      closeImport();
    } else {
      showToast('Error: ' + (error?.message ?? 'verifica emails duplicados'), 'error');
    }
    importing = false;
  }
</script>

<!-- TOASTS -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast {toast.type}">{toast.message}</div>
  {/each}
</div>

<!-- MODAL IMPORTAR -->
{#if showImport}
  <div class="modal-overlay" onclick={closeImport}>
    <div class="modal animate-scale-in" onclick={(e) => e.stopPropagation()}>

      <div class="modal-header">
        <h3 class="modal-title">Importar Miembros desde CSV</h3>
        <button class="modal-close" onclick={closeImport}>✕</button>
      </div>

      <div class="modal-body">
        <!-- Instrucciones -->
        <div class="import-info">
          <p class="section-label" style="margin-bottom: var(--space-3)">Formato requerido</p>
          <code class="csv-example">nombre,email,telefono,plan<br/>
Juan García,juan@email.com,+57 300 000 0000,Mensual<br/>
Ana López,ana@email.com,,Anual</code>
          <p style="font-size:0.8rem; color: var(--text-muted); margin-top: var(--space-3)">
            El campo <strong style="color:var(--text-secondary)">plan</strong> acepta: Mensual, Trimestral o Anual. Si está vacío usa Mensual por defecto.
          </p>
        </div>

        <!-- Upload -->
        <label class="file-upload">
          <input type="file" accept=".csv" onchange={handleFileUpload} />
          <span class="file-upload-icon">📂</span>
          <span class="file-upload-text font-mono">Seleccionar archivo .csv</span>
        </label>

        <!-- Errores -->
        {#if importErrors.length > 0}
          <div class="import-errors">
            <p class="section-label" style="margin-bottom: var(--space-2); color: var(--accent-2)">
              ⚠ {importErrors.length} error{importErrors.length !== 1 ? 'es' : ''}
            </p>
            {#each importErrors as err}
              <p class="error-line font-mono">{err}</p>
            {/each}
          </div>
        {/if}

        <!-- Preview -->
        {#if importPreview.length > 0}
          <div class="import-preview">
            <p class="section-label" style="margin-bottom: var(--space-3)">
              Vista previa — {importPreview.length} miembro{importPreview.length !== 1 ? 's' : ''}
            </p>
            <div class="preview-list">
              {#each importPreview.slice(0, 5) as row}
                <div class="preview-row">
                  <div class="preview-avatar" style="background: {avatarColors[row.name?.charCodeAt(0) % avatarColors.length]}">
                    {row.name?.slice(0,2).toUpperCase() ?? '??'}
                  </div>
                  <div>
                    <div style="font-weight:600; font-size:0.9rem">{row.name || '—'}</div>
                    <div style="font-size:0.75rem; color: var(--text-muted)">{row.email || '—'}</div>
                  </div>
                  <span class="badge {row.plan === 'Anual' ? 'badge-green' : row.plan === 'Trimestral' ? 'badge-orange' : 'badge-gray'}" style="margin-left:auto">
                    {row.plan}
                  </span>
                </div>
              {/each}
              {#if importPreview.length > 5}
                <p class="font-mono" style="font-size:0.72rem; color: var(--text-muted); text-align:center; padding: var(--space-2)">
                  + {importPreview.length - 5} más...
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" onclick={closeImport}>Cancelar</button>
        <button
          class="btn btn-primary"
          onclick={confirmImport}
          disabled={importing || importPreview.length === 0 || importErrors.length > 0}
        >
          {importing ? 'Importando...' : `✓ Importar ${importPreview.length} miembros`}
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="members-page">

  <!-- Encabezado -->
  <div class="page-header animate-fade-up">
    <div>
      <p class="section-label">Dashboard / Miembros</p>
      <h1 class="page-title">Miembros del Gym</h1>
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" onclick={exportCSV} disabled={members.length === 0}>
        ↓ Exportar CSV
      </button>
      <button class="btn btn-ghost btn-sm" onclick={openImport}>
        ↑ Importar CSV
      </button>
      <button
        class="btn {formMode === 'add' ? 'btn-ghost' : 'btn-primary'}"
        onclick={() => formMode === 'add' ? closeForm() : openAdd()}
      >
        {formMode === 'add' ? '✕ Cancelar' : '+ Nuevo Miembro'}
      </button>
    </div>
  </div>

  <!-- FORMULARIO -->
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

  <!-- BÚSQUEDA Y FILTROS -->
  {#if !loading && members.length > 0}
    <div class="search-bar animate-fade-up">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="search-input"
          placeholder="Buscar por nombre o email..."
          bind:value={search}
        />
        {#if search}
          <button class="search-clear" onclick={() => search = ''}>✕</button>
        {/if}
      </div>
      <div class="filter-pills">
        {#each plans as plan}
          <button
            class="filter-pill {filterPlan === plan ? 'active' : ''}"
            onclick={() => filterPlan = plan}
          >{plan}</button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- TABLA -->
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
      <p class="text-secondary" style="font-size:0.9rem">Agrega tu primer miembro o importa un CSV.</p>
    </div>

  {:else}
    <div class="table-card animate-fade-in">
      <div class="table-meta font-mono">
        {#if search || filterPlan !== 'Todos'}
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {members.length}
        {:else}
          {members.length} miembro{members.length !== 1 ? 's' : ''} registrado{members.length !== 1 ? 's' : ''}
        {/if}
      </div>

      {#if filtered.length === 0}
        <div class="no-results">
          <span>🔍</span>
          <p class="font-mono">Sin resultados para "<strong>{search}</strong>"</p>
          <button class="btn btn-ghost btn-sm" onclick={() => { search = ''; filterPlan = 'Todos'; }}>
            Limpiar filtros
          </button>
        </div>
      {:else}
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
            {#each filtered as member, i (member.id)}
              <tr class="animate-fade-up" style="animation-delay:{i * 0.03}s">
                <td>
                  <div class="member-cell">
                    <div class="avatar" style="--av-color:{getAvatarColor(member.name)}">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <a class="member-name" href="/dashboard/members/{member.id}">{member.name}</a>
                      <div class="member-id font-mono">#{String(member.id).slice(0,8).toUpperCase()}</div>
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
                  {#if confirmDeleteId === member.id}
                    <div class="confirm-delete">
                      <span class="confirm-text font-mono">¿Eliminar?</span>
                      <button class="btn btn-danger btn-sm" onclick={() => deleteMember(member.id)} disabled={deleting}>
                        {deleting ? '...' : 'Sí'}
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick={() => confirmDeleteId = null}>No</button>
                    </div>
                  {:else}
                    <div class="action-btns">
                      <button class="btn-icon edit" onclick={() => openEdit(member)} title="Editar">✏️</button>
                      <button class="btn-icon delete" onclick={() => { confirmDeleteId = member.id; formMode = null; }} title="Eliminar">🗑️</button>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}

</div>

<style>
  .members-page { display: flex; flex-direction: column; gap: var(--space-6); }

  .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
  .page-title { font-size: clamp(2rem, 5vw, 3.5rem); margin-top: var(--space-2); }
  .header-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }

  .form-card { background: var(--bg-secondary); border: 1px solid var(--border); border-top: 2px solid var(--accent); border-radius: var(--radius-lg); padding: var(--space-6); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
  .field { display: flex; flex-direction: column; gap: var(--space-2); }
  .field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }

  /* Búsqueda */
  .search-bar { display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap; }
  .search-input-wrap { flex: 1; min-width: 200px; position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: var(--space-4); font-size: 0.9rem; pointer-events: none; }
  .search-input { width: 100%; padding-left: calc(var(--space-4) * 2 + 1rem) !important; padding-right: var(--space-8) !important; }
  .search-clear { position: absolute; right: var(--space-3); background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; padding: var(--space-1); border-radius: var(--radius-sm); transition: color var(--transition-fast); }
  .search-clear:hover { color: var(--text-primary); }
  .filter-pills { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .filter-pill { font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; padding: var(--space-2) var(--space-3); border-radius: var(--radius-full); border: 1px solid var(--border); background: transparent; color: var(--text-muted); cursor: pointer; transition: all var(--transition-fast); }
  .filter-pill:hover { border-color: var(--border-bright); color: var(--text-primary); }
  .filter-pill.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

  /* Tabla */
  .table-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .table-meta { padding: var(--space-4) var(--space-6); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
  .table { width: 100%; border-collapse: collapse; text-align: left; }
  .table thead { background: var(--bg-void); }
  .table th { padding: var(--space-4) var(--space-6); font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); font-weight: 400; }
  .table td { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); vertical-align: middle; }
  .table tbody tr { transition: background var(--transition-fast); }
  .table tbody tr:hover { background: var(--accent-soft); }

  .member-cell { display: flex; align-items: center; gap: var(--space-4); }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--av-color, var(--accent)); color: var(--bg-void); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 0.85rem; flex-shrink: 0; }
  .member-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); text-decoration: none; transition: color var(--transition-fast); }
  .member-name:hover { color: var(--accent); }
  .member-id { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
  .contact-cell { display: flex; flex-direction: column; gap: 3px; }
  .contact-email { font-size: 0.9rem; color: var(--text-secondary); }
  .contact-phone { font-size: 0.75rem; color: var(--text-muted); }

  .action-btns { display: flex; gap: var(--space-2); align-items: center; }
  .btn-icon { background: none; border: 1px solid transparent; border-radius: var(--radius-md); padding: var(--space-2); cursor: pointer; font-size: 1rem; line-height: 1; transition: all var(--transition-fast); opacity: 0.5; }
  .btn-icon:hover { opacity: 1; border-color: var(--border-bright); background: var(--bg-elevated); }
  .btn-icon.delete:hover { border-color: rgba(255,92,0,0.4); background: var(--accent-2-dim); }
  .confirm-delete { display: flex; align-items: center; gap: var(--space-2); }
  .confirm-text { font-size: 0.72rem; letter-spacing: 0.08em; color: var(--accent-2); }

  .no-results { text-align: center; padding: var(--space-12) var(--space-8); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); color: var(--text-secondary); font-size: 0.95rem; }
  .no-results span { font-size: 2rem; }

  .skeleton-row { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); }
  .skeleton-row:first-child { border-top: none; }
  .empty-state { text-align: center; padding: var(--space-20) var(--space-8); border: 1px dashed var(--border-bright); border-radius: var(--radius-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
  .empty-icon { font-size: 3rem; }
  .empty-title { font-size: 1.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
  .modal { background: var(--bg-secondary); border: 1px solid var(--border); border-top: 2px solid var(--accent); border-radius: var(--radius-xl); width: 100%; max-width: 540px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-6); border-bottom: 1px solid var(--border); }
  .modal-title { font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; letter-spacing: -0.01em; }
  .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: var(--space-2); border-radius: var(--radius-md); transition: all var(--transition-fast); }
  .modal-close:hover { color: var(--text-primary); background: var(--bg-elevated); }
  .modal-body { flex: 1; overflow-y: auto; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5); }
  .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-5) var(--space-6); border-top: 1px solid var(--border); }

  /* Import */
  .import-info { background: var(--bg-void); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); }
  .csv-example { display: block; font-size: 0.75rem; color: var(--accent); line-height: 1.8; white-space: pre; margin-top: var(--space-2); }
  .file-upload { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-8); border: 2px dashed var(--border-bright); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-base); }
  .file-upload:hover { border-color: var(--accent); background: var(--accent-soft); }
  .file-upload input { display: none; }
  .file-upload-icon { font-size: 2rem; }
  .file-upload-text { font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
  .import-errors { background: var(--accent-2-dim); border: 1px solid rgba(255,92,0,0.3); border-radius: var(--radius-md); padding: var(--space-4); }
  .error-line { font-size: 0.75rem; color: var(--accent-2); margin-top: var(--space-1); }
  .import-preview { background: var(--bg-void); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); }
  .preview-list { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3); }
  .preview-row { display: flex; align-items: center; gap: var(--space-3); }
  .preview-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 0.75rem; color: var(--bg-void); flex-shrink: 0; }

  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .table th:nth-child(2), .table td:nth-child(2) { display: none; }
    .header-actions { width: 100%; justify-content: flex-end; }
  }
</style>
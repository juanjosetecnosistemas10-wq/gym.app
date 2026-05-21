<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from '$lib/supabaseClient';

  let members = $state<any[]>([]);
  let loading = $state(true);
  
  // Variables para controlar el formulario
  let showForm = $state(false);
  let newMember = $state({ name: '', email: '', phone: '', plan: 'Mensual' });
  let saving = $state(false);

  // Traer los miembros cuando carga la página
  onMount(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('members').select('*');
    if (data) members = data;
    loading = false;
  });

  // Función para guardar el nuevo miembro
  async function addMember() {
    if (!newMember.name || !newMember.email) return alert("Nombre y Email son obligatorios");
    
    saving = true;
    const supabase = createClient();
    
    // Insertar en Supabase
    const { data, error } = await supabase
      .from('members')
      .insert([newMember]);

    if (!error && data) {
      // Agregar el nuevo miembro a la lista local para que aparezca al instante sin recargar
      members.push(data[0]);
      // Limpiar el formulario y ocultarlo
      newMember = { name: '', email: '', phone: '', plan: 'Mensual' };
      showForm = false;
    } else {
      alert("Error al guardar: " + error.message);
    }
    saving = false;
  }
</script>

<div class="members-container">
  <div class="header">
    <h1 class="page-title">Miembros del Gym</h1>
    <button class="btn-add" onclick={() => showForm = !showForm}>
      {showForm ? '- Cerrar' : '+ Nuevo Miembro'}
    </button>
  </div>

  <!-- FORMULARIO SECCIONADO (Solo se ve si showForm es true) -->
  {#if showForm}
    <div class="form-card">
      <h2 class="form-title">Registrar Nuevo Miembro</h2>
      <div class="form-grid">
        <input type="text" placeholder="Nombre completo" bind:value={newMember.name} />
        <input type="email" placeholder="Correo electrónico" bind:value={newMember.email} />
        <input type="text" placeholder="Teléfono" bind:value={newMember.phone} />
        <select bind:value={newMember.plan}>
          <option value="Mensual">Mensual</option>
          <option value="Trimestral">Trimestral</option>
          <option value="Anual">Anual</option>
        </select>
      </div>
      <button class="btn-save" onclick={addMember} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar Miembro'}
      </button>
    </div>
  {/if}

  <!-- TABLA -->
  {#if loading}
    <p class="loading-text">Cargando miembros...</p>
  {:else if members.length === 0}
    <p class="empty-text">No hay miembros registrados aún.</p>
  {:else}
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Plan</th>
          </tr>
        </thead>
        <tbody>
          {#each members as member (member.id)}
            <tr>
              <td class="td-name">{member.name}</td>
              <td>{member.email}</td>
              <td>{member.phone}</td>
              <td><span class="badge">{member.plan}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .members-container { width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); }
  .page-title { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
  
  .btn-add {
    background-color: var(--accent-color); color: #0f0f0f; border: none;
    padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer;
    transition: transform 0.2s ease;
  }
  .btn-add:hover { transform: translateY(-2px); }

  /* ESTILOS DEL FORMULARIO */
  .form-card {
    background-color: var(--bg-secondary); border: 1px solid var(--border-color);
    border-radius: 12px; padding: var(--spacing-md); margin-bottom: var(--spacing-lg);
    border-left: 4px solid var(--accent-color);
  }
  .form-title { color: var(--text-primary); margin-bottom: var(--spacing-md); font-size: 1.2rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
  
  input, select {
    background-color: var(--bg-primary); border: 1px solid var(--border-color);
    color: var(--text-primary); padding: 0.8rem 1rem; border-radius: 8px; font-size: 0.95rem;
    outline: none; transition: border-color 0.2s;
  }
  input:focus, select:focus { border-color: var(--accent-color); }
  input::placeholder { color: var(--text-secondary); }

  .btn-save {
    background-color: transparent; border: 1px solid var(--accent-color); color: var(--accent-color);
    padding: 0.7rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  }
  .btn-save:hover { background-color: var(--accent-color); color: #0f0f0f; }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ESTILOS DE LA TABLA */
  .loading-text, .empty-text { color: var(--text-secondary); font-size: 1.1rem; }
  .table-wrapper { background-color: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; }
  .table { width: 100%; border-collapse: collapse; text-align: left; }
  .table thead { background-color: #222222; }
  .table th { padding: 1rem var(--spacing-md); color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
  .table td { padding: 1rem var(--spacing-md); color: var(--text-primary); border-top: 1px solid var(--border-color); font-size: 0.95rem; }
  .table tbody tr { transition: background-color 0.2s ease, border-left 0.2s ease; border-left: 3px solid transparent; }
  .table tbody tr:hover { background-color: #1f1f1f; border-left: 3px solid var(--accent-color); }
  .td-name { font-weight: 600; }
  .badge { background-color: rgba(204, 255, 0, 0.1); color: var(--accent-color); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
</style>
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar quién inició sesión
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = 'index.html'; // Si no hay sesión, al login
        return;
    }
    
    const currentUser = JSON.parse(currentUserStr);
    // Rol 1 = Sudo, Rol 2 = Admin
    const canEdit = currentUser.role_id === 1 || currentUser.role_id === 2; 

    const container = document.getElementById('profiles-container');
    let perfilesGlobales = []; // Para guardar en memoria y pasarlos al modal
    
    // 2. Función para cargar los perfiles
    async function loadProfiles() {
        try {
            const { data, error } = await supabaseClient
                .from('leadership_profiles')
                .select(`
                    *,
                    users ( full_name, username )
                `);

            if (error) throw error;
            perfilesGlobales = data;

            if (!data || data.length === 0) {
                container.innerHTML = '<p>No hay perfiles registrados.</p>';
                return;
            }

            container.innerHTML = data.map((profile, index) => `
                <div class="card" style="max-width: 100%; text-align: left; position: relative;">
                    ${canEdit ? `<button onclick="abrirModal(${index})" class="btn primary" style="position: absolute; right: 1.5rem; top: 1.5rem; width: auto; padding: 0.5rem 1rem; font-size: 0.8rem;">Editar Perfil</button>` : ''}
                    
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">
                        ${profile.users?.full_name || 'Usuario'} 
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div>
                            <strong>Métricas (0-100)</strong>
                            <ul style="list-style: none; padding-top: 0.5rem; font-size: 0.9rem;">
                                <li>Inf. Idealizada: <b>${profile.idealized_influence || 0}</b></li>
                                <li>Cons. Individualizada: <b>${profile.individualized_consideration || 0}</b></li>
                                <li>Mot. Inspiracional: <b>${profile.inspirational_motivation || 0}</b></li>
                                <li>Est. Intelectual: <b>${profile.intellectual_stimulation || 0}</b></li>
                            </ul>
                        </div>
                        <div>
                            <strong>Análisis</strong>
                            <p style="font-size: 0.85rem;"><b>Fortalezas:</b> ${profile.strengths || '-'}</p>
                            <p style="font-size: 0.85rem;"><b>Áreas Débiles:</b> ${profile.weak_areas || '-'}</p>
                            <p style="font-size: 0.85rem;"><b>Mejoras:</b> ${profile.improvements || '-'}</p>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error(err);
            container.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
        }
    }

    // 3. Exponer función para abrir modal globalmente
    window.abrirModal = (index) => {
        const p = perfilesGlobales[index];
        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-ii').value = p.idealized_influence || 0;
        document.getElementById('edit-ci').value = p.individualized_consideration || 0;
        document.getElementById('edit-mi').value = p.inspirational_motivation || 0;
        document.getElementById('edit-ei').value = p.intellectual_stimulation || 0;
        document.getElementById('edit-f').value = p.strengths || '';
        document.getElementById('edit-ad').value = p.weak_areas || '';
        document.getElementById('edit-m').value = p.improvements || '';
        
        document.getElementById('editModal').style.display = 'flex';
    };

    // 4. Guardar cambios en Supabase
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        
        const updates = {
            idealized_influence: parseInt(document.getElementById('edit-ii').value),
            individualized_consideration: parseInt(document.getElementById('edit-ci').value),
            inspirational_motivation: parseInt(document.getElementById('edit-mi').value),
            intellectual_stimulation: parseInt(document.getElementById('edit-ei').value),
            strengths: document.getElementById('edit-f').value,
            weak_areas: document.getElementById('edit-ad').value,
            improvements: document.getElementById('edit-m').value
        };

        try {
            const { error } = await supabaseClient
                .from('leadership_profiles')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            
            document.getElementById('editModal').style.display = 'none';
            loadProfiles(); // Recargar la lista para ver los cambios

        } catch (err) {
            alert('Error guardando: ' + err.message);
        }
    });

    // Cargar al inicio
    loadProfiles();
});

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validar que sea Sudo (Rol 1)
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = 'index.html';
        return;
    }
    
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser.role_id !== 1) {
        alert('Acceso Denegado. Solo el nivel Sudo puede ver esto.');
        window.location.href = 'dashboard.html';
        return;
    }

    const usersList = document.getElementById('users-list');
    const msgBox = document.getElementById('sudo-msg');

    // 2. Cargar lista de usuarios
    async function loadUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select(`id, full_name, username, qr_code, role_id, roles(name)`)
                .order('role_id', { ascending: true });

            if (error) throw error;

            usersList.innerHTML = data.map(u => `
                <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${u.full_name}</strong> <span style="color: #64748b; font-size: 0.85rem;">(@${u.username})</span><br>
                        <span style="font-size: 0.8rem; background: #e2e8f0; padding: 0.1rem 0.4rem; border-radius: 4px;">Rol: ${u.roles?.name || u.role_id}</span>
                        <span style="font-size: 0.8rem; margin-left: 0.5rem;">QR: ${u.qr_code}</span>
                    </div>
                    <button onclick="deleteUser('${u.id}')" class="btn outline" style="color: red; border-color: red; width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem;">Eliminar</button>
                </div>
            `).join('');
        } catch (error) {
            console.error(error);
            usersList.innerHTML = `<p style="color:red">Error cargando usuarios.</p>`;
        }
    }

    // 3. Crear nuevo usuario
    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        msgBox.className = "alert hidden";

        const newUser = {
            full_name: document.getElementById('new-fullname').value,
            username: document.getElementById('new-username').value.trim(),
            role_id: parseInt(document.getElementById('new-role').value),
            qr_code: document.getElementById('new-qr').value.trim()
        };

        try {
            const { error } = await supabaseClient
                .from('users')
                .insert([newUser]);

            if (error) throw error;

            msgBox.textContent = "¡Usuario creado exitosamente!";
            msgBox.className = "alert success";
            
            // Limpiar formulario y recargar lista
            document.getElementById('createUserForm').reset();
            loadUsers();

        } catch (error) {
            msgBox.textContent = "Error: " + error.message;
            msgBox.className = "alert error";
        }
    });

    // 4. Exponer función global para eliminar usuario
    window.deleteUser = async (id) => {
        if(!confirm("¿Estás seguro de eliminar este usuario?")) return;
        
        try {
            const { error } = await supabaseClient.from('users').delete().eq('id', id);
            if (error) throw error;
            loadUsers();
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    };

    loadUsers();
});


document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('profiles-container');
    
    try {
        // Obtenemos los perfiles cruzados con la tabla de usuarios para traer el nombre
        const { data, error } = await supabaseClient
            .from('leadership_profiles')
            .select(`
                *,
                users ( full_name, username )
            `);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p>No hay perfiles de liderazgo registrados aún.</p>';
            return;
        }

        // Renderizamos cada perfil en una "tarjeta"
        container.innerHTML = data.map(profile => `
            <div class="card" style="max-width: 100%; text-align: left;">
                <h3 style="color: var(--primary); margin-bottom: 1rem;">
                    ${profile.users?.full_name || 'Usuario Desconocido'} 
                    <span style="font-size: 0.8rem; color: var(--text-muted);">(@${profile.users?.username || 'N/A'})</span>
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem;">
                    <div>
                        <strong>Métricas Cuantitativas (Escala 1-100)</strong>
                        <ul style="list-style: none; padding-top: 0.5rem; color: var(--text-muted); line-height: 1.6;">
                            <li>Influencia Idealizada: <b>${profile.idealized_influence}</b></li>
                            <li>Consideración Individualizada: <b>${profile.individualized_consideration}</b></li>
                            <li>Motivación Inspiracional: <b>${profile.inspirational_motivation}</b></li>
                            <li>Estimulación Intelectual: <b>${profile.intellectual_stimulation}</b></li>
                        </ul>
                    </div>
                    <div>
                        <strong>Análisis Cualitativo</strong>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem;"><b>Fortalezas:</b> ${profile.strengths || 'Sin registro'}</p>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem;"><b>Áreas Débiles a Trabajar:</b> ${profile.weak_areas || 'Sin registro'}</p>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem;"><b>Mejoras:</b> ${profile.improvements || 'Sin registro'}</p>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error cargando perfiles:', err);
        container.innerHTML = `<div class="alert error">Error al cargar los perfiles: ${err.message}</div>`;
    }
});

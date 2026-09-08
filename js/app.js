// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cmlyjfxuybkglkafhyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHlqZnh1eWJrZ2xrYWZoeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDM2NjUsImV4cCI6MjEwNDMxOTY2NX0.o1z1TMYzJO5VRX5S0dNY2szIrxvntb5m-EyI7QIYOPY';

// CAMBIO AQUI: Renombramos a 'supabaseClient' para evitar conflictos
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// FUNCIÓN DE REGISTRO DE ASISTENCIA (QR)
// ==========================================
async function registerAttendance(qrCode) {
    try {
        const { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('id, full_name, total_points')
            .eq('qr_code', qrCode)
            .single();

        if (userError || !user) throw new Error('Usuario no encontrado.');

        const { data: attendance, error: attError } = await supabaseClient
            .from('attendance')
            .insert([{ user_id: user.id }])
            .select();

        if (attError) {
            if (attError.code === '23505') { 
                return { success: false, message: `El voluntario ${user.full_name} ya registró su asistencia hoy.` };
            }
            throw attError;
        }

        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ total_points: user.total_points + 1 })
            .eq('id', user.id);
            
        if(updateError) console.error("Error al actualizar puntos", updateError);

        return { success: true, message: `Asistencia registrada para ${user.full_name}. ¡+1 Punto!` };

    } catch (error) {
        console.error(error);
        return { success: false, message: error.message };
    }
}

// ==========================================
// LÓGICA DE LOGIN DIRECTO POR USUARIO
// ==========================================
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const usernameInput = document.getElementById('username').value.trim();
        
        try {
            // Usamos supabaseClient aquí también
            const { data: user, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('username', usernameInput)
                .single();

            if (error || !user) {
                alert('Usuario no encontrado. Revisa que esté bien escrito (Ej: Sudo)');
                return;
            }

            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';

        } catch (err) {
            console.error('Error en el login:', err);
            alert('Hubo un error al conectar con la base de datos.');
        }
    });
}

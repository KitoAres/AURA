// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cmlyjfxuybkglkafhyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHlqZnh1eWJrZ2xrYWZoeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDM2NjUsImV4cCI6MjEwNDMxOTY2NX0.o1z1TMYzJO5VRX5S0dNY2szIrxvntb5m-EyI7QIYOPY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// FUNCIÓN DE REGISTRO DE ASISTENCIA (QR)
// ==========================================
async function registerAttendance(qrCode) {
    try {
        // 1. Buscar usuario por su QR
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name, total_points')
            .eq('qr_code', qrCode)
            .single();

        if (userError || !user) throw new Error('Usuario no encontrado.');

        // 2. Intentar registrar asistencia (La regla UNIQUE de SQL validará 1 por día)
        const { data: attendance, error: attError } = await supabase
            .from('attendance')
            .insert([{ user_id: user.id }])
            .select();

        if (attError) {
            if (attError.code === '23505') { // 23505 = Unique violation en PostgreSQL
                return { success: false, message: `El voluntario ${user.full_name} ya registró su asistencia hoy.` };
            }
            throw attError;
        }

        // 3. Sumar 1 punto usando un RPC (Stored Procedure) o actualizando directo
        const { error: updateError } = await supabase
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
        e.preventDefault(); // Evita que la página recargue al darle al botón
        
        // Obtenemos el nombre de usuario escrito
        const usernameInput = document.getElementById('username').value.trim();
        
        try {
            // Buscamos al usuario en la base de datos de Supabase usando el campo "username"
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', usernameInput)
                .single();

            if (error || !user) {
                alert('Usuario no encontrado. Intenta con Sudo, Admin 1 o User 1');
                return;
            }

            // Si se encuentra, guardamos sus datos localmente para uso futuro
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Enviamos al usuario al Dashboard
            window.location.href = 'dashboard.html';

        } catch (err) {
            console.error('Error en el login:', err);
        }
    });
}

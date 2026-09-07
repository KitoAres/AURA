const SUPABASE_URL = 'https://cmlyjfxuybkglkafhyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHlqZnh1eWJrZ2xrYWZoeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDM2NjUsImV4cCI6MjEwNDMxOTY2NX0.o1z1TMYzJO5VRX5S0dNY2szIrxvntb5m-EyI7QIYOPY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let html5QrcodeScanner = null;
let radarChart = null;
let editingUserId = null; 

// --- LOGIN CORREGIDO A PRUEBA DE FALLOS ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const err = document.getElementById('login-error');
  const btn = e.target.querySelector('button');
  
  if (!id || !pass) return;
  btn.textContent = "Conectando..."; 
  
  try {
    // Usamos .limit(1) en lugar de .single() para evitar que la app se cuelgue si falla
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .eq('pass', pass)
      .limit(1);

    btn.textContent = "Iniciar Sesión";

    if (error) {
      console.error("Error de Supabase:", error);
      err.innerText = "Error en la base de datos";
      err.style.display = 'block';
      setTimeout(() => err.style.display = 'none', 3000);
      return;
    }

    if (data && data.length > 0) {
      currentUser = data[0];
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('dashboard-view').style.display = 'flex';
      err.style.display = 'none';
      setupDashboard();
    } else {
      err.innerText = "Credenciales incorrectas";
      err.style.display = 'block';
      setTimeout(() => err.style.display = 'none', 3000);
    }
  } catch (errCatch) {
    btn.textContent = "Iniciar Sesión";
    console.error("Fallo crítico:", errCatch);
    err.innerText = "Error de conexión";
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 3000);
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('login-form').reset();
  if(html5QrcodeScanner) html5QrcodeScanner.clear();
});

function setupDashboard() {
  document.getElementById('nav-name').innerText = currentUser.name;
  document.getElementById('nav-role').innerText = currentUser.role.toUpperCase();
  const navLinks = document.getElementById('nav-links');
  
  if (currentUser.role === 'sudo' || currentUser.role === 'admin') {
    let menuHTML = '';
    if(currentUser.role === 'sudo') {
      menuHTML += `<li onclick="loadView('sudo-users')">👥 Gestionar Todo</li>`;
    }
    menuHTML += `
      <li onclick="loadView('admin-scan')">📷 Escanear QR</li>
      <li onclick="loadView('admin-test')">📊 Evaluar MLQ</li>
      <li onclick="loadView('admin-feedback')">📝 Feedback</li>
      <li onclick="loadView('ranking')">🏆 Ranking</li>`;
    navLinks.innerHTML = menuHTML;
    loadView(currentUser.role === 'sudo' ? 'sudo-users' : 'admin-scan');
  } else {
    navLinks.innerHTML = `<li onclick="loadView('user-profile')">🧠 Mi Perfil</li><li onclick="loadView('ranking')">🏆 Ranking</li>`;
    loadView('user-profile');
  }
}

async function loadView(view) {
  const main = document.getElementById('main-content');
  if(html5QrcodeScanner) { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }

  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.remove('active');
    if(li.getAttribute('onclick') && li.getAttribute('onclick').includes(view)) li.classList.add('active');
  });

  main.innerHTML = `<h2 style="color:var(--primary); text-align:center;">Cargando datos... ⏳</h2>`;

  if (view === 'sudo-users') {
    const { data: users } = await supabase.from('usuarios').select('*').neq('role', 'sudo').order('id');
    let trs = (users || []).map(u => `
      <tr>
        <td data-label="ID/Usuario">${u.id}</td>
        <td data-label="Nombre">${u.name}</td>
        <td data-label="Rol">${u.role}</td>
        <td data-label="Acciones">
          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button onclick="openEditModal('${u.id}', '${u.name}', '${u.pass}', '${u.role}')" class="btn-outline" style="border-color:var(--gold); color:var(--gold)">Editar</button>
            <button onclick="deleteUser('${u.id}')" class="btn-outline">Borrar</button>
          </div>
        </td>
      </tr>`).join('');
    
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Lista de Usuarios</h2>
      <div class="glass-card" style="margin-bottom:2rem;">
        <h3 style="margin-bottom:1.5rem; color:var(--primary);">Crear Usuario Nuevo</h3>
        <div class="input-group"><label>1. ID (Será su QR)</label><input type="text" id="new-id" placeholder="Ej. 31"></div>
        <div class="input-group"><label>2. Nombre</label><input type="text" id="new-name" placeholder="Nombre completo"></div>
        <div class="input-group"><label>3. Rol</label><select id="new-role"><option value="user">Voluntario</option><option value="admin">Admin</option></select></div>
        <button onclick="addUser()" class="btn-glow" style="margin-top:1rem;">Guardar Usuario</button>
      </div>
      <table><tr><th>ID</th><th>Nombre</th><th>Rol</th><th style="text-align:right;">Acciones</th></tr>${trs}</table>`;
  }

  if (view === 'admin-scan') {
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Asistencia y Puntos</h2>
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="glass-card">
          <h3 style="margin-bottom:1rem; text-align:center;">Cámara Escáner</h3>
          <div id="reader"></div>
          <button onclick="startScanner()" class="btn-glow" style="margin-top:1rem;">📷 Activar Cámara</button>
        </div>
        <div class="glass-card">
          <h3>Punto Manual</h3>
          <input type="text" id="manual-id" placeholder="ID del Voluntario (Ej. 5)" style="margin-bottom:1rem;">
          <button onclick="addStar()" class="btn-glow">⭐ Dar 1 Estrella</button>
        </div>
      </div>`;
  }

  if (view === 'admin-test') {
    const { data: users } = await supabase.from('usuarios').select('id, name').eq('role', 'user').order('id');
    let options = (users || []).map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Evaluación MLQ</h2>
      <div class="glass-card">
        <select id="test-user" style="margin-bottom:1.5rem;">${options}</select>
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div class="input-group"><label>1. Inf. Idealizada (Atributos) [0-10]</label><input type="number" id="t-iia" max="10"></div>
          <div class="input-group"><label>2. Inf. Idealizada (Conductas) [0-10]</label><input type="number" id="t-iic" max="10"></div>
          <div class="input-group"><label>3. Motivación Inspiracional [0-10]</label><input type="number" id="t-mi" max="10"></div>
          <div class="input-group"><label>4. Estimulación Intelectual [0-10]</label><input type="number" id="t-ei" max="10"></div>
          <div class="input-group"><label>5. Consideración Individual [0-10]</label><input type="number" id="t-ci" max="10"></div>
        </div>
        <button onclick="saveTest()" class="btn-glow" style="margin-top:1rem;">Guardar Resultados</button>
      </div>`;
  }

  if (view === 'admin-feedback') {
    const { data: users } = await supabase.from('usuarios').select('id, name').eq('role', 'user').order('id');
    let options = (users || []).map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Feedback Conductual</h2>
      <div class="glass-card">
        <select id="feed-user" style="margin-bottom:1.5rem;">${options}</select>
        <textarea id="feed-text" rows="6" placeholder="Escribe tu observación para el voluntario..."></textarea>
        <button onclick="saveFeedback()" class="btn-glow" style="margin-top:1rem;">Enviar Feedback</button>
      </div>`;
  }

  if (view === 'user-profile') {
    const { data: updatedUser } = await supabase.from('usuarios').select('*').eq('id', currentUser.id).single();
    const { count } = await supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('usuario_id', currentUser.id);
    if(updatedUser) currentUser = updatedUser;

    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Tu Progreso</h2>
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="glass-card" style="text-align:center;">
          <h1 style="font-size:4.5rem; color:var(--gold); margin:0;">${currentUser.stars || 0} ⭐</h1>
          <p style="color:var(--text-muted); margin-bottom:1.5rem;">Asistencias confirmadas: ${count || 0}</p>
          <div class="chart-container"><canvas id="radarChart"></canvas></div>
          <hr style="border-color:var(--border); margin: 1.5rem 0;">
          <h3 style="color:var(--primary)">Comentarios del Admin</h3>
          <p style="font-style:italic; margin-top:1rem;">"${currentUser.feedback || 'Aún no hay feedback.'}"</p>
        </div>
      </div>`;
    renderChart(currentUser);
  }

  if (view === 'ranking') {
    const { data: users } = await supabase.from('usuarios').select('id, name, stars').eq('role', 'user').order('stars', { ascending: false });
    let trs = (users || []).map((u, i) => `
      <tr>
        <td data-label="Posición" style="font-size:1.5rem; font-weight:bold; color:var(--primary);">#${i+1}</td>
        <td data-label="Voluntario">${u.name}</td>
        <td data-label="Estrellas" style="color:var(--gold); font-size:1.2rem; font-weight:bold;">${u.stars} ⭐</td>
      </tr>`).join('');
    main.innerHTML = `<h2 style="color:var(--primary); margin-bottom:1rem;">Ranking Global</h2><table>${trs}</table>`;
  }
}

async function addUser() {
  const id = document.getElementById('new-id').value.trim();
  const name = document.getElementById('new-name').value.trim() || `Voluntario ${id}`;
  const role = document.getElementById('new-role').value;
  if(!id) return showToast("❌ ID vacío");

  const { error } = await supabase.from('usuarios').insert([{ id, name, pass: '123', role }]);
  if (error) showToast("❌ Error: El ID ya existe");
  else { showToast("✅ Usuario creado"); loadView('sudo-users'); }
}

async function deleteUser(id) {
  if(confirm(`¿Borrar definitivamente al usuario ${id}?`)) {
    await supabase.from('usuarios').delete().eq('id', id);
    showToast("🗑️ Usuario eliminado");
    loadView('sudo-users');
  }
}

function openEditModal(id, name, pass, role) {
  editingUserId = id;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-name').value = name;
  document.getElementById('edit-pass').value = pass;
  document.getElementById('edit-role').value = role;
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingUserId = null;
}

async function saveUserEdit() {
  if (!editingUserId) return;
  const name = document.getElementById('edit-name').value.trim();
  const pass = document.getElementById('edit-pass').value.trim();
  const role = document.getElementById('edit-role').value;

  const { error } = await supabase.from('usuarios').update({ name, pass, role }).eq('id', editingUserId);
  if (error) showToast("❌ Error al actualizar");
  else { showToast("✅ Usuario modificado"); closeEditModal(); loadView('sudo-users'); }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}

function startScanner() {
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
    async (txt) => {
      let id = txt.trim();
      html5QrcodeScanner.pause(true); 
      const { error: asisErr } = await supabase.from('asistencias').insert([{ usuario_id: id }]);

      if (asisErr) {
        showToast(`⚠️ Este voluntario ya marcó asistencia hoy.`);
      } else {
        const { data: u } = await supabase.from('usuarios').select('stars, name').eq('id', id).single();
        if(u) {
          await supabase.from('usuarios').update({ stars: u.stars + 1 }).eq('id', id);
          showToast(`✅ +1 ⭐ para ${u.name}`);
        } else {
          showToast(`❌ ID no existe`);
        }
      }
      setTimeout(() => html5QrcodeScanner.resume(), 2500); 
    }
  );
}

async function addStar() {
  let id = document.getElementById('manual-id').value.trim();
  const { data: u } = await supabase.from('usuarios').select('stars, name').eq('id', id).single();
  if (u) {
    await supabase.from('usuarios').update({ stars: u.stars + 1 }).eq('id', id);
    showToast(`⭐ Estrella manual a ${u.name}`);
  } else { showToast("❌ Voluntario no encontrado"); }
}

async function saveTest() {
  let id = document.getElementById('test-user').value;
  let updateData = {
    test_iia: Number(document.getElementById('t-iia').value) || 0,
    test_iic: Number(document.getElementById('t-iic').value) || 0,
    test_mi:  Number(document.getElementById('t-mi').value) || 0,
    test_ei:  Number(document.getElementById('t-ei').value) || 0,
    test_ci:  Number(document.getElementById('t-ci').value) || 0
  };
  await supabase.from('usuarios').update(updateData).eq('id', id);
  showToast("✅ Test Guardado");
}

async function saveFeedback() {
  let id = document.getElementById('feed-user').value;
  let feedback = document.getElementById('feed-text').value;
  await supabase.from('usuarios').update({ feedback }).eq('id', id);
  showToast("✅ Feedback Guardado");
}

function renderChart(t) {
  if (radarChart) radarChart.destroy();
  const ctx = document.getElementById('radarChart').getContext('2d');
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Atributos', 'Conductas', 'Motivación', 'Estimulación', 'Consideración'],
      datasets: [{ label: 'Nivel', data: [t.test_iia || 0, t.test_iic || 0, t.test_mi || 0, t.test_ei || 0, t.test_ci || 0], backgroundColor: 'rgba(56,189,248,0.4)', borderColor: '#38bdf8', pointBackgroundColor: '#fbbf24', borderWidth: 2 }]
    },
    options: { scales: { r: { angleLines: {color: 'rgba(255,255,255,0.1)'}, grid: {color: 'rgba(255,255,255,0.1)'}, pointLabels: {color: '#fff', font: {size: 10}}, suggestedMin: 0, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
  });
}

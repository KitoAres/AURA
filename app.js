// --- 1. GENERADOR DE BASE DE DATOS LOCAL ---
function generateDefaultDB() {
  const db = {
    "sudo": { id: "sudo", pass: "sudo123", role: "sudo", name: "Super Admin" },
    "admin1": { id: "admin1", pass: "123", role: "admin", name: "Instructor Principal" }
  };
  // Genera 30 cadetes (Del 1 al 30)
  for (let i = 1; i <= 30; i++) {
    let idStr = i.toString();
    db[idStr] = { 
      id: idStr, pass: "123", role: "user", name: "Cadete " + idStr, 
      stars: 0, asistencia: [], 
      test: { iia: 0, iic: 0, mi: 0, ei: 0, ci: 0 }, feedback: "Aún no hay feedback." 
    };
  }
  return db;
}

let db = JSON.parse(localStorage.getItem('gacip_db_v3')) || generateDefaultDB();
let currentUser = null;
let html5QrcodeScanner = null;
let radarChart = null;

function saveDB() { localStorage.setItem('gacip_db_v3', JSON.stringify(db)); }

// --- 2. SISTEMA DE LOGIN DIRECTO ---
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const err = document.getElementById('login-error');
  
  if (!id || !pass) return;

  if (db[id] && db[id].pass === pass) {
    currentUser = db[id];
    
    // TRANSICIÓN SEGURA (Forzando estilos)
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'flex';
    err.style.display = 'none';
    
    setupDashboard();
  } else {
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

// --- 3. MENÚS ---
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
  } 
  else {
    navLinks.innerHTML = `
      <li onclick="loadView('user-profile')">🧠 Mi Perfil</li>
      <li onclick="loadView('ranking')">🏆 Ranking</li>`;
    loadView('user-profile');
  }
}

// --- 4. RENDERIZADO DE VISTAS ---
function loadView(view) {
  const main = document.getElementById('main-content');
  if(html5QrcodeScanner) { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }

  // Pintar botón activo
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.remove('active');
    if(li.getAttribute('onclick') && li.getAttribute('onclick').includes(view)) {
      li.classList.add('active');
    }
  });

  if (view === 'sudo-users') {
    let trs = Object.values(db).filter(u => u.role !== 'sudo').map(u => `
      <tr>
        <td data-label="ID/Usuario">${u.id}</td>
        <td data-label="Nombre">${u.name}</td>
        <td data-label="Rol">${u.role}</td>
        <td data-label="Acciones">
          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button onclick="openEditModal('${u.id}')" class="btn-outline" style="border-color:var(--gold); color:var(--gold)">Editar</button>
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
        <div class="input-group"><label>3. Rol</label><select id="new-role"><option value="user">Cadete (Usuario)</option><option value="admin">Instructor (Admin)</option></select></div>
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
          <input type="text" id="manual-id" placeholder="ID del Cadete (Ej. 5)" style="margin-bottom:1rem;">
          <button onclick="addStar()" class="btn-glow">⭐ Dar 1 Estrella</button>
        </div>
      </div>`;
  }

  if (view === 'admin-test') {
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
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
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Feedback Conductual</h2>
      <div class="glass-card">
        <select id="feed-user" style="margin-bottom:1.5rem;">${options}</select>
        <textarea id="feed-text" rows="6" placeholder="Escribe tu observación para el cadete..."></textarea>
        <button onclick="saveFeedback()" class="btn-glow" style="margin-top:1rem;">Enviar Feedback</button>
      </div>`;
  }

  if (view === 'user-profile') {
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Tu Progreso</h2>
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="glass-card" style="text-align:center;">
          <h1 style="font-size:4.5rem; color:var(--gold); margin:0;">${currentUser.stars} ⭐</h1>
          <p style="color:var(--text-muted); margin-bottom:1.5rem;">Asistencias: ${currentUser.asistencia.length}</p>
          <div class="chart-container"><canvas id="radarChart"></canvas></div>
          <hr style="border-color:var(--border); margin: 1.5rem 0;">
          <h3 style="color:var(--primary)">Comentarios del Instructor</h3>
          <p style="font-style:italic; margin-top:1rem;">"${currentUser.feedback}"</p>
        </div>
      </div>`;
    renderChart(currentUser.test);
  }

  if (view === 'ranking') {
    let users = Object.values(db).filter(u => u.role === 'user').sort((a,b) => b.stars - a.stars);
    let trs = users.map((u, i) => `
      <tr>
        <td data-label="Posición" style="font-size:1.5rem; font-weight:bold; color:var(--primary);">#${i+1}</td>
        <td data-label="Cadete">${u.name} (ID: ${u.id})</td>
        <td data-label="Estrellas" style="color:var(--gold); font-size:1.2rem; font-weight:bold;">${u.stars} ⭐</td>
      </tr>`).join('');
    main.innerHTML = `<h2 style="color:var(--primary); margin-bottom:1rem;">Ranking Global</h2><table>${trs}</table>`;
  }
}

// --- 5. LOGICA DEL MODAL DE EDICIÓN ---
function openEditModal(id) {
  const u = db[id];
  document.getElementById('edit-id').value = u.id;
  document.getElementById('edit-name').value = u.name;
  document.getElementById('edit-pass').value = u.pass;
  document.getElementById('edit-role').value = u.role;
  // Ocultar CSS bugs, encender bloque 100% manual
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

function saveUserEdit() {
  const id = document.getElementById('edit-id').value;
  db[id].name = document.getElementById('edit-name').value.trim();
  db[id].pass = document.getElementById('edit-pass').value.trim();
  db[id].role = document.getElementById('edit-role').value;
  saveDB(); 
  closeEditModal(); 
  loadView('sudo-users'); 
  showToast("Usuario guardado ✅");
}

function deleteUser(id) {
  if(confirm("¿Borrar definitivamente al usuario " + id + "?")) {
    delete db[id]; saveDB(); loadView('sudo-users'); showToast("Usuario eliminado 🗑️");
  }
}

function addUser() {
  const id = document.getElementById('new-id').value.trim();
  if(!id || db[id]) { showToast("ID vacío o ya existe ❌"); return; }
  const role = document.getElementById('new-role').value;
  const name = document.getElementById('new-name').value.trim() || `Cadete ${id}`;
  
  db[id] = { id, pass: "123", role, name, stars: 0, asistencia: [], test: {iia:0, iic:0, mi:0, ei:0, ci:0}, feedback: "" };
  saveDB(); showToast("Nuevo cadete creado ✅"); loadView('sudo-users');
}

// --- 6. LOGICA ESCANEO / PUNTOS / TEST ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}

function startScanner() {
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
    (txt) => {
      let id = txt.trim();
      if(db[id] && db[id].role === 'user') {
        const hoy = new Date().toLocaleDateString();
        if(!db[id].asistencia.includes(hoy)) {
          db[id].asistencia.push(hoy); db[id].stars += 1; saveDB();
          showToast(`✅ +1 ⭐ para ${db[id].name}`);
        } else { showToast(`⚠️ ${db[id].name} ya fue marcado hoy.`); }
      } else { showToast("❌ QR inválido."); }
      html5QrcodeScanner.stop();
    }
  );
}

function addStar() {
  let id = document.getElementById('manual-id').value.trim();
  if(db[id] && db[id].role === 'user') {
    db[id].stars += 1; saveDB(); showToast(`⭐ Estrella manual a ${db[id].name}`);
  } else { showToast("❌ Cadete no encontrado."); }
}

function saveTest() {
  let id = document.getElementById('test-user').value;
  db[id].test = {
    iia: Number(document.getElementById('t-iia').value) || 0,
    iic: Number(document.getElementById('t-iic').value) || 0,
    mi:  Number(document.getElementById('t-mi').value) || 0,
    ei:  Number(document.getElementById('t-ei').value) || 0,
    ci:  Number(document.getElementById('t-ci').value) || 0
  };
  saveDB(); showToast("Test Guardado ✅");
}

function saveFeedback() {
  let id = document.getElementById('feed-user').value;
  db[id].feedback = document.getElementById('feed-text').value;
  saveDB(); showToast("Feedback Guardado ✅");
}

function renderChart(t) {
  if (radarChart) radarChart.destroy();
  const ctx = document.getElementById('radarChart').getContext('2d');
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Atributos', 'Conductas', 'Motivación', 'Estimulación', 'Consideración'],
      datasets: [{ label: 'Nivel', data: [t.iia, t.iic, t.mi, t.ei, t.ci], backgroundColor: 'rgba(56,189,248,0.4)', borderColor: '#38bdf8', pointBackgroundColor: '#fbbf24', borderWidth: 2 }]
    },
    options: { scales: { r: { angleLines: {color: 'rgba(255,255,255,0.1)'}, grid: {color: 'rgba(255,255,255,0.1)'}, pointLabels: {color: '#fff', font: {size: 10}}, suggestedMin: 0, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
  });
}

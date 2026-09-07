// --- 1. GENERADOR DE BASE DE DATOS LOCAL ---
function generateDefaultDB() {
  const db = {
    "sudo": { id: "sudo", pass: "sudo123", role: "sudo", name: "Super Admin" },
    "admin1": { id: "admin1", pass: "123", role: "admin", name: "Instructor GACIP" }
  };
  
  // Genera automáticamente cadetes del 1 al 30
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

let db = JSON.parse(localStorage.getItem('gacip_db_v2')) || generateDefaultDB();
let currentUser = null;
let html5QrcodeScanner = null;
let radarChart = null;

function saveDB() { localStorage.setItem('gacip_db_v2', JSON.stringify(db)); }

// --- 2. SISTEMA DE LOGIN ---
// --- 2. SISTEMA DE LOGIN ---
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  
  // Si los campos están vacíos por un bug del navegador, cortar la ejecución aquí
  if (!id || !pass) return; 

  if (db[id] && db[id].pass === pass) {
    currentUser = db[id];
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.add('active');
    err.style.display = 'none'; // Asegurar que el error se oculte
    setupDashboard();
  } else {
    err.style.display = 'block'; // Mostrar el error directamente
    setTimeout(() => err.style.display = 'none', 3000); // Ocultarlo a los 3 segundos
  }
});

// --- 3. MENÚS SEGÚN ROL ---
function setupDashboard() {
  document.getElementById('nav-name').innerText = currentUser.name;
  document.getElementById('nav-role').innerText = currentUser.role.toUpperCase();
  const navLinks = document.getElementById('nav-links');
  
  if (currentUser.role === 'sudo') {
    navLinks.innerHTML = `<li class="active" onclick="loadView('sudo-users')">👥 Gestionar Usuarios</li>`;
    loadView('sudo-users');
  } else if (currentUser.role === 'admin') {
    navLinks.innerHTML = `
      <li onclick="loadView('admin-scan')">📷 Escanear QR</li>
      <li onclick="loadView('admin-test')">📊 Evaluar Test</li>
      <li onclick="loadView('admin-feedback')">📝 Feedback</li>
      <li onclick="loadView('ranking')">🏆 Ranking</li>`;
    loadView('admin-scan');
  } else if (currentUser.role === 'user') {
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

  // Resaltar menú activo
  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  event && event.currentTarget && event.currentTarget.classList.add('active');

  if (view === 'sudo-users') {
    let trs = Object.values(db).filter(u => u.role !== 'sudo').map(u => `
      <tr>
        <td data-label="ID">${u.id}</td>
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
      <h2 style="color:var(--primary); margin-bottom:1rem;">Control (SUDO)</h2>
      <div class="glass-card" style="margin-bottom:1rem;">
        <h3>Añadir Nuevo</h3><br>
        <div class="grid-2">
          <input type="text" id="new-id" placeholder="ID Nuevo (Ej. 31)">
          <select id="new-role"><option value="user">Cadete (Usuario)</option><option value="admin">Instructor (Admin)</option></select>
          <input type="text" id="new-name" placeholder="Nombre (Opcional)">
          <button onclick="addUser()" class="btn-glow">Crear Usuario</button>
        </div>
      </div>
      <table><tr><th>ID</th><th>Nombre</th><th>Rol</th><th style="text-align:right;">Acciones</th></tr>${trs}</table>`;
  }

  if (view === 'admin-scan') {
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Asistencia y Estrellas</h2>
      <div class="grid-2">
        <div class="glass-card">
          <h3 style="margin-bottom:1rem; text-align:center;">Escanear QR</h3>
          <div id="reader"></div>
          <button onclick="startScanner()" class="btn-glow" style="margin-top:1rem;">📷 Activar Cámara</button>
        </div>
        <div class="glass-card">
          <h3>Asignar Estrella Manual</h3>
          <p style="font-size:0.8rem; margin-bottom:1rem; color:var(--text-muted)">Por participación en clase.</p>
          <input type="text" id="manual-id" placeholder="ID del Cadete (Ej. 1, 15)"><br><br>
          <button onclick="addStar()" class="btn-glow">⭐ Dar 1 Estrella</button>
        </div>
      </div>`;
  }

  if (view === 'admin-test') {
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Test Liderazgo (MLQ)</h2>
      <div class="glass-card">
        <select id="test-user" style="margin-bottom:1rem;">${options}</select>
        <div class="grid-2">
          <div class="input-group"><label>1. Inf. Idealizada (Atributos) [0-10]</label><input type="number" id="t-iia" max="10"></div>
          <div class="input-group"><label>2. Inf. Idealizada (Conductas) [0-10]</label><input type="number" id="t-iic" max="10"></div>
          <div class="input-group"><label>3. Motivación Inspiracional [0-10]</label><input type="number" id="t-mi" max="10"></div>
          <div class="input-group"><label>4. Estimulación Intelectual [0-10]</label><input type="number" id="t-ei" max="10"></div>
          <div class="input-group"><label>5. Consideración Individual [0-10]</label><input type="number" id="t-ci" max="10"></div>
        </div>
        <button onclick="saveTest()" class="btn-glow">Guardar Resultados</button>
      </div>`;
  }

  if (view === 'admin-feedback') {
    let options = Object.values(db).filter(u => u.role === 'user').map(u => `<option value="${u.id}">${u.id} - ${u.name}</option>`).join('');
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Feedback Conductual</h2>
      <div class="glass-card">
        <select id="feed-user" style="margin-bottom:1rem;">${options}</select>
        <textarea id="feed-text" rows="5" placeholder="Áreas de mejora para el cadete..."></textarea><br><br>
        <button onclick="saveFeedback()" class="btn-glow">Guardar Feedback</button>
      </div>`;
  }

  if (view === 'user-profile') {
    main.innerHTML = `
      <h2 style="color:var(--primary); margin-bottom:1rem;">Análisis de Perfil</h2>
      <div class="grid-2">
        <div class="chart-container"><canvas id="radarChart"></canvas></div>
        <div class="glass-card" style="text-align:center;">
          <h3 style="color:var(--text-muted)">Estrellas Acumuladas</h3>
          <h1 style="font-size:4rem; color:var(--gold); margin:1rem 0;">${currentUser.stars} ⭐</h1>
          <p>Asistencias: ${currentUser.asistencia.length}</p>
          <hr style="border-color:var(--border); margin: 1.5rem 0;">
          <h3 style="color:var(--primary)">Feedback del Instructor</h3>
          <p style="font-style:italic; margin-top:1rem; font-size:0.9rem;">"${currentUser.feedback}"</p>
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
    main.innerHTML = `<h2 style="color:var(--primary); margin-bottom:1rem;">Ranking General</h2><table>${trs}</table>`;
  }
}

// --- 5. LOGICA DE SUDO (EDITAR / BORRAR) ---
function openEditModal(id) {
  const u = db[id];
  document.getElementById('edit-id').value = u.id;
  document.getElementById('edit-name').value = u.name;
  document.getElementById('edit-pass').value = u.pass;
  document.getElementById('edit-role').value = u.role;
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

function saveUserEdit() {
  const id = document.getElementById('edit-id').value;
  db[id].name = document.getElementById('edit-name').value;
  db[id].pass = document.getElementById('edit-pass').value;
  db[id].role = document.getElementById('edit-role').value;
  saveDB(); closeEditModal(); loadView('sudo-users'); showToast("Usuario modificado ✅");
}

function deleteUser(id) {
  if(confirm("¿Seguro que deseas borrar al usuario " + id + "?")) {
    delete db[id]; saveDB(); loadView('sudo-users'); showToast("Usuario eliminado");
  }
}

function addUser() {
  const id = document.getElementById('new-id').value.trim();
  if(!id || db[id]) { showToast("ID inválido o ya existe."); return; }
  const role = document.getElementById('new-role').value;
  const name = document.getElementById('new-name').value || `Cadete ${id}`;
  db[id] = { id, pass: "123", role, name, stars: 0, asistencia: [], test: {iia:0, iic:0, mi:0, ei:0, ci:0}, feedback: "" };
  saveDB(); showToast("Usuario añadido ✅"); loadView('sudo-users');
}

// --- 6. LOGICA DE ESCANEO Y PUNTOS ---
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
          showToast(`✅ Asistencia y 1⭐ para ${db[id].name}`);
        } else { showToast(`⚠️ ${db[id].name} ya registró asistencia hoy.`); }
      } else { showToast("❌ QR no reconocido."); }
      html5QrcodeScanner.stop();
    }
  );
}

function addStar() {
  let id = document.getElementById('manual-id').value.trim();
  if(db[id] && db[id].role === 'user') {
    db[id].stars += 1; saveDB(); showToast(`⭐ Estrella otorgada a ${db[id].name}`);
  } else { showToast("❌ ID no encontrado."); }
}

// --- 7. LOGICA DE TESTS Y GRÁFICAS ---
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

function renderChart(testScores) {
  if (radarChart) radarChart.destroy();
  const ctx = document.getElementById('radarChart').getContext('2d');
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Atributos', 'Conductas', 'Motivación', 'Estimulación', 'Consideración'],
      datasets: [{
        label: 'Nivel', data: [testScores.iia, testScores.iic, testScores.mi, testScores.ei, testScores.ci],
        backgroundColor: 'rgba(56,189,248,0.4)', borderColor: '#38bdf8', pointBackgroundColor: '#fbbf24', borderWidth: 2
      }]
    },
    options: {
      scales: { r: { angleLines: {color: 'rgba(255,255,255,0.1)'}, grid: {color: 'rgba(255,255,255,0.1)'}, pointLabels: {color: '#fff', font: {size: 10}}, suggestedMin: 0, suggestedMax: 10 } },
      plugins: { legend: { display: false } }
    }
  });
}

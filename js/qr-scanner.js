// ==========================================
// LÓGICA DEL ESCÁNER QR
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const html5QrCode = new Html5Qrcode("reader");
    let isScanning = false;

    const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
        if(isScanning) return; // Evitar múltiples llamadas
        isScanning = true;
        
        // Pausar escáner momentáneamente
        html5QrCode.pause();

        const resultDiv = document.getElementById("scan-result");
        resultDiv.className = "alert"; // Reset
        resultDiv.textContent = "Procesando...";

        // Llamar a Supabase en app.js
        const result = await registerAttendance(decodedText);

        if (result.success) {
            resultDiv.classList.add("success");
            resultDiv.textContent = result.message;
        } else {
            resultDiv.classList.add("error");
            resultDiv.textContent = result.message;
        }

        // Reanudar después de 3 segundos
        setTimeout(() => {
            resultDiv.className = "alert hidden";
            isScanning = false;
            html5QrCode.resume();
        }, 3000);
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Iniciar cámara trasera por defecto
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
        .catch(err => {
            console.error("Error iniciando cámara", err);
            document.getElementById("reader").innerHTML = "<p>Error al acceder a la cámara. Asegúrate de dar permisos.</p>";
        });
});

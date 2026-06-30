document.addEventListener("DOMContentLoaded", () => {
    const intervalCekFirebase = setInterval(() => {
        if (window.db && window.firestoreOps) {
            clearInterval(intervalCekFirebase);
            initAplikasi();
        }
    }, 100);
});

function initAplikasi() {
    const db = window.db;
    const ops = window.firestoreOps;

    // Elemen Pelapor (Orang A)
    const formLaporan = document.getElementById("formLaporan");
    const previewKontainer = document.getElementById("previewKontainer");
    const btnKirim = document.getElementById("btnKirim");

    // Elemen Penerima (Orang B)
    const daftarLaporan = document.getElementById("daftarLaporan");

    let fotoBase64 = "";

    // LOGIKA KHUSUS HALAMAN PELAPOR (Orang A)
    if (formLaporan) {
        // Otomatis minta akses lokasi saat halaman dimuat
        mintaAksesLokasi();

        function mintaAksesLokasi() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        document.getElementById("lat").value = position.coords.latitude;
                        document.getElementById("lng").value = position.coords.longitude;
                        console.log("Lokasi berhasil dikunci:", position.coords.latitude, position.coords.longitude);
                    },
                    (error) => {
                        console.error("Gagal mendapatkan lokasi GPS:", error.message);
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                console.log("Browser tidak mendukung Geolocation.");
            }
        }

        const btnKamera = document.getElementById("btnKamera");
        const btnGaleri = document.getElementById("btnGaleri");
        const fotoKamera = document.getElementById("fotoKamera");
        const fotoGaleri = document.getElementById("fotoGaleri");

        if (btnKamera && btnGaleri) {
            btnKamera.addEventListener("click", () => fotoKamera.click());
            btnGaleri.addEventListener("click", () => fotoGaleri.click());
        }

        // FUNGSI KOMPRESI GAMBAR OTOMATIS (< 1MB)
        function prosesDanKompresGambar(inputElemen) {
            const file = inputElemen.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = function() {
                        // Setup Canvas untuk resize
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Batasi resolusi maksimal lebar/tinggi ke 1000 pixel agar ringan
                        const MAX_WIDTH = 1000;
                        const MAX_HEIGHT = 1000;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;

                        // Gambar ulang foto ke dalam canvas dengan resolusi baru
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Konversi ke Base64 dengan format JPEG dan kualitas 0.7 (70%)
                        // Ini akan memotong ukuran file secara drastis tanpa merusak detail penting
                        fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

                        // Tampilkan hasil kompresi di preview
                        previewKontainer.innerHTML = `<img src="${fotoBase64}" alt="Preview" style="max-width:100%; border-radius:8px;">`;
                        console.log("Gambar berhasil dikompresi otomatis.");
                    };
                };
                reader.readAsDataURL(file);
            }
        }

        if (fotoKamera && fotoGaleri) {
            fotoKamera.addEventListener("change", function() {
                prosesDanKompresGambar(this);
                fotoGaleri.value = ""; 
            });

            fotoGaleri.addEventListener("change", function() {
                prosesDanKompresGambar(this);
                fotoKamera.value = ""; 
            });
        }

        formLaporan.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            if (!fotoBase64) {
                alert("Silakan ambil foto lewat kamera atau pilih dari galeri terlebih dahulu!");
                return;
            }
            
            btnKirim.disabled = true;
            btnKirim.innerText = "Mengirim...";

            const sekarang = new Date();
            const tanggal = sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const waktu = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";

            const latitude = document.getElementById("lat").value || "Tidak diketahui";
            const longitude = document.getElementById("lng").value || "Tidak diketahui";

            try {
                await ops.addDoc(ops.collection(db, "laporan"), {
                    nama: document.getElementById("namaPelapor").value,
                    lokasi: document.getElementById("lokasi").value,
                    catatan: document.getElementById("catatan").value,
                    foto: fotoBase64,
                    tanggal: tanggal,
                    waktu: waktu,
                    lat: latitude,
                    lng: longitude,
                    timestamp: Date.now()
                });

                alert("Laporan & Lokasi GPS berhasil dikirim ke Orang B!");
                formLaporan.reset();
                previewKontainer.innerHTML = "";
                fotoBase64 = "";
                if(fotoKamera) fotoKamera.value = "";
                if(fotoGaleri) fotoGaleri.value = "";
                mintaAksesLokasi(); 
            } catch (error) {
                console.error("Error mengirim:", error);
                alert("Gagal mengirim laporan. Pastikan koneksi bagus dan aturan Firebase benar.");
            } finally {
                btnKirim.disabled = false;
                btnKirim.innerText = "Kirim Laporan";
            }
        });
    }

    // LOGIKA KHUSUS HALAMAN PENERIMA (Orang B)
    if (daftarLaporan) {
        const queryLaporan = ops.query(ops.collection(db, "laporan"), ops.orderBy("timestamp", "desc"));
        
        ops.onSnapshot(queryLaporan, (snapshot) => {
            if (snapshot.empty) {
                daftarLaporan.innerHTML = '<p class="text-kosong">Belum ada laporan yang masuk.</p>';
                return;
            }

            daftarLaporan.innerHTML = "";

            snapshot.forEach((doc) => {
                const lap = doc.data();
                const kartu = document.createElement("div");
                kartu.className = "kartu-laporan";
                
                const adaLokasi = lap.lat && lap.lng && lap.lat !== "Tidak diketahui";
                const linkMaps = adaLokasi ? `https://maps.google.com/?q=${lap.lat},${lap.lng}` : "#";

                kartu.innerHTML = `
                    <div class="kartu-header">
                        <span>📅 ${lap.tanggal || '-'}</span>
                        <span>⏰ ${lap.waktu || '-'}</span>
                    </div>
                    <div class="kartu-body">
                        <p><strong>Pelapor:</strong> ${lap.nama}</p>
                        <p><strong>Lokasi:</strong> ${lap.lokasi}</p>
                        <p><strong>Koordinat Pengirim:</strong> ${lap.lat}, ${lap.lng}</p>
                        ${adaLokasi ? `<p style="margin-top: 5px;"><a href="${linkMaps}" target="_blank" class="btn-secondary" style="display:inline-block; text-decoration:none; color:white; border-radius:4px; padding:4px 8px; font-size:12px;">📍 Buka di Google Maps</a></p>` : ''}
                        <p style="margin-top: 10px;"><strong>Catatan:</strong> ${lap.catatan}</p>
                        ${lap.foto ? `<img src="${lap.foto}" class="foto-lampiran" alt="Foto Laporan">` : ''}
                    </div>
                `;
                daftarLaporan.appendChild(kartu);
            });
        });
    }
}
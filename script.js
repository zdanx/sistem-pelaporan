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
        const statusLokasiKontainer = document.getElementById("statusLokasiKontainer");
        const statusLokasiTeks = document.getElementById("statusLokasiTeks");
        const statusIcon = document.getElementById("statusIcon");
        const btnMintaLokasiManual = document.getElementById("btnMintaLokasiManual");

        // Otomatis minta akses lokasi saat halaman pertama kali dimuat
        mintaAksesLokasi();

        function mintaAksesLokasi() {
            if (navigator.geolocation) {
                // Tampilkan status sedang memproses lokasi
                statusLokasiTeks.innerText = "Sedang mengunci lokasi GPS...";
                statusIcon.innerText = "⏳";
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // JIKA BERHASIL (User klik Allow)
                        document.getElementById("lat").value = position.coords.latitude;
                        document.getElementById("lng").value = position.coords.longitude;
                        console.log("Lokasi berhasil dikunci:", position.coords.latitude, position.coords.longitude);
                        
                        // Ubah tampilan menjadi Centang Hijau sukses
                        statusLokasiKontainer.style.backgroundColor = "#f0fdf4";
                        statusLokasiKontainer.style.borderColor = "#bbf7d0";
                        statusLokasiTeks.innerText = "Lokasi GPS berhasil dibagikan ✓";
                        statusLokasiTeks.style.color = "#166534";
                        statusIcon.innerText = "✅";
                        btnMintaLokasiManual.style.display = "none"; // Sembunyikan tombol karena sudah sukses
                    },
                    (error) => {
                        // JIKA GAGAL atau USER KLIk BLOCK / NOT ALLOWED
                        console.error("Gagal mendapatkan lokasi GPS:", error.message);
                        
                        statusLokasiKontainer.style.backgroundColor = "#fef2f2";
                        statusLokasiKontainer.style.borderColor = "#fee2e2";
                        statusLokasiTeks.style.color = "#991b1b";
                        statusIcon.innerText = "❌";
                        btnMintaLokasiManual.style.display = "block";

                        if (error.code === error.PERMISSION_DENIED) {
                            statusLokasiTeks.innerText = "Izin lokasi diblokir browser. Klik tombol untuk panduan.";
                        } else {
                            statusLokasiTeks.innerText = "Gagal mengambil GPS. Pastikan GPS HP Anda aktif.";
                        }
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                statusLokasiTeks.innerText = "Browser tidak mendukung Geolocation.";
                btnMintaLokasiManual.style.display = "none";
            }
        }

        // AKSI TOMBOL MANUAL JIKA DIKLIK OLEH PENGGUNA
        btnMintaLokasiManual.addEventListener("click", () => {
            // Cek status izin menggunakan Permissions API jika didukung browser
            if (navigator.permissions) {
                navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                    if (result.state === 'denied') {
                        // Jika terlanjur di-Block permanen di Chrome, ingatkan cara buka manual
                        alert("Akses lokasi diblokir oleh Chrome Anda.\n\nSilakan klik ikon gembok/pengatur di kiri kolom alamat URL atas, lalu ubah izin 'Location' menjadi 'Allow', kemudian refresh halaman.");
                    } else {
                        // Jika statusnya belum diizinkan biasa, pemicu pop-up akan muncul lagi
                        mintaAksesLokasi();
                    }
                });
            } else {
                mintaAksesLokasi();
            }
        });

        // Bagian logika kamera dan input file di bawahnya (tetap sama seperti sebelumnya)
        const btnKamera = document.getElementById("btnKamera");
        const btnGaleri = document.getElementById("btnGaleri");
        const fotoKamera = document.getElementById("fotoKamera");
        const fotoGaleri = document.getElementById("fotoGaleri");

        if (btnKamera && btnGaleri) {
            btnKamera.addEventListener("click", () => fotoKamera.click());
            btnGaleri.addEventListener("click", () => fotoGaleri.click());
        }

        function prosesDanKompresGambar(inputElemen) {
            const file = inputElemen.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_WIDTH = 1000;
                        const MAX_HEIGHT = 1000;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        previewKontainer.innerHTML = `<img src="${fotoBase64}" alt="Preview" style="max-width:100%; border-radius:8px;">`;
                    };
                };
                reader.readAsDataURL(file);
            }
        }

        if (fotoKamera && fotoGaleri) {
            fotoKamera.addEventListener("change", function() { prosesDanKompresGambar(this); if(fotoGaleri) fotoGaleri.value = ""; });
            fotoGaleri.addEventListener("change", function() { prosesDanKompresGambar(this); if(fotoKamera) fotoKamera.value = ""; });
        }

        formLaporan.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!fotoBase64) { alert("Silakan ambil foto lewat kamera atau pilih dari galeri terlebih dahulu!"); return; }
            
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

                alert("Laporan berhasil dikirim!");
                formLaporan.reset();
                previewKontainer.innerHTML = "";
                fotoBase64 = "";
                if(fotoKamera) fotoKamera.value = "";
                if(fotoGaleri) fotoGaleri.value = "";
                
                // Kembalikan tampilan status lokasi ke semula untuk laporan berikutnya
                document.getElementById("lat").value = "";
                document.getElementById("lng").value = "";
                mintaAksesLokasi(); 
            } catch (error) {
                console.error("Error mengirim:", error);
                alert("Gagal mengirim laporan.");
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
const linkMaps = adaLokasi ? `https://www.google.com/maps?q=${lap.lat},${lap.lng}` : "#";

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

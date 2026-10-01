# Serahan Fasa 2 — kawalan operasi frontend

Skop ini ialah prototaip React dalam memori. Tiada API, penghantaran arahan peralatan,
backend Laravel, atau simpanan operasi selepas refresh. Fasa 3 belum dilaksanakan.

## Rujukan dan liputan

Rujukan utama: `DRAFT - URS SMARTLANE - 20260822 - updated.docx`, **URS_1.1.4**:
Manual Operation, Schedule Operation, Automated Operation, Phases of Smart Emergency
Lane Operation Activation, Manual Intervention dan Timing. Kecacatan audit yang
dinyatakan dalam arahan Fasa 2 digunakan sebagai senarai pembetulan; tiada fail
laporan audit berasingan ditemui dalam repositori.

- Mod Manual / Scheduled / Automated diasingkan daripada lima fasa URS dan standby.
- Permintaan pengaktifan/penamatan memerlukan pengakuan; amaran tidak boleh dilangkau.
- Permintaan, pengakuan, pembatalan, luput, amaran, transition pending dan hasil simulasi
  melalui satu reducer mengikut ID lokasi.
- Intervensi mempunyai tiga sebab URS, penunjuk berterusan, peringatan dan keputusan
  untuk kekal, sambung semula atau meminta penamatan. Vehicle towed bukan reset.
- Lanjutan menunjukkan masa tamat lama/baharu dan mengubah deadline selepas pengesahan.
- Keputusan/peringatan tidak hilang apabila menukar tab atau lokasi. Hasil akhir juga
  kekal dalam panel dan peti keputusan global.
- Semua peristiwa operasi berstruktur dipaparkan dalam jadual audit utama lokasi.
- Nama fasa editor VMS berkongsi pemetaan yang sama. Pemilihan templat ialah penyuntingan
  draf, bukan perubahan fasa operasi.
- URS_1.1.8: simulasi Match LCS tidak menggunakan bendera active umum untuk membuka
  tanda semasa Pre Activation. Permintaan dipisahkan daripada pemerhatian asal contoh.
- URS_1.1.5: kesihatan/connectivity dan ID peralatan Fasa 1 dikekalkan semasa operasi.

Liputan di atas ialah aliran frontend, bukan pematuhan sistem penuh. Jadual sebenar,
pencetus AVDS, pengesahan hak pengguna, audible alarm, respons peralatan dan polisi
keadaan kecemasan belum dilaksanakan. Scheduled/Automated mempunyai butang pencetus
demo; editor Schedule tidak menjalankan operasi.

## Andaian demo yang memerlukan pengesahan pihak berkepentingan

Semua pemalar masa berada dalam `src/operationPolicy.js`.

| Perkara | Polisi demonstrasi |
| --- | --- |
| Masa amaran bermula | Selepas operator mengaku; bukan ketika permintaan dibuat. |
| Tempoh amaran | Lalai 3 minit; pilihan demo 1/3/5 minit setiap lokasi, hanya ketika standby/Post Activation. Kedua-dua arah menggunakan nilai sama. Tiada kelulusan peranan sebenar. |
| Luput pengakuan | 2 minit untuk pengaktifan/penamatan. Luput membatalkan permintaan sahaja; fasa semasa dikekalkan. |
| Minimum automatik 30 minit vs trafik surut 20 minit | Minimum 30 minit dikekalkan; keputusan pertama pada minit 30, seterusnya setiap 20 minit. Tiada penamatan berdasarkan trafik surut minit 20. |
| Manual | Tiada masa tamat. Peringatan setiap 20 minit menawarkan teruskan atau penamatan; tidak memaksa penamatan. |
| Scheduled/Automated | Tempoh demo 30/60 minit dikira dari pengaktifan simulasi selesai. Masa tamat mencetuskan keputusan berterusan, bukan penamatan tanpa pengakuan. |
| Respons simulasi | Selepas amaran, status Transition pending selama 2 saat; kemudian hasil simulasi berjaya. Tiada respons peralatan sebenar atau senario kegagalan penghantaran. |
| Phase 4 → Phase 5 | Selepas 5 saat, mengekalkan tempoh prototaip terdahulu. Fasa 5 kekal sehingga permintaan aktivasi seterusnya. |
| Intervensi | Mengekalkan ID operasi, mod, Phase 2 dan masa tamat. Indikator operasi ditahan sebagai intervensi/polisi belum diluluskan. Tidak mereka arahan VMS/LCS khusus sebab. |
| Sambung semula | Keputusan eksplisit memulihkan konteks operasi sama; tidak memulakan aktivasi baharu. Jika masa tamat sudah berlalu, keputusan lanjut muncul semula. |
| Peringatan intervensi | 20 minit selepas mula/keputusan teruskan, sejajar Timing URS. Keputusan belum dijawab tidak diduplikasi. |
| Lanjutan | Pilihan 15/20/30/60 minit. Ditambah pada masa tamat, atau masa demo semasa jika masa tamat sudah berlalu. |
| Minimum automatik ketika kecemasan | Tiada pintasan minimum direka. Polisi override kecemasan perlu dipersetujui sebelum penggunaan sebenar. |
| Jam demo | Butang +1/+3/+20/+30 minit memajukan SEMUA lokasi. Countdown dikira daripada timestamp, bukan mengurang satu setiap tick. |
| Permulaan/refresh | Semua lokasi bermula standby. Operasi fixture lama tidak dianggap operasi sah atau pengakuan terdahulu. Data operasi/audit baharu hilang selepas refresh. |

Jika pelayar tertangguh, reducer mengira peralihan berdasarkan deadline asal. Timestamp
audit menunjukkan masa peristiwa diproses oleh jam demo; bukan bukti masa peralatan.
Kesihatan peralatan menggunakan pemerhatian contoh asal dan tidak dipercepat oleh jam operasi.

## Fail

- Baharu: `src/operationPolicy.js`, `src/operations.js`,
  `src/components/OperationControls.jsx`, `src/operations.css`, `tests/operations.test.mjs`.
- Integrasi: `src/App.jsx`, `src/components/LocationScreen.jsx`,
  `src/components/OverviewScreen.jsx`, `src/components/VmsEditor.jsx`.
- Penyelarasan pemerhatian/audit: `src/equipment.js`,
  `src/components/DeviceDetails.jsx`, `src/components/AuditLogDisplay.jsx`.
- Komponen modal Fasa 1 digunakan semula untuk label, Escape, perangkap Tab dan
  pemulangan fokus. Tiada dependency dipasang.

## Semakan manual

1. Aktifkan Manual: request → review → acknowledge → amaran → pending → hasil.
   Cuba double click, Cancel, dan luput melalui jam demo sebelum acknowledge.
2. Semasa Pre Activation, cuba Match LCS: sasaran mesti Red X, bukan Green Arrow.
   Selepas Phase 2, tiada deadline untuk Manual.
3. Pilih setiap sebab intervensi. Semak banner, butiran lokasi, polisi tanda belum
   diluluskan dan tiada reset untuk vehicle towed. Resume mesti mengekalkan ID/start/end.
4. Dalam Scheduled, pilih 30 minit dan aktifkan. Extend 20 minit mesti menunjukkan
   serta mengemas kini masa tamat. Cuba keputusan apabila deadline sudah berlalu.
5. Dalam Automated, maju 20 minit selepas aktif: minimum 30 belum selesai.
   Pada minit 30, keputusan extend/deactivate muncul sekali. Pengakuan tetap diperlukan.
6. Tukar tab/lokasi ketika keputusan tertangguh. Tiada dialog lokasi lama dipaparkan;
   kembali melalui peti keputusan global. Operasi lain mesti kekal.
7. Majukan jam 20 minit ketika intervensi; ulang tick/navigation. Hanya satu reminder
   belum selesai. Continue menjadualkan reminder seterusnya.
8. Semak Alarms & Audit: tindakan terperinci, keputusan, ID lokasi/operasi, sebab,
   lanjutan dan hasil Simulated boleh dibaca. Bandingkan health/connectivity Fasa 1.
9. Cuba penamatan lengkap hingga Phase 5. Semak hasil kekal termasuk peralihan jam.
10. Semak 1366px, 768px dan 390px; keyboard Tab/Shift+Tab/Escape, fokus selepas modal,
    scroll panel, navigasi asal dan Equipment Status.

Pelayar tidak tersedia dalam sesi implementasi; semakan visual/interaksi sebenar
di atas masih tertangguh. Build dan ujian automatik bukan pengganti semakan tersebut.

Keputusan semakan akhir:
- `node --test tests/equipment.test.mjs tests/operations.test.mjs`: 19/19 lulus
  (8 ujian pemantauan Fasa 1 dan 11 ujian operasi Fasa 2).
- `vite build`: lulus. Amaran sedia ada mengenai import MapLibre dan bundle melebihi
  500 kB masih dilaporkan.
- `oxlint`: exit 0, 27 amaran dalam modul sedia ada; tiada amaran pada modul operasi baharu.
- `git diff --check`: lulus; Git memberi notis penukaran LF/CRLF sahaja.
- Tiada pemasangan dependency; perubahan `package-lock.json` terdahulu tidak disentuh.

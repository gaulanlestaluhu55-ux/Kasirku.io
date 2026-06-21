/**
 * ================================================================= -->
 * === FILE: js/inventory.js (CRUD PRODUK, RESTOCK & KAMERA UI) ==== -->
 * === LOKASI: Folder /js/ di dalam Repositori Github Pages ======== -->
 * ================================================================= -->
 */

let deleteTargetIndex = -1;
let restockTargetIndex = -1;
let cameraStream = null;
let currentImageBase64 = null; // Menyimpan data Base64 (Kamera/File) siap upload
let skuHtml5QrCode = null;

// ==========================================
// 1. RENDER & FILTER TABEL INVENTORY
// ==========================================
function filterInventoryProducts() {
    const q = document.getElementById('search-inventory').value.toLowerCase();
    renderInventory(q);
}

function renderInventory(filterQuery = '') {
    const tbody = document.getElementById('inventory-table-body');
    const mobList = document.getElementById('inventory-mobile-list');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    mobList.innerHTML = '';

    const filtered = state.products.filter(p => {
        return p.name.toLowerCase().includes(filterQuery) || p.sku.includes(filterQuery) || p.category.toLowerCase().includes(filterQuery);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400"><i class="fa-solid fa-folder-open text-3xl mb-1"></i><p class="font-bold text-xs">Produk tidak ditemukan</p></td></tr>`;
        mobList.innerHTML = `<div class="p-4 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl">No items to display.</div>`;
        return;
    }

    filtered.forEach((p) => {
        const isLow = p.stock <= 5;
        const originalIndex = state.products.findIndex(op => op.sku === p.sku);

        // --- Render Tabel Desktop ---
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition-all duration-150";
        tr.innerHTML = `
            <td class="p-4 font-mono text-xs font-semibold text-slate-500">${p.sku}</td>
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="${p.image}" class="w-11 h-11 rounded-xl object-cover bg-slate-100 shadow-xs" onerror="this.src='https://placehold.co/150x150/f1f5f9/94a3b8?text=P'">
                    <span class="font-bold text-slate-700">${p.name}</span>
                </div>
            </td>
            <td class="p-4"><span class="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">${p.category}</span></td>
            <td class="p-4 text-right font-black text-slate-700">${formatRupiah(p.price)}</td>
            <td class="p-4 text-center">
                <span class="px-3 py-1.5 rounded-xl text-[10px] font-extrabold ${isLow ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">
                    ${p.stock} pcs
                </span>
            </td>
            <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="openRestockModal(${originalIndex})" class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors" title="Restock Cepat"><i class="fa-solid fa-box-open text-sm"></i></button>
                    <button onclick="openProductForm(${originalIndex})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Data Produk"><i class="fa-solid fa-pen-to-square text-sm"></i></button>
                    <button onclick="deleteProduct(${originalIndex})" class="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus"><i class="fa-solid fa-trash-can text-sm"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // --- Render List Mobile ---
        const mCard = document.createElement('div');
        mCard.className = "p-4 rounded-2xl border border-brand-100/50 shadow-xs flex flex-col gap-3 bg-gradient-to-r from-brand-50/30 to-white";
        mCard.innerHTML = `
            <div class="flex items-start gap-3 min-w-0">
                <img src="${p.image}" class="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0" onerror="this.src='https://placehold.co/150x150/f1f5f9/94a3b8?text=P'">
                <div class="space-y-0.5 min-w-0 flex-1">
                    <h4 class="text-sm font-bold text-slate-700 leading-snug truncate">${p.name}</h4>
                    <div class="flex justify-between items-center mt-1">
                        <p class="text-[10px] text-brand-800 font-mono font-bold bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">SKU: ${p.sku}</p>
                    </div>
                    <div class="flex gap-2 items-center mt-1.5">
                        <span class="text-xs font-black text-brand-600">${formatRupiah(p.price)}</span>
                        <span class="text-slate-200">|</span>
                        <span class="text-[10px] font-bold ${isLow ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md' : 'text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100'}">Stok: ${p.stock} pcs</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 pt-3 border-t border-brand-100/50">
                <button onclick="openRestockModal(${originalIndex})" class="flex-1 py-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-colors text-xs font-extrabold flex justify-center items-center gap-1.5 shadow-xs"><i class="fa-solid fa-box-open text-sm"></i> Restock Cepat</button>
                <button onclick="openProductForm(${originalIndex})" class="w-10 h-10 flex shrink-0 items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors shadow-xs"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProduct(${originalIndex})" class="w-10 h-10 flex shrink-0 items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shadow-xs"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        mobList.appendChild(mCard);
    });
}

// ==========================================
// 2. QUICK RESTOCK LOGIC
// ==========================================
function openRestockModal(index) {
    restockTargetIndex = index;
    const p = state.products[index];
    document.getElementById('restock-product-name').innerText = p.name;
    document.getElementById('restock-product-sku').innerText = `SKU: ${p.sku}`;
    document.getElementById('restock-current-stock').innerText = p.stock;
    document.getElementById('restock-input-qty').value = '';
    document.getElementById('restock-total-stock').innerText = p.stock;
    document.getElementById('modal-quick-restock').classList.remove('hidden');
    setTimeout(() => document.getElementById('restock-input-qty').focus(), 100);
}

function closeRestockModal() {
    document.getElementById('modal-quick-restock').classList.add('hidden');
    restockTargetIndex = -1;
}

function updateRestockPreview() {
    if (restockTargetIndex === -1) return;
    const currentStock = state.products[restockTargetIndex].stock;
    const inputQty = parseInt(document.getElementById('restock-input-qty').value) || 0;
    document.getElementById('restock-total-stock').innerText = currentStock + inputQty;
}

function saveRestock(e) {
    e.preventDefault();
    if (restockTargetIndex === -1) return;
    const inputQty = parseInt(document.getElementById('restock-input-qty').value) || 0;
    if (inputQty <= 0) { showToast('Jumlah barang masuk tidak valid!', 'error'); return; }

    const p = state.products[restockTargetIndex];
    const updatedProduct = { ...p, stock: p.stock + inputQty };

    const localSave = () => {
        state.products[restockTargetIndex] = updatedProduct;
        saveToLocalCache(); 
        if(typeof renderPOSProducts === 'function') renderPOSProducts(); 
        renderInventory(); 
        if(typeof updateDashboardStats === 'function') updateDashboardStats();
        if (!document.getElementById('modal-low-stock').classList.contains('hidden')) { 
            if(typeof renderLowStockList === 'function') renderLowStockList(); 
        }
        closeRestockModal(); 
        return true;
    };

    if (isCloudMode) {
        toggleLoadingOverlay(true);
        callBackendAPI("saveProduct", { data: JSON.stringify(updatedProduct) }).then(res => {
            toggleLoadingOverlay(false);
            if (res && res.status === "success") {
                localSave();
                showToast(`Stok ${p.name} berhasil ditambah +${inputQty} (Cloud)!`, 'success');
            } else {
                showToast('Gagal update stok ke Google Sheets.', 'error');
            }
        }).catch(err => {
            toggleLoadingOverlay(false);
            showToast('Koneksi terputus! Gagal menghubungi Cloud.', 'error');
        });
    } else {
        localSave(); 
        showToast(`Stok ${p.name} berhasil ditambah +${inputQty} secara lokal.`, 'success');
    }
}

// ==========================================
// 3. LOGIKA FORM GAMBAR 3-IN-1 (FILE, KAMERA, URL)
// ==========================================

function handleImageUrlInput(url) {
    const preview = document.getElementById('form-product-image-preview');
    const placeholder = document.getElementById('form-product-image-placeholder');

    if (url && url.startsWith('http')) {
        preview.src = url;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        currentImageBase64 = null; // Reset base64
    } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result;
            const preview = document.getElementById('form-product-image-preview');
            const placeholder = document.getElementById('form-product-image-placeholder');
            
            preview.src = currentImageBase64;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            document.getElementById('form-product-image-url').value = '';
        };
        reader.readAsDataURL(file);
    }
}

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = document.getElementById('camera-video');
        video.srcObject = cameraStream;
        document.getElementById('camera-container').classList.remove('hidden');
    } catch (err) {
        try {
            // Fallback kamera depan kalau belakang ga ada
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const video = document.getElementById('camera-video');
            video.srcObject = cameraStream;
            document.getElementById('camera-container').classList.remove('hidden');
        } catch(e) {
            showToast("Gagal mengakses kamera.", "error");
        }
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('camera-container').classList.add('hidden');
}

function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    currentImageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    const preview = document.getElementById('form-product-image-preview');
    const placeholder = document.getElementById('form-product-image-placeholder');

    preview.src = currentImageBase64;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    document.getElementById('form-product-image-url').value = '';

    stopCamera();
    showToast("Jepretan berhasil!", "success");
}

function resetImageForm() {
    currentImageBase64 = null;
    document.getElementById('form-product-image-preview').classList.add('hidden');
    document.getElementById('form-product-image-placeholder').classList.remove('hidden');
    document.getElementById('form-product-image-url').value = '';
    document.getElementById('form-product-image-file').value = '';
    stopCamera();
}

// ==========================================
// 4. PEMINDAI SKU / BARCODE KHUSUS FORM
// ==========================================
function startSkuScanner() {
    document.getElementById('modal-sku-scanner').classList.remove('hidden');
    
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            let cameraId = devices[0].id;
            for(let i = 0; i < devices.length; i++) {
                if(devices[i].label.toLowerCase().includes('back') || devices[i].label.toLowerCase().includes('belakang') || devices[i].label.toLowerCase().includes('environment')) {
                    cameraId = devices[i].id; 
                    break;
                }
            }

            skuHtml5QrCode = new Html5Qrcode("sku-scanner-video");
            skuHtml5QrCode.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    if(typeof playVirtualBeep === 'function') playVirtualBeep(); 
                    document.getElementById('form-product-sku').value = decodedText.trim(); 
                    showToast("SKU Barcode berhasil ditangkap!", "success"); 
                    stopSkuScanner(); 
                },
                (errorMessage) => { /* Abaikan error background */ }
            ).catch((err) => { 
                showToast("Gagal memulai kamera scanner.", "error"); 
            });
        } else {
            showToast("Tidak ada kamera terdeteksi di perangkat ini.", "error");
        }
    }).catch(err => {
        showToast("Izin akses kamera ditolak oleh browser.", "error");
    });
}

function stopSkuScanner() {
    document.getElementById('modal-sku-scanner').classList.add('hidden');
    try {
        if (skuHtml5QrCode) { 
            skuHtml5QrCode.stop().then(() => {
                skuHtml5QrCode.clear();
                skuHtml5QrCode = null;
            }).catch(err => {
                skuHtml5QrCode.clear();
                skuHtml5QrCode = null;
            }); 
        }
    } catch(e) {}
}

// ==========================================
// 5. MANIPULASI SIMPAN DATA PRODUK (CLOUD UPLOAD)
// ==========================================
function openProductForm(index = -1) {
    document.getElementById('product-form').reset(); 
    resetImageForm(); // Panggil reset UI form gambar

    if (index > -1) {
        const p = state.products[index];
        document.getElementById('product-modal-title').innerText = 'Edit Produk';
        document.getElementById('form-product-index').value = index;
        document.getElementById('form-product-name').value = p.name;
        document.getElementById('form-product-sku').value = p.sku;
        document.getElementById('form-product-sku').disabled = true;
        document.getElementById('form-product-category').value = p.category;
        document.getElementById('form-product-price').value = p.price;
        document.getElementById('form-product-stock').value = p.stock;
        
        // Load existing image
        document.getElementById('form-product-image-url').value = p.image;
        handleImageUrlInput(p.image);
    } else {
        document.getElementById('product-modal-title').innerText = 'Tambah Produk Baru';
        document.getElementById('form-product-index').value = -1;
        document.getElementById('form-product-sku').disabled = false;
    }
    document.getElementById('modal-product-form').classList.remove('hidden');
}

function closeProductForm() { 
    resetImageForm();
    document.getElementById('modal-product-form').classList.add('hidden'); 
}

// UBAH JADI ASYNC BIAR BISA NUNGGU UPLOAD GOOGLE DRIVE
async function saveProduct(e) {
    e.preventDefault();
    const idx = parseInt(document.getElementById('form-product-index').value);
    const sku = document.getElementById('form-product-sku').value;
    const name = document.getElementById('form-product-name').value;
    const category = document.getElementById('form-product-category').value;
    const price = parseFloat(document.getElementById('form-product-price').value) || 0;
    const stock = parseFloat(document.getElementById('form-product-stock').value) || 0;
    
    // Tentukan URL final (prioritas: Input URL text -> Placehold default)
    let finalImageUrl = document.getElementById('form-product-image-url').value || 'https://placehold.co/150x150/f1f5f9/94a3b8?text=Produk';

    // Local save function wrapper
    const localSave = (productData) => {
        if (idx > -1) { 
            state.products[idx] = { ...state.products[idx], ...productData }; 
        } else {
            if(state.products.some(pr => pr.sku === productData.sku)) { 
                showToast('SKU sudah terdaftar!', 'error'); 
                return false; 
            }
            state.products.push(productData);
        }
        saveToLocalCache(); 
        if(typeof renderPOSProducts === 'function') renderPOSProducts(); 
        renderInventory(); 
        if(typeof updateDashboardStats === 'function') updateDashboardStats(); 
        closeProductForm(); 
        return true;
    };

    if (isCloudMode) {
        toggleLoadingOverlay(true);

        // 1. JIKA ADA FOTO BARU (Base64) -> UPLOAD KE GOOGLE DRIVE DULU (Via POST)
        if (currentImageBase64) {
            showToast("Mengunggah foto ke Google Drive...", "info");
            try {
                const savedApi = localStorage.getItem('kasirku_api_url');
                const uploadRes = await fetch(savedApi, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: "uploadImage",
                        file: {
                            base64: currentImageBase64,
                            mimeType: currentImageBase64.split(';')[0].split(':')[1],
                            name: `IMG_${sku}_${Date.now()}.jpg`
                        }
                    })
                });
                const uploadData = await uploadRes.json();
                
                if (uploadData.status === "success") {
                    finalImageUrl = uploadData.url; // Berhasil dapet Direct Link Google Drive!
                } else {
                    console.error("Upload Error:", uploadData.message);
                    showToast("Gagal unggah foto ke Drive. Memakai foto default.", "warning");
                }
            } catch (err) {
                console.error("Fetch Upload Error:", err);
                showToast("Koneksi unggah gagal. Memakai foto default.", "warning");
            }
        }

        // 2. KIRIM DATA PRODUK LENGKAP KE GOOGLE SHEETS
        const p = { sku, name, category, price, stock, image: finalImageUrl };

        callBackendAPI("saveProduct", { data: JSON.stringify(p) }).then(res => {
            toggleLoadingOverlay(false);
            if (res && res.status === "success") {
                localSave(p);
                showToast('Produk & Foto tersimpan di Cloud!', 'success');
            } else {
                showToast('Gagal menyimpan ke database awan.', 'error');
            }
        }).catch(err => {
            toggleLoadingOverlay(false);
            showToast('Koneksi terputus!', 'error');
        });
        
    } else { 
        // Mode Offline / Lokal (Simpan Base64 nya langsung ke LocalStorage)
        const p = { sku, name, category, price, stock, image: currentImageBase64 || finalImageUrl };
        if(localSave(p)) showToast('Tersimpan secara lokal.', 'success'); 
    }
}

// ==========================================
// 6. HAPUS DATA PRODUK
// ==========================================
function deleteProduct(index) {
    deleteTargetIndex = index;
    document.getElementById('modal-confirm-delete').classList.remove('hidden');
    document.getElementById('btn-confirm-delete-action').onclick = () => {
        const target = state.products[deleteTargetIndex];
        
        const localDel = () => { 
            state.products.splice(deleteTargetIndex, 1); 
            saveToLocalCache(); 
            document.getElementById('modal-confirm-delete').classList.add('hidden'); 
            if(typeof renderPOSProducts === 'function') renderPOSProducts(); 
            renderInventory(); 
            if(typeof updateDashboardStats === 'function') updateDashboardStats(); 
        };
        
        if (isCloudMode) {
            toggleLoadingOverlay(true);
            callBackendAPI("deleteProduct", { sku: target.sku }).then(res => {
                toggleLoadingOverlay(false);
                if (res && res.status === "success") {
                    localDel();
                    showToast('Terhapus di Cloud!', 'info');
                } else {
                    showToast('Gagal menghapus di database awan.', 'error');
                }
            }).catch(err => {
                toggleLoadingOverlay(false);
                showToast('Koneksi terputus!', 'error');
            });
        } else { 
            localDel(); 
            showToast('Terhapus secara lokal.', 'info'); 
        }
    };
}

function closeDeleteModal() { 
    document.getElementById('modal-confirm-delete').classList.add('hidden'); 
}

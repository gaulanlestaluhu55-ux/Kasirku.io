/**
 * ================================================================= -->
 * === FILE: js/laporan.js (DASHBOARD STATISTIK & LAPORAN) ========= -->
 * === LOKASI: Folder /js/ di dalam Repositori Github Pages ======== -->
 * ================================================================= -->
 */

function updateDashboardStats() {
    const totalRevenue = state.transactions.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactionsCount = state.transactions.length;
    const avgBasketValue = totalTransactionsCount > 0 ? Math.round(totalRevenue / totalTransactionsCount) : 0;
    const lowStockCount = state.products.filter(p => p.stock <= 5).length;

    document.getElementById('stat-revenue').innerText = formatRupiah(totalRevenue);
    document.getElementById('stat-count').innerText = totalTransactionsCount;
    document.getElementById('stat-avg').innerText = formatRupiah(avgBasketValue);
    document.getElementById('stat-low-stock').innerText = lowStockCount;

    renderWeeklyAnalyticsBars();
    renderPopularItems();
}

function renderWeeklyAnalyticsBars() {
    const container = document.getElementById('dashboard-bars-container');
    if(!container) return; 
    container.innerHTML = '';
    
    const labels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const revs = [0, 0, 0, 0, 0, 0, 0];
    
    state.transactions.forEach(tx => {
        try {
            const p = tx.datetime.split(' ')[0].split('/');
            const d = p.length === 3 ? new Date(p[2], p[1]-1, p[0]) : new Date(tx.datetime);
            if(!isNaN(d.getTime())) revs[d.getDay()] += tx.total;
        } catch(e) {}
    });
    
    const max = Math.max(...revs, 100000);
    if(document.getElementById('chart-max-sale')) {
        document.getElementById('chart-max-sale').innerText = `Maks: ${formatRupiah(max)}`;
    }
    
    [1, 2, 3, 4, 5, 6, 0].forEach(idx => {
        const h = Math.min(100, Math.max(10, (revs[idx]/max)*100));
        const col = document.createElement('div');
        col.className = "flex flex-col items-center flex-1 h-full justify-end";
        col.innerHTML = `
            <div class="w-full bg-slate-50 rounded-xl relative flex items-end h-4/5" title="${formatRupiah(revs[idx])}">
                <div class="w-full bg-gradient-to-t from-brand-600 to-emerald-400 rounded-xl transition-all duration-700" style="height: ${h}%"></div>
            </div>
            <span class="text-[10px] text-slate-400 mt-2 font-bold">${labels[idx]}</span>
        `;
        container.appendChild(col);
    });
}

function renderPopularItems() {
    const container = document.getElementById('popular-items-list');
    if(!container) return; 
    container.innerHTML = '';
    
    const sales = {};
    state.transactions.forEach(tx => {
        tx.items.forEach(i => {
            const identifier = i.sku || i.name;
            sales[identifier] = (sales[identifier] || 0) + i.qty;
        });
    });
    
    const sorted = Object.entries(sales).sort((a,b) => b[1] - a[1]).slice(0,3);
    
    if(sorted.length === 0) { 
        container.innerHTML = '<p class="text-xs text-center text-slate-400 py-6">Belum ada data barang terjual.</p>'; 
        return; 
    }
    
    sorted.forEach(([identifier, qty], idx) => {
        const prod = state.products.find(p => p.sku === identifier || p.name === identifier);
        const row = document.createElement('div');
        row.className = "flex justify-between items-center pt-3";
        row.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : idx === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} font-bold text-xs flex items-center justify-center">${idx+1}</span>
                <div>
                    <p class="text-xs font-bold text-slate-700 line-clamp-1 max-w-[150px]">${prod ? prod.name : identifier}</p>
                    <p class="text-[10px] text-slate-400 font-semibold">Terjual ${qty} pcs</p>
                </div>
            </div>
            <span class="text-[10px] font-extrabold px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg uppercase">${prod ? prod.category : 'Umum'}</span>
        `;
        container.appendChild(row);
    });
}

// ==========================================
// MODAL STOK TIPIS (LOW STOCK ALERT) DENGAN MEMORI LOKAL
// ==========================================
function openLowStockModal() {
    renderLowStockList(); // Pastikan render dipanggil duluan agar data selalu segar
    document.getElementById('modal-low-stock').classList.remove('hidden');
}

function closeLowStockModal() {
    document.getElementById('modal-low-stock').classList.add('hidden');
}

function renderLowStockList() {
    const container = document.getElementById('low-stock-list-container');
    if (!container) return;
    container.innerHTML = '';

    const lowStockProducts = state.products.filter(p => p.stock <= 5);

    if (lowStockProducts.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-slate-400 h-full">
                <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-check text-xl"></i>
                </div>
                <p class="text-xs font-bold text-slate-700">Semua stok aman!</p>
                <p class="text-[10px] text-center mt-1">Tidak ada produk dengan stok kritis.</p>
            </div>
        `;
        return;
    }

    lowStockProducts.forEach(p => {
        // Ambil index aslinya biar bisa dikirim ke fungsi Restock di inventory.js
        const originalIndex = state.products.findIndex(op => op.sku === p.sku);
        
        // --- LOGIKA GAMBAR STORAGE LOKAL (KEBAL CORS) ---
        const productImgSrc = p.image === 'LOCAL' 
            ? (localStorage.getItem('kasirku_img_' + p.sku) || 'https://placehold.co/150x150/f1f5f9/94a3b8?text=P') 
            : p.image;

        const itemDiv = document.createElement('div');
        // Styling Card mirip banget sama Mockup desain lo
        itemDiv.className = "p-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/50 to-white flex items-center justify-between gap-3 shadow-xs mb-3";
        itemDiv.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <img src="${productImgSrc}" class="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200" onerror="this.src='https://placehold.co/150x150/f1f5f9/94a3b8?text=P'">
                <div class="space-y-0.5 min-w-0">
                    <h4 class="text-xs font-bold text-slate-700 truncate">${p.name}</h4>
                    <p class="text-[9px] font-mono text-slate-500">SKU: ${p.sku}</p>
                    <p class="text-[10px] font-black text-rose-600">Sisa Stok: ${p.stock} pcs</p>
                </div>
            </div>
            <button type="button" onclick="triggerRestockFromAlert(${originalIndex})" class="shrink-0 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-colors border border-emerald-200/60 shadow-xs">
                <i class="fa-solid fa-box-open"></i> Restock
            </button>
        `;
        container.appendChild(itemDiv);
    });
}

/**
 * FUNGSI JEMBATAN ANTAR FILE (laporan.js -> inventory.js)
 */
function triggerRestockFromAlert(originalIndex) {
    closeLowStockModal(); // Tutup modal alert merah
    
    if (typeof openRestockModal === 'function') {
        openRestockModal(originalIndex); // Buka modal restock hijau
    } else {
        showToast("Sistem mendeteksi fungsi restock belum termuat.", "error");
    }
}

// ==========================================
// RENDER RIWAYAT TRANSAKSI (VERSI ANTI-BADAI)
// ==========================================
function renderHistory() {
    const tbody = document.getElementById('history-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // 1. Cek Keamanan
    if (!state.transactions || !Array.isArray(state.transactions) || state.transactions.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-semibold text-xs">Belum ada riwayat transaksi yang ditarik dari Cloud.</td></tr>`; 
        return; 
    }
    
    // 2. Render dengan Try-Catch
    try {
        state.transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/50 transition-colors";
            
            const inv = tx.invoice || tx.Invoice || '-';
            const date = tx.datetime || tx.Waktu || '-';
            const total = parseFloat(tx.total || tx.Total || 0);
            const paid = parseFloat(tx.cashPaid || tx.Bayar || 0);
            const change = parseFloat(tx.change || tx.Kembalian || 0);

            tr.innerHTML = `
                <td class="p-4 font-mono font-semibold text-xs text-brand-600">${inv}</td>
                <td class="p-4 text-xs font-bold text-slate-500">${date}</td>
                <td class="p-4 text-right font-black text-slate-700">${formatRupiah(total)}</td>
                <td class="p-4 text-right font-semibold text-slate-500">${formatRupiah(paid)}</td>
                <td class="p-4 text-right font-semibold text-slate-500">${formatRupiah(change)}</td>
                <td class="p-4 text-center">
                    <button onclick='reprintTx("${inv}")' class="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded-lg text-xs font-semibold text-slate-600 transition-colors">
                        <i class="fa-solid fa-eye"></i> Struk
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Crash saat render riwayat:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-500 font-semibold text-xs">Terjadi kesalahan membaca format data.</td></tr>`;
    }
}

function reprintTx(invoiceId) {
    const tx = state.transactions.find(t => (t.invoice || t.Invoice) === invoiceId);
    if(tx) { 
        if(typeof openReceiptModal === 'function') {
            openReceiptModal(tx); 
        } else {
            showToast("Sistem struk sedang dimuat...", "info");
        }
    }
}

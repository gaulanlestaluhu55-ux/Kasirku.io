/**
 * ================================================================= -->
 * === FILE: js/kasir.js (LOGIKA KATALOG, KERANJANG & CHECKOUT) ===== -->
 * === LOKASI: Folder /js/ di dalam Repositori Github Pages ======= -->
 * ================================================================= -->
 */

let currentGrandTotal = 0;

// ==========================================
// 1. PENGATUR FILTER KATALOG PRODUK
// ==========================================
function filterCategory(category) {
    state.currentCategory = category;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.className = (btn.innerText === category) 
            ? "cat-btn shrink-0 px-5 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-brand-600 to-emerald-500 text-white shadow-md"
            : "cat-btn shrink-0 px-5 py-2 rounded-xl text-xs font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200/80";
    });
    renderPOSProducts();
}

function filterPOSProducts() {
    state.currentSearchQuery = document.getElementById('search-pos').value.toLowerCase();
    renderPOSProducts();
}

// ==========================================
// 2. RENDER KATALOG UTAMA (MODE POS)
// ==========================================
function renderPOSProducts() {
    const grid = document.getElementById('pos-product-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const filtered = state.products.filter(p => {
        const mc = state.currentCategory === 'Semua' || p.category === state.currentCategory;
        const ms = p.name.toLowerCase().includes(state.currentSearchQuery) || p.sku.includes(state.currentSearchQuery);
        return mc && ms;
    });

    if(filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 flex flex-col items-center text-slate-400 bg-white rounded-3xl p-8 border border-dashed border-slate-200"><i class="fa-solid fa-box-open text-4xl mb-3 text-slate-300"></i><p class="font-bold text-sm text-slate-700">Produk Tidak Ditemukan</p></div>`;
        return;
    }

    filtered.forEach(p => {
        const isOutOfStock = p.stock <= 0;
        const card = document.createElement('div');
        card.className = `bg-gradient-to-b from-brand-50/40 via-white to-white p-3.5 rounded-3xl border border-brand-100/70 shadow-xs hover:shadow-lg hover:border-brand-400 transition-all duration-300 group ${isOutOfStock ? 'opacity-65' : ''}`;
        card.innerHTML = `
            <div class="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 mb-3">
                <img src="${p.image}" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/150x150/f1f5f9/94a3b8?text=Produk'">
                ${isOutOfStock ? '<span class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-xs">Stok Habis</span>' : ''}
            </div>
            <div class="space-y-1 mb-3">
                <div class="flex justify-between items-center">
                    <span class="text-[9px] font-mono font-bold bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">${p.sku}</span>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">${p.category}</span>
                </div>
                <h4 class="text-xs font-bold text-slate-700 line-clamp-2 h-8 leading-tight pt-1">${p.name}</h4>
                <p class="text-xs font-black text-brand-600">${formatRupiah(p.price)}</p>
            </div>
            <button onclick="addToCart('${p.sku}')" ${isOutOfStock ? 'disabled' : ''} class="w-full py-2.5 ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white'} rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
                <i class="fa-solid fa-cart-plus"></i> Tambahkan
            </button>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 3. OPERASI MANIPULASI ITEM KERANJANG
// ==========================================
function addToCart(sku) {
    const product = state.products.find(p => p.sku === sku);
    if (!product || product.stock <= 0) return;
    
    const existingCartItem = state.cart.find(item => item.sku === sku);
    if (existingCartItem) {
        if (existingCartItem.qty + 1 > product.stock) { 
            showToast('Stok barang di toko tidak mencukupi.', 'error'); 
            return; 
        }
        existingCartItem.qty += 1;
    } else {
        state.cart.push({ sku: product.sku, name: product.name, price: product.price, qty: 1 });
    }
    showToast(`${product.name} dimasukkan ke keranjang.`, 'success');
    renderCart();
}

function updateCartQty(sku, adjustment) {
    const item = state.cart.find(i => i.sku === sku);
    const product = state.products.find(p => p.sku === sku);
    if (item && product) {
        const newQty = item.qty + adjustment;
        if (newQty <= 0) {
            state.cart = state.cart.filter(i => i.sku !== sku);
        } else if (newQty > product.stock) {
            showToast(`Batas maksimal stok (${product.stock} pcs) tercapai.`, 'error');
        } else { 
            item.qty = newQty; 
        }
        renderCart();
    }
}

function clearCart() {
    if(state.cart.length === 0) return;
    state.cart = [];
    renderCart();
    showToast('Keranjang belanja dikosongkan.', 'info');
}

// ==========================================
// 4. RENDER ANTARMUKA KERANJANG (DESKTOP & MOBILE COUPLING)
// ==========================================
function renderCart() {
    const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-badge-mobile');
    if (badge) {
        if (totalQty > 0) { 
            badge.innerText = totalQty; 
            badge.classList.remove('hidden'); 
        } else { 
            badge.classList.add('hidden'); 
        }
    }

    const views = [
        { list: document.getElementById('cart-list-desktop'), empty: document.getElementById('empty-cart-view-desktop'), payBtn: document.getElementById('btn-pay-desktop'), subtotal: document.getElementById('cart-subtotal-desktop'), total: document.getElementById('cart-total-desktop') },
        { list: document.getElementById('cart-list-mobile'), empty: document.getElementById('empty-cart-view-mobile'), payBtn: document.getElementById('btn-pay-mobile'), subtotal: document.getElementById('cart-subtotal-mobile'), total: document.getElementById('cart-total-mobile') }
    ];

    views.forEach(view => {
        if (!view.list) return;
        view.list.innerHTML = '';
        
        if (state.cart.length === 0) {
            if (view.empty) view.empty.classList.remove('hidden');
            if (view.list) view.list.classList.add('hidden');
            view.payBtn.disabled = true; 
            view.payBtn.className = "col-span-2 w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-not-allowed";
            if (view.subtotal) view.subtotal.innerText = formatRupiah(0); 
            if (view.total) view.total.innerText = formatRupiah(0);
        } else {
            if (view.empty) view.empty.classList.add('hidden');
            if (view.list) view.list.classList.remove('hidden');
            view.payBtn.disabled = false; 
            view.payBtn.className = "col-span-2 w-full py-4 bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-700 hover:to-emerald-600 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 cursor-pointer";

            let subtotal = 0;
            state.cart.forEach(item => {
                subtotal += item.price * item.qty;
                const row = document.createElement('div');
                row.className = "bg-gradient-to-r from-brand-50/20 to-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center gap-3 shadow-xs";
                row.innerHTML = `
                    <div class="flex-1 space-y-0.5 text-left min-w-0">
                        <h5 class="text-xs font-bold text-slate-700 truncate">${item.name}</h5>
                        <p class="text-[9px] font-mono text-slate-400">SKU: ${item.sku}</p>
                    </div>
                    <div class="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-0.5 shrink-0">
                        <button onclick="updateCartQty('${item.sku}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-colors"><i class="fa-solid fa-minus text-[9px]"></i></button>
                        <span class="text-xs font-bold w-6 text-center text-slate-700">${item.qty}</span>
                        <button onclick="updateCartQty('${item.sku}', 1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-colors"><i class="fa-solid fa-plus text-[9px]"></i></button>
                    </div>
                    <div class="text-right min-w-[75px] shrink-0">
                        <p class="text-xs font-extrabold text-slate-700">${formatRupiah(item.price * item.qty)}</p>
                    </div>
                `;
                view.list.appendChild(row);
            });
            if (view.subtotal) view.subtotal.innerText = formatRupiah(subtotal); 
            if (view.total) view.total.innerText = formatRupiah(subtotal);
        }
    });
}

// ==========================================
// 5. MODAL PROSES PEMBAYARAN (CASHIER FLOW)
// ==========================================
function openPaymentModal() {
    if(state.cart.length === 0) return;
    currentGrandTotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('payment-total').innerText = formatRupiah(currentGrandTotal);
    document.getElementById('payment-cash-input').value = '';
    document.getElementById('payment-change').innerText = formatRupiah(0);
    
    const fcContainer = document.getElementById('fast-cash-container');
    fcContainer.innerHTML = '';
    const fastOptions = [currentGrandTotal];
    [10000, 20000, 50000, 100000].forEach(denom => {
        if (denom > currentGrandTotal) {
            const r = Math.ceil(currentGrandTotal / denom) * denom;
            if(!fastOptions.includes(r)) fastOptions.push(r);
        }
    });
    
    fastOptions.sort((a,b) => a - b).slice(0, 3).forEach(opt => {
        const btn = document.createElement('button');
        btn.onclick = () => { document.getElementById('payment-cash-input').value = opt; calculateChange(); };
        btn.className = "p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold hover:bg-brand-50 text-slate-600 transition-colors";
        btn.innerText = opt === currentGrandTotal ? 'Uang Pas' : formatRupiah(opt);
        fcContainer.appendChild(btn);
    });
    document.getElementById('modal-payment').classList.remove('hidden');
}

function closePaymentModal() { 
    document.getElementById('modal-payment').classList.add('hidden'); 
}

function calculateChange() {
    const inputVal = parseFloat(document.getElementById('payment-cash-input').value) || 0;
    const change = inputVal - currentGrandTotal;
    const changeEl = document.getElementById('payment-change');
    const submitBtn = document.getElementById('btn-submit-payment');

    if(change >= 0) {
        changeEl.innerText = formatRupiah(change); 
        changeEl.className = "text-lg font-black text-brand-600";
        submitBtn.disabled = false; 
        submitBtn.className = "w-full py-3.5 bg-gradient-to-r from-brand-600 to-emerald-500 text-white rounded-2xl font-black shadow-lg cursor-pointer transition-all";
    } else {
        changeEl.innerText = 'Uang kurang'; 
        changeEl.className = "text-sm font-bold text-rose-500";
        submitBtn.disabled = true; 
        submitBtn.className = "w-full py-3.5 bg-slate-100 text-slate-400 rounded-2xl font-black cursor-not-allowed transition-all";
    }
}

// ==========================================
// 6. EKSEKUSI TRIGER CHECKOUT (LOCAL VS CLOUD GATEWAY)
// ==========================================
function processCheckout() {
    const inputCash = parseFloat(document.getElementById('payment-cash-input').value) || 0;
    const change = inputCash - currentGrandTotal;
    if(change < 0) return;

    const invoiceId = 'INV' + new Date().getTime().toString().slice(-10).toUpperCase();
    const datetimeStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

    const txRecord = { 
        invoice: invoiceId, 
        datetime: datetimeStr, 
        total: currentGrandTotal, 
        cashPaid: inputCash, 
        change: change, 
        items: state.cart.map(i => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price })) 
    };

    const completeLocalCheckout = () => {
        state.cart.forEach(cartItem => {
            const p = state.products.find(prod => prod.sku === cartItem.sku);
            if (p) p.stock = Math.max(0, p.stock - cartItem.qty);
        });
        state.transactions.unshift(txRecord);
        saveToLocalCache();
        closePaymentModal();
        state.cart = [];
        renderCart();
        renderPOSProducts();
        if(typeof renderInventory === 'function') renderInventory();
        if(typeof renderHistory === 'function') renderHistory();
        if(typeof updateDashboardStats === 'function') updateDashboardStats();
        openReceiptModal(txRecord);
    };

    if (isCloudMode) {
        toggleLoadingOverlay(true);
        // REFORMED: Mengganti google.script.run lama ke fetch API terpadu whitelabel
        callBackendAPI("processTransaction", { data: JSON.stringify(txRecord) }).then(res => {
            toggleLoadingOverlay(false);
            if (res && res.status === "success") {
                completeLocalCheckout();
                showToast('Transaksi Berhasil Disimpan ke Cloud Sheets!', 'success');
            } else {
                showToast('Gagal mengunci transaksi ke Cloud Server.', 'error');
            }
        }).catch(err => {
            toggleLoadingOverlay(false);
            showToast('Koneksi terputus! Gagal menghubungi Cloud.', 'error');
        });
    } else {
        completeLocalCheckout();
        showToast('Transaksi Lokal Berhasil!', 'success');
    }
}

// ==========================================
// 7. STRUK RECEIPT GENERATOR
// ==========================================
function openReceiptModal(tx) {
    document.getElementById('receipt-inv-id').innerText = tx.invoice;
    document.getElementById('receipt-time').innerText = tx.datetime;
    const list = document.getElementById('receipt-items-list');
    list.innerHTML = '';
    
    tx.items.forEach(item => {
        const r = document.createElement('div');
        r.className = "flex justify-between text-[11px]";
        r.innerHTML = `<div><p class="font-bold text-left">${item.name}</p><p class="text-slate-400 text-[9px] text-left">${item.qty} x ${formatRupiah(item.price)}</p></div><span class="shrink-0 pt-1">${formatRupiah(item.price * item.qty)}</span>`;
        list.appendChild(r);
    });
    document.getElementById('receipt-subtotal').innerText = formatRupiah(tx.total);
    document.getElementById('receipt-total').innerText = formatRupiah(tx.total);
    document.getElementById('receipt-cash').innerText = formatRupiah(tx.cashPaid);
    document.getElementById('receipt-change').innerText = formatRupiah(tx.change);
    document.getElementById('modal-receipt').classList.remove('hidden');
}

function closeReceiptModal() { 
    document.getElementById('modal-receipt').classList.add('hidden'); 
}

function printReceipt() { 
    window.print(); 
}

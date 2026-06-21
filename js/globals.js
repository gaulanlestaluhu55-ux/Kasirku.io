/**
 * ================================================================= -->
 * === FILE: js/globals.js (STATE & API ROUTER) ==================== -->
 * ================================================================= -->
 */

// Data State Global POS
let state = {
    products: [],
    cart: [],
    transactions: [],
    currentCategory: 'Semua',
    currentSearchQuery: ''
};

let isCloudMode = false;
let CLOUD_API_URL = ""; 

// ==========================================
// 1. MESIN UTAMA REST API (PENGGANTI google.script.run)
// ==========================================
async function callBackendAPI(action, params = {}) {
    const baseUrl = localStorage.getItem('kasirku_api_url');
    if (!baseUrl) return null;

    // Susun parameter URL
    let url = `${baseUrl}?action=${action}`;
    Object.keys(params).forEach(key => {
        url += `&${key}=${encodeURIComponent(params[key])}`;
    });

    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error(`API Error pada aksi ${action}:`, error);
        return null;
    }
}

// ==========================================
// 2. INISIALISASI & DETEKSI LINGKUNGAN SAAS
// ==========================================
function checkAppEnvironment() {
    // Tangkap parameter ?api= dari URL (Jika buka via tombol di Google Sheets)
    const urlParams = new URLSearchParams(window.location.search);
    const detectedApi = urlParams.get('api');
    
    if (detectedApi) {
        localStorage.setItem('kasirku_api_url', detectedApi);
        // Bersihkan URL bar agar terlihat profesional (tanpa parameter panjang)
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedApi = localStorage.getItem('kasirku_api_url');
    if (savedApi && savedApi.startsWith('https://script.google.com')) {
        CLOUD_API_URL = savedApi;
        isCloudMode = true;
        updateEnvironmentStatus(true);
        fetchCloudData(); // Tarik data dari Cloud
    } else {
        isCloudMode = false;
        updateEnvironmentStatus(false);
        loadCacheOrInitialize(); // Tarik data dari Cache lokal
        
        // Tampilkan modal setup wajib karena API belum dikonfigurasi
        setTimeout(openSetupModal, 1000);
    }
}

async function fetchCloudData() {
    toggleLoadingOverlay(true);
    const data = await callBackendAPI("getInitialData");
    toggleLoadingOverlay(false);
    
    if (data) {
        if (data.products) state.products = data.products;
        if (data.transactions) state.transactions = data.transactions;
        
        // --- WHITELABEL UI UPDATE OTOMATIS ---
        if (data.storeName) {
            const titleEl = document.getElementById('store-title');
            const subTitleEl = document.getElementById('store-sub-title');
            const receiptNameEl = document.getElementById('receipt-store-name');
            const receiptAddressEl = document.getElementById('receipt-store-address');
            
            if(titleEl) titleEl.innerText = data.storeName;
            if(subTitleEl) subTitleEl.innerText = data.storeAddress || "KasirKu POS Modern";
            if(receiptNameEl) receiptNameEl.innerText = (data.storeName).toUpperCase();
            if(receiptAddressEl) receiptAddressEl.innerText = data.storeAddress || "";
        }

        saveToLocalCache();
        
        // Panggil fungsi render jika sudah dimuat (dari file js lain)
        if(typeof renderPOSProducts === 'function') renderPOSProducts();
        if(typeof renderInventory === 'function') renderInventory();
        if(typeof renderHistory === 'function') renderHistory();
        if(typeof updateDashboardStats === 'function') updateDashboardStats();
        
        showToast("Sinkronisasi database awan berhasil!", "success");
    } else {
        showToast("Gagal terhubung ke database. Masuk mode luring (offline).", "error");
        loadCacheOrInitialize();
    }
}

// ==========================================
// 3. FUNGSI KONTROL SETUP WHITELABEL API
// ==========================================
function openSetupModal() {
    const modal = document.getElementById('modal-setup-guide');
    if(modal) modal.classList.remove('hidden');
    
    const savedApi = localStorage.getItem('kasirku_api_url');
    const btnClose = document.getElementById('btn-close-setup');
    const inputUrl = document.getElementById('input-user-api-url');
    
    if (savedApi) {
        if(inputUrl) inputUrl.value = savedApi;
        if(btnClose) btnClose.classList.remove('hidden'); // Boleh ditutup karena sudah ada API
    } else {
        if(btnClose) btnClose.classList.add('hidden'); // Wajib isi, gak boleh ditutup
    }
}

function closeSetupModal() {
    if (localStorage.getItem('kasirku_api_url')) {
        document.getElementById('modal-setup-guide').classList.add('hidden');
    } else {
        showToast("Anda harus memasukkan URL API untuk menggunakan aplikasi!", "error");
    }
}

function saveUserConfiguration(newUrl) {
    if(!newUrl || newUrl.trim() === "") {
        localStorage.removeItem('kasirku_api_url');
    } else {
        localStorage.setItem('kasirku_api_url', newUrl.trim());
    }
    // Refresh halaman untuk memuat ulang status Cloud
    window.location.reload();
}

// ==========================================
// 4. UTILITAS & FUNGSI GLOBAL UI
// ==========================================
function initClock() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    setInterval(() => {
        const now = new Date();
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        
        if (timeEl) timeEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        if (dateEl) dateEl.innerText = `${days[now.getDay()]} , ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }, 1000);
}

function updateEnvironmentStatus(activeCloud) {
    const badge = document.getElementById('connection-badge');
    const mobileText = document.getElementById('mobile-connection-text');
    if(activeCloud) {
        if (badge) badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span class="text-xs font-bold font-mono text-emerald-100">Cloud Mode</span>`;
        if (mobileText) mobileText.innerText = "Mode Cloud";
    } else {
        if (badge) badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span class="text-xs font-bold font-mono text-amber-100">Local Mode</span>`;
        if (mobileText) mobileText.innerText = "Mode Lokal";
    }
}

function loadCacheOrInitialize() {
    const cp = localStorage.getItem('kasirku_products');
    const ct = localStorage.getItem('kasirku_transactions');
    if (cp) state.products = JSON.parse(cp);
    if (ct) state.transactions = JSON.parse(ct);
}

function saveToLocalCache() {
    localStorage.setItem('kasirku_products', JSON.stringify(state.products));
    localStorage.setItem('kasirku_transactions', JSON.stringify(state.transactions));
}

function toggleLoadingOverlay(show) {
    const el = document.getElementById('cloud-loading');
    if (el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

function formatRupiah(num) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
        error: 'bg-gradient-to-r from-rose-500 to-red-600 text-white',
        info: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white'
    };
    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };

    toast.className = `flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold ${colors[type]} transition-all transform translate-y-2 opacity-0 duration-300 z-50`;
    toast.innerHTML = `${icons[type]} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function switchTab(tabId) {
    document.querySelectorAll("section[id^='page-']").forEach(el => {     el.classList.add('hidden'); });
    const targetPage = document.getElementById(`page-${tabId}`);
    if (targetPage) targetPage.classList.remove('hidden');

    // Update Desktop Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.tab === tabId) {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all bg-gradient-to-r from-brand-600 to-emerald-500 text-white shadow-md shadow-brand-500/20";
        } else {
            btn.className = "nav-btn w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800";
        }
    });

    // Update Mobile Nav
    document.querySelectorAll('[data-mobile-tab]').forEach(btn => {
        const label = btn.querySelector('.tab-label');
        if(btn.dataset.mobileTab === tabId) {
            btn.className = "flex flex-col items-center justify-center text-white gap-1.5 relative";
            if (label) label.className = "tab-label text-[10px] font-bold";
        } else {
            btn.className = "flex flex-col items-center justify-center text-emerald-300/85 gap-1.5 relative";
            if (label) label.className = "tab-label text-[10px] font-medium";
        }
    });

    if (tabId === 'laporan' && typeof updateDashboardStats === 'function') updateDashboardStats();
}

// ==========================================
// 5. FITUR MAINTENANCE STORAGE LOKAL (OPSIONAL)
// ==========================================
function clearAllLocalProductImages() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kasirku_img_')) {
            localStorage.removeItem(key);
        }
    });
    showToast("Semua cache gambar lokal berhasil dibersihkan!", "info");
    window.location.reload();
}

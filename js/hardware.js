        let barcodeBufferString = "";
        let barcodeBufferTimeout = null;
        let activeBufferProduct = null;
        let activeInstascanCamera = null;
        let skuInstascanCamera = null;

        // UPGRADED: Logika Polling Nirkabel HP Scanner
        let wirelessSessionId = "";
        let wirelessPollingInterval = null;

        function handleHardwareScanner(event) {
            if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'search-pos') return;
            if (barcodeBufferTimeout) clearTimeout(barcodeBufferTimeout);
            if (event.key === 'Enter') {
                if (barcodeBufferString.length >= 4) {
                    processScannedBarcode(barcodeBufferString.trim());
                }
                barcodeBufferString = "";
            } else {
                if (event.key.length === 1) {
                    barcodeBufferString += event.key;
                }
            }
            barcodeBufferTimeout = setTimeout(() => { barcodeBufferString = ""; }, 200);
        }

        // --- UPDATE BARU: DETEKSI KAMERA CERDAS ---
        function startMobileCameraScanner() {
            document.getElementById('popup-camera-viewfinder').classList.remove('hidden');
            openScanBufferModalPlaceholder();
            
            // Cek ketersediaan kamera di perangkat (Laptop / HP)
            Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length) {
                    // Pakai kamera pertama yang ditemukan (biasanya webcam untuk laptop)
                    let cameraId = devices[0].id;
                    
                    // Coba cari kamera belakang kalau pakai HP
                    for(let i = 0; i < devices.length; i++) {
                        if(devices[i].label.toLowerCase().includes('back') || devices[i].label.toLowerCase().includes('belakang') || devices[i].label.toLowerCase().includes('environment')) {
                            cameraId = devices[i].id; 
                            break;
                        }
                    }

                    activeInstascanCamera = new Html5Qrcode("preview-scanner-camera");
                    activeInstascanCamera.start(
                        cameraId,
                        { fps: 15, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            playVirtualBeep(); 
                            processScannedBarcode(decodedText.trim());
                        },
                        (errorMessage) => { /* Abaikan error background */ }
                    ).catch((err) => {
                        showToast("Gagal memulai kamera. Pastikan izin diberikan.", "error");
                    });
                } else {
                    showToast("Tidak ada kamera terdeteksi di perangkat ini.", "error");
                }
            }).catch(err => {
                showToast("Izin akses kamera ditolak oleh browser.", "error");
            });
        }

        function stopMobileCameraScanner() {
            try {
                if (activeInstascanCamera) {
                    activeInstascanCamera.stop().then(() => {
                        activeInstascanCamera.clear();
                        activeInstascanCamera = null;
                    }).catch(err => {
                        activeInstascanCamera.clear();
                        activeInstascanCamera = null;
                    });
                }
            } catch(e) { console.log(e); }
            document.getElementById('popup-camera-viewfinder').classList.add('hidden');
        }

        function playVirtualBeep() {
            try {
                let context = new (window.AudioContext || window.webkitAudioContext)();
                let osc = context.createOscillator();
                osc.type = "sine"; osc.frequency.value = 1200;
                osc.connect(context.destination); osc.start();
                setTimeout(() => osc.stop(), 100);
            } catch(e) {}
        }

        function processScannedBarcode(barcode) {
    // FIX: Ganti AppState menjadi state
    const foundProduct = state.products.find(p => String(p.sku) === String(barcode));
    
    if (!foundProduct) { showToast(`Barcode [${barcode}] tidak terdaftar di Toko!`, "error"); return; }
    activeBufferProduct = foundProduct;
    document.getElementById('buffer-product-image').src = foundProduct.image;
    document.getElementById('buffer-product-sku').innerText = foundProduct.sku;
    document.getElementById('buffer-product-name').innerText = foundProduct.name;
    document.getElementById('buffer-product-category').innerText = foundProduct.category;
    document.getElementById('buffer-product-price').innerText = formatRupiah(foundProduct.price);
    document.getElementById('buffer-stock-store').innerText = `${foundProduct.stock} pcs`;
    
    const existingInCart = state.cart.find(item => item.sku === foundProduct.sku);
    const cartQty = existingInCart ? existingInCart.qty : 0;
    
    document.getElementById('buffer-stock-cart').innerText = `${cartQty} pcs`;
    document.getElementById('buffer-qty-input').value = 1;
    document.getElementById('modal-scan-buffer').classList.remove('hidden');
    validateBufferQtyInput();
}
        function openScanBufferModalPlaceholder() {
            document.getElementById('buffer-product-image').src = "https://placehold.co/150x150/f1f5f9/94a3b8?text=Scan...";
            document.getElementById('buffer-product-sku').innerText = "-----";
            document.getElementById('buffer-product-name').innerText = "Membidik Barcode Produk...";
            document.getElementById('buffer-product-price').innerText = "Rp 0";
            document.getElementById('modal-scan-buffer').classList.remove('hidden');
        }

        function closeScanBufferModal() {
            // FIX: Tutup modal duluan biar tombol "Batal" kebal dari error kamera!
            document.getElementById('modal-scan-buffer').classList.add('hidden'); 
            activeBufferProduct = null;
            stopMobileCameraScanner();
        }

        function adjustBufferQty(amount) {
            if (!activeBufferProduct) return;
            const input = document.getElementById('buffer-qty-input');
            let current = parseInt(input.value) || 1;
            input.value = Math.max(1, current + amount);
            validateBufferQtyInput();
        }

        function validateBufferQtyInput() {
            if (!activeBufferProduct) return;
            const input = document.getElementById('buffer-qty-input');
            let val = parseInt(input.value) || 1;
            if(val < 1) { val = 1; input.value = 1; }
            const existingInCart = state.cart.find(item => item.sku === activeBufferProduct.sku);
            const currentCartQty = existingInCart ? existingInCart.qty : 0;
            const maxAllowedToInput = activeBufferProduct.stock - currentCartQty;
            const btnPlus = document.getElementById('btn-buffer-qty-plus');
            if (val >= maxAllowedToInput) {
                input.value = Math.max(1, maxAllowedToInput);
                if(btnPlus) btnPlus.setAttribute('disabled', 'true');
                if(maxAllowedToInput <= 0) { showToast("Seluruh stok produk ini sudah berada di keranjang kasir.", "error"); }
            } else {
                if(btnPlus) btnPlus.removeAttribute('disabled');
            }
        }

        function submitBufferItem() {
            if (!activeBufferProduct) return;
            const inputQty = parseInt(document.getElementById('buffer-qty-input').value) || 0;
            if (inputQty <= 0) return;
            const existingCartItem = state.cart.find(item => item.sku === activeBufferProduct.sku);
            const alreadyInCartQty = existingCartItem ? existingCartItem.qty : 0;
            if (alreadyInCartQty + inputQty > activeBufferProduct.stock) {
                showToast("Gagal input: Batas jumlah akumulasi melebihi stok toko!", "error"); return;
            }
            if (existingCartItem) { existingCartItem.qty += inputQty; } else {
                state.cart.push({ sku: activeBufferProduct.sku, name: activeBufferProduct.name, price: activeBufferProduct.price, qty: inputQty });
            }
            showToast(`${activeBufferProduct.name} (${inputQty} pcs) masuk kasir.`, "success");
            renderCart(); closeScanBufferModal();
        }

        // UPGRADED: FUNGSI NIRKABEL HP SCANNER PAIRING & POLLING LOGIC
        function openWirelessScannerModal() {
    if (!wirelessSessionId) {
        // Buat Session ID unik bertipe 6 digit teks acak
        wirelessSessionId = "KSR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    document.getElementById('scanner-session-id').innerText = wirelessSessionId;

    // --- KUNCI MATI KE LINK GITHUB LO BRO! ---
    const githubScannerUrl = "https://gaulanlestaluhu55-ux.github.io/Kasirku.io/scanner.html";

    const buildQrCode = (userApiUrl) => {
        // Rakit URL sakti: GitHub URL + API Parameter + Session ID
        let pairingUrl = `${githubScannerUrl}?api=${encodeURIComponent(userApiUrl)}&session=${encodeURIComponent(wirelessSessionId)}`;
        
        // Generate QR Code
        let qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(pairingUrl);
        document.getElementById('scanner-qr-container').innerHTML = `<img src="${qrUrl}" class="w-44 h-44 object-contain mx-auto" alt="QR Link Pairing">`;
    };

    if (isCloudMode) {
        const savedApi = localStorage.getItem('kasirku_api_url');
        if (savedApi) {
            buildQrCode(savedApi);
        } else {
            showToast("Gagal membaca konfigurasi API awan.", "error");
        }
    } else {
        // Mode simulasi/lokal untuk uji coba antarmuka
        buildQrCode("https://script.google.com/macros/s/SIMULASI/exec");
    }

    document.getElementById('modal-wireless-scanner').classList.remove('hidden');
    startWirelessPolling();
}

        function closeWirelessScannerModal() {
            document.getElementById('modal-wireless-scanner').classList.add('hidden');
            stopWirelessPolling();
        }

        function startWirelessPolling() {
    if (wirelessPollingInterval) clearInterval(wirelessPollingInterval);

    document.getElementById('scanner-sync-status').innerHTML =
        `<i class="fa-solid fa-wifi animate-pulse text-brand-600 mr-1.5"></i> Menunggu HP terhubung...`;

    // Polling REST API setiap 1.5 detik
    wirelessPollingInterval = setInterval(async () => {
        if (!isCloudMode) {
            // MODE DEMO LOKAL
            if (Math.random() > 0.90) {
                const randomProduct = state.products[Math.floor(Math.random() * state.products.length)];
                playVirtualBeep();
                processScannedBarcode(randomProduct.sku);

                document.getElementById('scanner-sync-status').innerHTML =
                    `<span class="text-brand-600 font-bold">
                        <i class="fa-solid fa-circle-check"></i> Terbaca! Terakhir: ${randomProduct.sku}
                    </span>`;
            }
            return;
        }

        try {
            const res = await callBackendAPI("pollCache", {
                session: wirelessSessionId
            });

            if (res && res.sku) {
                playVirtualBeep();
                processScannedBarcode(res.sku);

                document.getElementById('scanner-sync-status').innerHTML =
                    `<span class="text-brand-600 font-bold">
                        <i class="fa-solid fa-circle-check"></i> Terbaca! Terakhir: ${res.sku}
                    </span>`;
            }
        } catch (err) {
            console.error("Wireless polling error:", err);
        }

    }, 1500);
}

function stopWirelessPolling() {
    if (wirelessPollingInterval) {
        clearInterval(wirelessPollingInterval);
        wirelessPollingInterval = null;
    }
}

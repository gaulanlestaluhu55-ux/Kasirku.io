window.addEventListener('DOMContentLoaded', () => {
            initClock();
            checkAppEnvironment();
            loadCacheOrInitialize();
            renderPOSProducts();
            renderInventory();
            renderHistory();
            updateDashboardStats();
            renderCart();

            const skuInput = document.getElementById('form-product-sku');
            if (skuInput) {
                skuInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('form-product-category').focus();
                    }
                });
            }
        });

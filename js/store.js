/* --- CONSTANTES --- */
const STORAGE_KEYS = {
    PRODUCTS: 'vm_products',
    CART: 'vm_cart',
    ADMIN_LOGGED: 'vm_admin_logged',
    CATEGORIES: 'vm_categories',
    COUPONS: 'vm_coupons',
    STATS: 'vm_stats',
    SETTINGS: 'vm_settings' 
};

const initialProducts = [
    { id: 1, name: 'Camisa Branca Básica', price: 79.99, category: 'Masculino', sizes: ['P', 'M', 'G'], image: 'assets/placeholder.png', images: [], stock: 10, sold: 0, description: 'Algodão puro.' },
    { id: 2, name: 'Camisa Preta Premium', price: 89.99, category: 'Masculino', sizes: ['P', 'M', 'G', 'GG'], image: 'assets/placeholder.png', images: [], stock: 5, sold: 0, description: 'Estilo dark.' }
];

const initialCategories = ['Masculino', 'Feminino', 'Nike', 'Adidas', 'Promoções'];
const initialStats = { visits: 0, conversions: 0 };

export const store = {
    state: {
        products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || initialProducts,
        categories: JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || initialCategories,
        coupons: JSON.parse(localStorage.getItem(STORAGE_KEYS.COUPONS)) || [],
        stats: JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)) || initialStats,
        cart: JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [],
        isAdmin: localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED) === 'true',
        activeCoupon: null,
        settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || { allowNegativeStock: false }
    },

    // --- CONFIGURAÇÕES ---
    toggleNegativeStock() {
        if (!this.state.settings) this.state.settings = { allowNegativeStock: false };
        this.state.settings.allowNegativeStock = !this.state.settings.allowNegativeStock;
        this._persist(STORAGE_KEYS.SETTINGS, this.state.settings);
        return this.state.settings.allowNegativeStock;
    },

    // --- PRODUTOS ---
    getProducts(category = null) {
        if (!category || category === 'Todos') return this.state.products;
        return this.state.products.filter(p => p.category === category);
    },
    
    getProductById(id) { return this.state.products.find(p => p.id == id); },

    saveProduct(product) {
        product.price = parseFloat(product.price) || 0;
        product.stock = parseInt(product.stock) || 0;
        if(product.sold === undefined) product.sold = 0;

        if (!Array.isArray(product.images)) product.images = [];
        if (product.images.length > 0) product.image = product.images[0];
        else if (product.image) product.images = [product.image];

        if (product.id) {
            const index = this.state.products.findIndex(p => p.id == product.id);
            if (index !== -1) {
                product.sold = this.state.products[index].sold || 0;
                this.state.products[index] = product;
            }
        } else {
            product.id = Date.now();
            this.state.products.push(product);
        }
        this._persist(STORAGE_KEYS.PRODUCTS, this.state.products);
    },

    deleteProduct(id) {
        this.state.products = this.state.products.filter(p => p.id != id);
        this._persist(STORAGE_KEYS.PRODUCTS, this.state.products);
    },

    decreaseStock(cartItems) {
        const allowNegative = this.state.settings && this.state.settings.allowNegativeStock;
        cartItems.forEach(item => {
            const product = this.state.products.find(p => p.id == item.id);
            if (product) {
                if (allowNegative) product.stock = product.stock - item.qty;
                else product.stock = Math.max(0, product.stock - item.qty);
                product.sold = (product.sold || 0) + item.qty;
            }
        });
        this._persist(STORAGE_KEYS.PRODUCTS, this.state.products);
    },

    getInventoryValue() {
        return this.state.products.reduce((acc, p) => acc + (Number(p.price) * Number(p.stock)), 0);
    },

    // --- CATEGORIAS & CUPONS ---
    addCategory(name) { if (!this.state.categories.includes(name)) { this.state.categories.push(name); this._persist(STORAGE_KEYS.CATEGORIES, this.state.categories); } },
    deleteCategory(name) { this.state.categories = this.state.categories.filter(c => c !== name); this._persist(STORAGE_KEYS.CATEGORIES, this.state.categories); },
    addCoupon(code, discount) { this.state.coupons.push({ code: code.toUpperCase(), discount: parseInt(discount) }); this._persist(STORAGE_KEYS.COUPONS, this.state.coupons); },
    deleteCoupon(code) { this.state.coupons = this.state.coupons.filter(c => c.code !== code); this._persist(STORAGE_KEYS.COUPONS, this.state.coupons); },
    
    applyCoupon(code) { 
        const c = this.state.coupons.find(i => i.code === code.toUpperCase()); 
        if (c) { this.state.activeCoupon = c; return { success: true }; } 
        return { success: false }; 
    },
    
    // CORREÇÃO: Função para remover o cupom ativo
    removeActiveCoupon() {
        this.state.activeCoupon = null;
    },

    // --- OUTROS ---
    logVisit() { if (!sessionStorage.getItem('visited')) { this.state.stats.visits++; this._persist(STORAGE_KEYS.STATS, this.state.stats); sessionStorage.setItem('visited', 'true'); } },
    logConversion() { this.state.stats.conversions++; this._persist(STORAGE_KEYS.STATS, this.state.stats); },
    login(password) { if (password === 'admin123') { this.state.isAdmin = true; localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED, 'true'); return true; } return false; },
    logout() { this.state.isAdmin = false; localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED); },

     // --- Carrinho (LÓGICA UNIFICADA) ---
    addToCart(product, size, qty = 1) {
        const stock = parseInt(product.stock);
        const quantity = parseInt(qty) || 1;

        // Garante que settings existe
        const settings = this.state.settings || { allowNegativeStock: false };

        // 1. Verificação Inicial de Estoque
        // Só bloqueia SE a configuração de estoque negativo estiver DESATIVADA
        if (!settings.allowNegativeStock && stock < quantity) {
            alert(`Estoque insuficiente! Disponível: ${stock}`);
            return false;
        }

        const existing = this.state.cart.find(item => item.id == product.id && item.size === size);

        if (existing) {
            // 2. Verificação ao somar quantidade
            if (!settings.allowNegativeStock && (existing.qty + quantity > stock)) {
                alert(`Limite de estoque atingido! Você já tem ${existing.qty} no carrinho.`);
                return false;
            }
            existing.qty += quantity;
        } else {
            // Imagem
            let thumb = 'assets/placeholder.png';
            if (product.image) thumb = product.image;
            if (product.images && product.images.length > 0) thumb = product.images[0];

            this.state.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                stock: stock,
                image: thumb,
                size,
                qty: quantity
            });
        }

        this._persist(STORAGE_KEYS.CART, this.state.cart);
        window.dispatchEvent(new Event('cart-updated'));
        return true;
    },

    removeFromCart(index) {
        this.state.cart.splice(index, 1);
        this._persist(STORAGE_KEYS.CART, this.state.cart);
        if (this.state.cart.length === 0) this.state.activeCoupon = null;
        window.dispatchEvent(new Event('cart-updated'));
    },
    clearCart() {
        this.state.cart = [];
        this.state.activeCoupon = null;
        this._persist(STORAGE_KEYS.CART, this.state.cart);
        window.dispatchEvent(new Event('cart-updated'));
    },
    getCartTotal() {
        const subtotal = this.state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const discount = this.state.activeCoupon ? (subtotal * this.state.activeCoupon.discount / 100) : 0;
        return { subtotal, total: subtotal - discount, discount };
    },

    _persist(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
};
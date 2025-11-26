/* --- CONSTANTES --- */
const STORAGE_KEYS = {
    PRODUCTS: 'vm_products',
    CART: 'vm_cart',
    ADMIN_LOGGED: 'vm_admin_logged',
    CATEGORIES: 'vm_categories',
    COUPONS: 'vm_coupons',
    STATS: 'vm_stats',
    SETTINGS: 'vm_settings',
    ORDERS: 'vm_orders' 
};

const initialProducts = [
    { id: 1, name: 'Camisa Branca Básica', price: 79.99, category: 'Masculino', sizes: ['P', 'M', 'G'], image: 'assets/placeholder.png', images: [], stock: 10, sold: 0, description: 'Algodão puro.' },
    { id: 2, name: 'Camisa Preta Premium', price: 89.99, category: 'Masculino', sizes: ['P', 'M', 'G', 'GG'], image: 'assets/placeholder.png', images: [], stock: 5, sold: 0, description: 'Estilo dark.' }
];

const initialCategories = ['Masculino', 'Feminino', 'Nike', 'Adidas', 'Promoções'];
const initialStats = { visits: 0, conversions: 0 };
const initialSettings = { allowNegativeStock: false };
const initialOrders = [];

// Definição do Objeto Store
export const store = {
    // 1. Inicializa o estado com dados lidos do LocalStorage
    state: {
        products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)),
        categories: JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)),
        coupons: JSON.parse(localStorage.getItem(STORAGE_KEYS.COUPONS)),
        stats: JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)),
        cart: JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)),
        orders: JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)),
        isAdmin: localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED) === 'true',
        activeCoupon: null,
        settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS))
    },

    // 2. Função de inicialização forçada (executada uma vez)
    _initStore() {
        // Se products for null ou array vazio, usa initialProducts
        if (!this.state.products || this.state.products.length === 0) {
            this.state.products = initialProducts;
            this._persist(STORAGE_KEYS.PRODUCTS, initialProducts);
        }
        
        // Se categories for null ou array vazio, usa initialCategories
        if (!this.state.categories || this.state.categories.length === 0) {
            this.state.categories = initialCategories;
            this._persist(STORAGE_KEYS.CATEGORIES, initialCategories);
        }
        
        // Garante que os outros estados sejam inicializados e salvos se forem null
        if (!this.state.coupons) {
            this.state.coupons = [];
            this._persist(STORAGE_KEYS.COUPONS, []);
        }
        if (!this.state.stats) {
            this.state.stats = initialStats;
            this._persist(STORAGE_KEYS.STATS, initialStats);
        }
        if (!this.state.cart) {
            this.state.cart = [];
            this._persist(STORAGE_KEYS.CART, []);
        }
        // ADICIONADO: Inicializa Pedidos
        if (!this.state.orders) {
            this.state.orders = initialOrders;
            this._persist(STORAGE_KEYS.ORDERS, initialOrders);
        }
        if (!this.state.settings) {
            this.state.settings = initialSettings;
            this._persist(STORAGE_KEYS.SETTINGS, initialSettings);
        }
    },

    /* --- PEDIDOS (Gestão e Métricas) --- */
    
    createOrder(cartItems, total, discount, couponCode) {
        const newOrder = {
            id: Date.now(), 
            date: new Date().toLocaleString('pt-BR'),
            items: [...cartItems], 
            total: total,
            discount: discount,
            coupon: couponCode,
            status: 'pending' 
        };
        this.state.orders.unshift(newOrder); 
        this._persist(STORAGE_KEYS.ORDERS, this.state.orders);
        return newOrder.id;
    },

    approveOrder(orderId) {
        const order = this.state.orders.find(o => o.id === orderId);
        if (order && order.status === 'pending') {
            // Ação principal: Baixa o estoque e contabiliza a conversão AGORA
            this.decreaseStock(order.items);
            this.logConversion();
            
            order.status = 'approved';
            this._persist(STORAGE_KEYS.ORDERS, this.state.orders);
            return true;
        }
        return false;
    },

    rejectOrder(orderId) {
        const order = this.state.orders.find(o => o.id === orderId);
        // Pedidos pending podem ser rejeitados (sem estorno de estoque, pois nunca saiu)
        if (order && order.status === 'pending') {
            order.status = 'rejected';
            this._persist(STORAGE_KEYS.ORDERS, this.state.orders);
            return true;
        }
        return false;
    },
    
    // NOVO MÉTODO: Lógica de Estorno
    refundOrder(orderId) {
        const order = this.state.orders.find(o => o.id === orderId);
        
        if (!order || order.status !== 'approved') {
            console.error(`Pedido ${orderId} não encontrado ou não está aprovado.`);
            return false;
        }

        if (confirm(`Tem certeza que deseja ESTORNAR o pedido #${orderId.toString().slice(-4)}? Isso DEVOLVERÁ os itens ao estoque.`)) {
            // 1. Devolver o estoque e reverter o 'sold'
            order.items.forEach(item => {
                const product = this.state.products.find(p => p.id == item.id);
                if (product) {
                    product.stock = (product.stock || 0) + item.qty; // Adiciona de volta ao estoque
                    product.sold = Math.max(0, (product.sold || 0) - item.qty); // Diminui de vendidos
                }
            });
            
            // 2. Atualizar o status do pedido
            order.status = 'rejected'; 
            
            // 3. Persistir as alterações
            this._persist(STORAGE_KEYS.ORDERS, this.state.orders);
            this._persist(STORAGE_KEYS.PRODUCTS, this.state.products);
            
            // 4. Se houver conversões, diminui (opcional, mas bom para precisão)
            this.state.stats.conversions = Math.max(0, this.state.stats.conversions - 1);
            this._persist(STORAGE_KEYS.STATS, this.state.stats);
            
            return true;
        }
        return false;
    },

    getSalesTotals() {
        const approvedOrders = this.state.orders.filter(o => o.status === 'approved');
        
        // 1. Calcular a soma dos totais de todos os pedidos aprovados
        const totalSales = approvedOrders.reduce((acc, order) => acc + order.total, 0);
        
        // 2. Contar pedidos por status para o dashboard
        const totalApproved = approvedOrders.length;
        const totalPending = this.state.orders.filter(o => o.status === 'pending').length;

        // 3. Retornar um objeto de métricas
        return {
            totalSales: totalSales,
            totalApprovedOrders: totalApproved,
            totalPendingOrders: totalPending
        };
    },

    // --- CONFIGURAÇÕES ---
    toggleNegativeStock() {
        if (!this.state.settings) this.state.settings = initialSettings;
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
        // Lógica de imagem: Usa a primeira imagem se o array de imagens existir e não estiver vazios
        if (product.images.length > 0) product.image = product.images[0];
        // Lógica de fallback: Se `image` existir e `images` estiver vazio, usa `image`
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
    
    removeActiveCoupon() {
        this.state.activeCoupon = null;
    },

    // --- OUTROS ---
    logVisit() { if (!sessionStorage.getItem('visited')) { this.state.stats.visits++; this._persist(STORAGE_KEYS.STATS, this.state.stats); sessionStorage.setItem('visited', 'true'); } },
    logConversion() { this.state.stats.conversions++; this._persist(STORAGE_KEYS.STATS, this.state.stats); },
    // Renomeei para loginAdmin para evitar conflito com a função global
    loginAdmin(password) { if (password === 'admin123') { this.state.isAdmin = true; localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED, 'true'); return true; } return false; },
    logout() { this.state.isAdmin = false; localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED); },

    // --- Carrinho (LÓGICA UNIFICADA) ---
    addToCart(product, size, qty = 1) {
        const stock = parseInt(product.stock);
        const quantity = parseInt(qty) || 1;
        const settings = this.state.settings || initialSettings;

        if (!settings.allowNegativeStock && stock < quantity) {
            alert(`Estoque insuficiente! Disponível: ${stock}`);
            return false;
        }

        const existing = this.state.cart.find(item => item.id == product.id && item.size === size);

        if (existing) {
            if (!settings.allowNegativeStock && (existing.qty + quantity > stock)) {
                alert(`Limite de estoque atingido! Você já tem ${existing.qty} no carrinho.`);
                return false;
            }
            existing.qty += quantity;
        } else {
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
        const discountValue = this.state.activeCoupon?.discount || 0;
        const discount = this.state.activeCoupon ? (subtotal * discountValue / 100) : 0;
        return { subtotal, total: subtotal - discount, discount };
    },

    _persist(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
};

// 3. Executa a inicialização após definir o objeto 'store'
store._initStore();

// Expondo a função para o escopo global (assumindo que o Admin usa window.refundOrder)
window.refundOrder = (id) => {
    const success = store.refundOrder(id);
    // Assumindo que você tem uma forma de renderizar o Admin (e.g., Admin.render())
    if (success && window.Admin && window.Admin.render) {
        window.Admin.render();
    }
    return success;
};
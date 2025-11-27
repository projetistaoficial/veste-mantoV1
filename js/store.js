// Garante que o CLIENT_ID e o DB estão disponíveis (Definidos no index.html)
if (!window.CLIENT_ID || !window.db) {
    console.error("FIREBASE: CLIENT_ID ou DB não definido. Verifique a configuração no index.html.");
}

// Valores iniciais (Usados apenas para inicializar o DB na primeira vez)
const initialStats = { visits: 0, conversions: 0 };
const initialSettings = { adminPass: 'admin123', allowNegativeStock: false };

// Definição do Objeto Store
export const store = {
    // O estado agora é preenchido pelos listeners do Firestore (em tempo real)
    state: {
        isAdmin: false,
        products: [],
        orders: [],
        categories: [],
        coupons: [],
        storeInfo: { whatsapp: '', instagram: '', address: '' },
        settings: initialSettings,
        stats: initialStats,
        cart: JSON.parse(localStorage.getItem('vm_cart')) || [], // Carrinho ainda é local!
        activeCoupon: null,
    },

    // ----------------------------------------------------
    // FUNÇÕES DE ACESSO AO FIRESTORE (Database Layer)
    // ----------------------------------------------------

    // Cria a referência base para as coleções deste cliente (TENANT)
    getTenantRef(collectionName) {
        // Caminho: /tenants/{CLIENT_ID}/{collectionName}/
        return window.db.collection('tenants').doc(window.CLIENT_ID).collection(collectionName);
    },

    // Obtém a referência ao documento de Configurações do Tenant (Categorias, Cupons, Stats, Info)
    getSettingsRef() {
        return window.db.collection('tenants').doc(window.CLIENT_ID);
    },

    // Função de persistência local APENAS para o carrinho
    _persistLocal(key, data) {
        localStorage.setItem(key, JSON.stringify(data)); 
    },

    // ----------------------------------------------------
    // CORREÇÃO CRÍTICA: FUNÇÃO DE NOTIFICAÇÃO CENTRALIZADA
    // ----------------------------------------------------
    _notifyAdminUpdate() {
        if (this.state.isAdmin) {
            // Este evento é capturado pelo Admin.js para renderizar
            window.dispatchEvent(new Event('admin-data-updated'));
        }
        // Este é para a UI do cliente (sidebar/badge/home)
        if(window.fillSidebar) window.fillSidebar();
        if(window.location.hash === '#/') window.UI.renderHome(); // Força renderização da home
    },


    // ----------------------------------------------------
    // INICIALIZAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL
    // ----------------------------------------------------

    initializeRealtimeListeners() {
        console.log(`[STORE] Conectando ao CLIENTE: ${window.CLIENT_ID}`);
        
        // CORREÇÃO: Usar uma função genérica para notificar
        const notifyUpdate = () => { 
            this._notifyAdminUpdate(); 
            // O router() do app.js precisa ser chamado pelo menos uma vez 
            // após o carregamento dos dados para renderizar a página inicial (Home)
            if (window.router && !window._initialRenderDone) {
                 window.router();
                 window._initialRenderDone = true;
            }
        };

        // 1. Produtos (Inventário)
        this.getTenantRef('products').onSnapshot(snapshot => {
            this.state.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.state.products.sort((a, b) => a.name.localeCompare(b.name));
            notifyUpdate(); // Notifica o Admin e a UI
        }, error => console.error("Erro ao obter produtos:", error));

        // 2. Pedidos
        this.getTenantRef('orders').onSnapshot(snapshot => {
            this.state.orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            notifyUpdate(); // Notifica o Admin
        }, error => console.error("Erro ao obter pedidos:", error));

        // 3. Configurações (Categories, Coupons, Settings, Stats, StoreInfo)
        this.getSettingsRef().onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                this.state.categories = data.categories || [];
                this.state.coupons = data.coupons || [];
                this.state.settings = data.settings || initialSettings;
                this.state.stats = data.stats || initialStats;
                this.state.storeInfo = data.storeInfo || { whatsapp: '', instagram: '', address: '' };
                
                // Inicializa senha se não existir
                if (!this.state.settings.adminPass) {
                    this.state.settings.adminPass = initialSettings.adminPass;
                    this.updateSettings({ settings: this.state.settings });
                }
                
                notifyUpdate(); // Notifica o Admin e a UI
            } else {
                 // Inicializa o documento do tenant se não existir
                 this.getSettingsRef().set({
                    categories: ['Geral'],
                    coupons: [],
                    settings: initialSettings,
                    stats: initialStats,
                    storeInfo: { whatsapp: '', instagram: '', address: '' }
                    }).then(() => console.log("Tenant inicializado."));
            }
        }, error => console.error("Erro ao obter configurações:", error));
    },

    // Função utilitária para salvar as configurações no Tenant Doc
    async updateSettings(dataToUpdate) {
        try {
            await this.getSettingsRef().set(dataToUpdate, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
        }
    },

    // ----------------------------------------------------
    // FUNÇÕES DE AÇÃO (CRUD & PEDIDOS)
    // ----------------------------------------------------

    /* --- PRODUTOS --- */
    async saveProduct(product) {
        const productToSave = {
            ...product,
            price: parseFloat(product.price) || 0,
            stock: parseInt(product.stock) || 0,
            sold: product.sold === undefined ? 0 : (parseInt(product.sold) || 0),
            images: Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []),
            image: (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : (product.image || 'assets/placeholder.png')
        };
        
        // Remove o ID do objeto para salvar (o ID é a chave do documento)
        const docId = productToSave.id ? productToSave.id.toString() : null;
        delete productToSave.id;

        try {
            if (docId) {
                await this.getTenantRef('products').doc(docId).set(productToSave);
            } else {
                await this.getTenantRef('products').add(productToSave);
            }
            // CORREÇÃO CRÍTICA: Notificar a UI IMEDIATAMENTE após a chamada ao Firebase.
            this._notifyAdminUpdate(); 
            return true;
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            return false;
        }
    },
    
    async deleteProduct(id) {
        try {
            await this.getTenantRef('products').doc(id.toString()).delete();
            // CORREÇÃO CRÍTICA: Notificar a UI IMEDIATAMENTE após a chamada ao Firebase.
            this._notifyAdminUpdate(); 
            return true;
        } catch (error) {
            console.error("Erro ao deletar produto:", error);
            return false;
        }
    },

    /* --- CATEGORIAS, CUPONS & INFO --- */
    async addCategory(name) { 
        if (!this.state.categories.includes(name)) { 
            await this.updateSettings({ categories: [...this.state.categories, name] });
            this._notifyAdminUpdate(); // CORREÇÃO
        }
    },
    async deleteCategory(name) { 
        await this.updateSettings({ categories: this.state.categories.filter(c => c !== name) });
        this._notifyAdminUpdate(); // CORREÇÃO
    },
    async addCoupon(code, discount) { 
        await this.updateSettings({ coupons: [...this.state.coupons, { code: code.toUpperCase(), discount: parseInt(discount) }] });
        this._notifyAdminUpdate(); // CORREÇÃO
    },
    async deleteCoupon(code) { 
        await this.updateSettings({ coupons: this.state.coupons.filter(c => c.code !== code) });
        this._notifyAdminUpdate(); // CORREÇÃO
    },
    async saveStoreInfo(infoData) {
        return this.updateSettings({ storeInfo: infoData });
    },

    /* --- PEDIDOS (Criação, Aprovação, Estorno) --- */
    async createOrder(cartItems, total, discount, couponCode) {
        const newOrderData = {
            date: new Date().toLocaleString('pt-BR'),
            items: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                size: item.size,
                qty: parseInt(item.qty),
                image: item.image // Salva a imagem para referência futura (estorno)
            })), 
            total: total,
            discount: discount,
            coupon: couponCode,
            status: 'pending' 
        };

        try {
            const docRef = await this.getTenantRef('orders').add(newOrderData);
            this.logVisit(); // Opcional: Conta venda como visita/atividade
            this.clearCart(); 
            this._notifyAdminUpdate(); // CORREÇÃO: Notificar sobre novo pedido
            return docRef.id; 
        } catch (error) {
            console.error("Erro ao criar pedido:", error);
            return null;
        }
    },

    // APROVAÇÃO COM TRANSAÇÃO (Segurança de Estoque)
    async approveOrder(orderId) {
        const orderRef = this.getTenantRef('orders').doc(orderId.toString());

        try {
            await window.db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists || orderDoc.data().status !== 'pending') throw new Error("Pedido inválido.");
                
                const order = orderDoc.data();
                const settingsDoc = await transaction.get(this.getSettingsRef());
                const allowNegative = settingsDoc.data()?.settings?.allowNegativeStock || false;

                // Atualiza estoque de cada item
                for (const item of order.items) {
                    const productRef = this.getTenantRef('products').doc(item.id.toString());
                    const productDoc = await transaction.get(productRef);

                    if (productDoc.exists) {
                        const pData = productDoc.data();
                        const newStock = allowNegative ? (pData.stock - item.qty) : Math.max(0, pData.stock - item.qty);
                        transaction.update(productRef, { 
                            stock: newStock, 
                            sold: (pData.sold || 0) + item.qty 
                        });
                    }
                }
                
                // Atualiza status e contagem de conversões
                transaction.update(orderRef, { status: 'approved' });
                const currentConversions = settingsDoc.data()?.stats?.conversions || 0;
                transaction.update(this.getSettingsRef(), { 'stats.conversions': currentConversions + 1 });
            });
            // CORREÇÃO CRÍTICA: A transação já garante que o estado local será atualizado.
            // A notificação aqui é redundante, mas garante a atualização imediata do Admin
            // e da home se necessário, sem esperar o snapshot do orders.
            this._notifyAdminUpdate(); 
            return { success: true };
        } catch (error) {
            console.error("Erro na aprovação:", error);
            // Retornar objeto com erro mais detalhado se necessário
            return { success: false, message: error.message };
        }
    },

    async rejectOrder(orderId) {
        try {
            await this.getTenantRef('orders').doc(orderId.toString()).update({ status: 'rejected' });
            this._notifyAdminUpdate(); // CORREÇÃO: Notificar Admin sobre mudança de status
            return true;
        } catch (e) { return false; }
    },

    // ESTORNO COM TRANSAÇÃO (Devolução de Estoque)
    async refundOrder(orderId) {
        const orderRef = this.getTenantRef('orders').doc(orderId.toString());

        try {
            let productsNotFound = [];

            await window.db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists || orderDoc.data().status !== 'approved') throw new Error("Pedido inválido para estorno. Status deve ser 'approved'.");
                
                const order = orderDoc.data();

                // Devolve estoque
                for (const item of order.items) {
                    const productRef = this.getTenantRef('products').doc(item.id.toString());
                    const productDoc = await transaction.get(productRef);

                    if (productDoc.exists) {
                        const pData = productDoc.data();
                        transaction.update(productRef, { 
                            stock: (pData.stock || 0) + item.qty,
                            sold: Math.max(0, (pData.sold || 0) - item.qty)
                        });
                    } else {
                        // Coleta dados para notificação (não podemos recadastrar dentro da transação)
                        productsNotFound.push({
                            name: item.name, price: item.price,
                            stock: item.qty, image: item.image, size: item.size
                        });
                    }
                }

                // Atualiza status e conversões
                transaction.update(orderRef, { status: 'refunded' }); // Novo status para estorno
                const settingsDoc = await transaction.get(this.getSettingsRef());
                const currentConversions = settingsDoc.data()?.stats?.conversions || 0;
                transaction.update(this.getSettingsRef(), { 'stats.conversions': Math.max(0, currentConversions - 1) });
            });

            this._notifyAdminUpdate(); // CORREÇÃO: Notificar Admin e home
            // O app.js será notificado dos produtos não encontrados
            return { success: true, productsNotFound: productsNotFound };
        } catch (error) {
            console.error("Erro no estorno:", error);
            return { success: false, message: error.message };
        }
    },

    // --- UTILS & LOGIN ---
    loginAdmin(password) { 
        if (password === this.state.settings.adminPass) { 
            this.state.isAdmin = true; 
            localStorage.setItem(`${window.CLIENT_ID}_isAdmin`, 'true');
            // Notificar aqui garante que o Admin.render() seja chamado após o login
            this._notifyAdminUpdate(); 
            return true; 
        } 
        return false; 
    },
    logout() { 
        this.state.isAdmin = false; 
        localStorage.removeItem(`${window.CLIENT_ID}_isAdmin`); 
    },
    async toggleNegativeStock() {
        const newVal = !this.state.settings.allowNegativeStock;
        await this.updateSettings({ settings: { ...this.state.settings, allowNegativeStock: newVal } });
        return newVal;
    },
async logVisit() { 
        if (!sessionStorage.getItem('visited')) { 
            try {
                await window.db.runTransaction(async (transaction) => {
                    const settingsRef = this.getSettingsRef();
                    const settingsDoc = await transaction.get(settingsRef); 
                    const currentVisits = settingsDoc.data()?.stats?.visits || 0;
                    
                    // Incrementar o contador e atualizar dentro da transação
                    transaction.update(settingsRef, { 'stats.visits': currentVisits + 1 });
                });
                sessionStorage.setItem('visited', 'true');
                console.log("[STATS] Visita contabilizada por transação.");
            } catch (e) {
                console.error("[STATS] Erro ao contabilizar visita em transação:", e);
            }
        } 
    },

    // --- LEITURA SINCRONA (Do Estado Local) ---
    getProducts(category = null) {
        if (!category || category === 'Todos') return this.state.products;
        return this.state.products.filter(p => p.category === category);
    },
    getProductById(id) { return this.state.products.find(p => p.id == id); },
    getInventoryValue() { return this.state.products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0); },
    
    // --- CARRINHO (LOCAL) ---
    addToCart(product, size, qty = 1) {
        const stock = parseInt(product.stock);
        const quantity = parseInt(qty) || 1;
        const settings = this.state.settings;

        if (!settings.allowNegativeStock && stock < quantity) {
            alert(`Estoque insuficiente! Disponível: ${stock}`);
            return false;
        }
        const existing = this.state.cart.find(item => item.id == product.id && item.size === size);
        if (existing) {
            if (!settings.allowNegativeStock && (existing.qty + quantity > stock)) {
                alert(`Limite de estoque atingido!`); return false;
            }
            existing.qty += quantity;
        } else {
            let thumb = 'assets/placeholder.png';
            if (product.image) thumb = product.image;
            if (product.images && product.images.length > 0) thumb = product.images[0];
            this.state.cart.push({ id: product.id, name: product.name, price: parseFloat(product.price), stock, image: thumb, size, qty: quantity });
        }
        this._persistLocal('vm_cart', this.state.cart);
        window.dispatchEvent(new Event('cart-updated'));
        return true;
    },
    removeFromCart(index) {
        this.state.cart.splice(index, 1);
        this._persistLocal('vm_cart', this.state.cart);
        if (this.state.cart.length === 0) this.state.activeCoupon = null;
        window.dispatchEvent(new Event('cart-updated'));
    },
    clearCart() {
        this.state.cart = [];
        this.state.activeCoupon = null;
        this._persistLocal('vm_cart', this.state.cart);
        window.dispatchEvent(new Event('cart-updated'));
    },
    getCartTotal() {
        const subtotal = this.state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const discountValue = this.state.activeCoupon?.discount || 0;
        const discount = this.state.activeCoupon ? (subtotal * discountValue / 100) : 0;
        return { subtotal, total: subtotal - discount, discount };
    },
    applyCoupon(code) { 
        const c = this.state.coupons.find(i => i.code === code.toUpperCase()); 
        if (c) { this.state.activeCoupon = c; return { success: true }; } 
        return { success: false }; 
    },
    removeActiveCoupon() { this.state.activeCoupon = null; },

    // --- CARREGAMENTO INICIAL ---
    loadState() {
        this.state.isAdmin = localStorage.getItem(`${window.CLIENT_ID}_isAdmin`) === 'true';
        // Inicia conexão em tempo real IMEDIATAMENTE para carregar produtos
        this.initializeRealtimeListeners();
    }
};


// INICIA A STORE
store.loadState();

// EXPOSIÇÃO GLOBAL PARA O ADMIN.JS (Funções Wrapper)
window.store = store; // Para debug se necessário
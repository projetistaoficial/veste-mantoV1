import { store } from './store.js';
import { UI } from './ui.js';
import { Admin } from './admin.js';

// --- NOVO ESTADO ADMIN ---
const adminState = {
    activeTab: 'all', // 'all' ou 'category'
    activeCategory: null, // Categoria selecionada na aba
    sortBy: 'alphabetical', // 'alphabetical', 'stock-asc', 'stock-desc'
    searchQuery: '' // Termo de busca
};

// --- NOVA FUNÇÃO DE FILTRO ---
const getFilteredProducts = () => {
    let products = store.state.products;
    
    // 1. Filtrar por Categoria (se a aba for 'category' e houver seleção)
    if (adminState.activeTab === 'category' && adminState.activeCategory) {
        products = products.filter(p => p.category === adminState.activeCategory);
    }

    // 2. Filtrar por Busca (Lupa)
    if (adminState.searchQuery) {
        const query = adminState.searchQuery.toLowerCase();
        products = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query) ||
            (p.sizes && p.sizes.some(s => s.toLowerCase().includes(query)))
        );
    }
    
    // 3. Ordenar (Sort)
    switch (adminState.sortBy) {
        case 'stock-asc':
            products.sort((a, b) => a.stock - b.stock);
            break;
        case 'stock-desc':
            products.sort((a, b) => b.stock - a.stock);
            break;
        case 'alphabetical':
        default:
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    return products;
};

// 🔴 ALTERE AQUI PARA O NÚMERO DO CLIENTE
const WHATSAPP_NUMBER = "5511941936976"; 

// Sistema de Rotas Simples
const router = () => {
    const hash = window.location.hash || '#/';
    
    if (hash === '#/cart') {
        UI.renderCart();
    } else if (hash === '#/admin') {
        // Renderiza o Admin (Função modificada abaixo para incluir configurações)
        renderAdminWithSettings();
    } else {
        // Home ou Categoria Específica
        if (hash.includes('#/category/')) {
            UI.renderHome(decodeURIComponent(hash.split('/')[2]));
        } else {
            UI.renderHome();
        }
    }
    UI.updateBadge();
    fillSidebar(); 
};

// --- Funções Globais (Expostas para o HTML) ---
window.store = store; 

// --- MODIFICAÇÃO 1: Renderização do Admin com Configuração de Estoque ---
function renderAdminWithSettings() {
    const app = document.getElementById('app');
    
    // Tela de Login
    if (!store.state.isAdmin) {
        Admin.render(); // Chama o padrão do admin.js (Login)
        return;
    }

    // Se já estiver logado, vamos injetar o Dashboard com a nova opção
    // Nota: Estamos sobrescrevendo o render padrão para adicionar o card de config
    // sem precisar mexer no arquivo admin.js original se não quiser.
    
    const stats = store.state.stats;
    const inventoryValue = store.getInventoryValue();
    const totalProducts = store.state.products.length;
    
    // Garante que settings existe (caso o store.js antigo ainda esteja em cache)
    const settings = store.state.settings || { allowNegativeStock: false };

    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 class="section-title">Dashboard</h2>
        <button onclick="window.store.logout(); window.location.reload()" class="btn-danger">Sair</button>
    </div>

    <div class="dash-card" style="margin-bottom: 20px; border: 1px solid #444; background:#2a2a2a;">
        <h4 style="margin-top:0; color:var(--accent-color);">CONFIGURAÇÕES DA LOJA</h4>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" 
                   onchange="window.toggleStockConfig()" 
                   ${settings.allowNegativeStock ? 'checked' : ''}
                   style="width:20px; height:20px;">
            <span>
                <strong>Permitir Venda sem Estoque?</strong><br>
                <small style="color:#aaa;">Se marcado, o cliente compra mesmo com estoque 0 (vira negativo).</small>
            </span>
        </label>
    </div>

    <div class="dash-grid">
        <div class="dash-card">
            <h4>VISITAS / VENDAS</h4>
            <div class="number">${stats.visits} / ${stats.conversions}</div>
        </div>
        <div class="dash-card">
            <h4>VALOR EM ESTOQUE</h4>
            <div class="number" style="color:#22c55e; font-size:1.2rem;">R$ ${parseFloat(inventoryValue).toFixed(2).replace('.',',')}</div>
            <small style="color:#aaa;">${totalProducts} produtos cadastrados</small>
        </div>
    </div>

    `;
    
    // Para não duplicar código, renderizamos o HTML base do Admin e injetamos nosso header customizado
    // Mas como o Admin.render original substitui todo o innerHTML, vamos chamar a lógica de renderização completa aqui
    // baseada no seu código anterior.
    
    // ... Continuação da renderização manual do Admin para manter o Card de Configuração visível ...
    html += `
    <h3 class="section-title">Categorias</h3>
    <div class="form-group" style="display:flex; gap:10px;">
        <input type="text" id="new-cat" placeholder="Nova Categoria">
        <button class="btn-secondary" onclick="window.addCategoryUI()">Add</button>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:30px;">
        ${store.state.categories.map(c => `
            <span style="background:#444; padding:5px 10px; border-radius:15px; font-size:0.9rem;">
                ${c} <span onclick="window.deleteCategoryUI('${c}')" style="cursor:pointer; color:red; margin-left:5px;">&times;</span>
            </span>
        `).join('')}
    </div>

    <h3 class="section-title">Cupons</h3>
    <div class="form-group" style="display:flex; gap:10px;">
        <input type="text" id="new-coupon-code" placeholder="Código">
        <input type="number" id="new-coupon-val" placeholder="%" style="width:70px;">
        <button class="btn-secondary" onclick="window.addCouponUI()">Criar</button>
    </div>
    <div style="margin-bottom:30px;">
        ${store.state.coupons.map(c => `
            <div class="list-item">
                <span><strong>${c.code}</strong> (${c.discount}%)</span>
                <button onclick="window.deleteCouponUI('${c.code}')" style="color:red; background:none; border:none;">🗑️</button>
            </div>
        `).join('')}
    </div>

    <h3 class="section-title">Produto (Adicionar / Editar)</h3>
    <div class="form-group" style="background:#333; padding:15px; border-radius:8px; margin-bottom:20px;">
        <input type="hidden" id="prod-id">
        <input type="text" id="prod-name" placeholder="Nome do Produto" style="margin-bottom:5px;">
        <div style="display:flex; gap:5px; margin-bottom:5px;">
            <input type="number" id="prod-price" placeholder="Preço (R$)" step="0.01">
            <input type="number" id="prod-stock" placeholder="Qtd Estoque">
        </div>
        <select id="prod-cat" style="margin-bottom:5px;">
            ${store.state.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="text" id="prod-sizes" placeholder="Tamanhos (P,M,G)" style="margin-bottom:5px;">
        <input type="file" id="prod-img" accept="image/*" style="margin-bottom:5px;">
        <button class="btn-primary" onclick="window.saveProductForm()">Salvar Produto</button>
    </div>

    <h3 class="section-title">Inventário</h3>
    <div style="display:grid; gap:10px;">
        ${store.state.products.map(p => `
            <div class="list-item">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.image || (p.images && p.images[0]) || 'assets/placeholder.png'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div>
                        <div style="font-weight:bold;">${p.name}</div>
                        <small style="color:${p.stock > 0 ? '#aaa' : 'red'};">
                            Estoque: ${p.stock} un | R$ ${parseFloat(p.price).toFixed(2)}
                        </small>
                    </div>
                </div>
                <div>
                    <button onclick="window.editProduct(${p.id})" style="margin-right:5px;">✏️</button>
                    <button onclick="window.deleteProduct(${p.id})" style="color:red;">🗑️</button>
                </div>
            </div>
        `).join('')}
    </div>`;

    app.innerHTML = html;
}

// Produto Modal
window.openProductModal = (id) => {
    const p = store.getProductById(id);
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body') || modal; 

    let sizesHtml = p.sizes.map(s => `<option value="${s}">${s}</option>`).join('');
    const img = p.image ? p.image : 'assets/placeholder.png';
    
    modal.innerHTML = `
        <div style="background:#222; padding:20px; max-width:400px; margin:auto; border-radius:8px; position:relative;">
            <button onclick="document.getElementById('product-modal').close()" style="position:absolute; right:10px; top:10px; background:none; border:none; color:white; font-size:1.5rem;">&times;</button>
            <img src="${img}" style="width:100%; border-radius:8px;">
            <h2>${p.name}</h2>
            <p>${p.description || ''}</p>
            <h3 style="color:var(--accent-color); margin: 10px 0;">R$ ${parseFloat(p.price).toFixed(2)}</h3>
            
            <label>Tamanho:</label>
            <select id="selected-size" style="padding:5px; margin-bottom:10px; width:100%;">${sizesHtml}</select>
            
            <label>Quantidade:</label>
            <input type="number" id="modal-qty" value="1" min="1" max="${p.stock > 0 ? p.stock : (store.state.settings?.allowNegativeStock ? 999 : 0)}" style="width:100%; padding:5px; margin-bottom:15px;">

            <div style="display:flex; gap:10px;">
                <button class="btn-primary" onclick="window.confirmAdd(${p.id})" style="width:100%">Adicionar ao Carrinho</button>
            </div>
        </div>
    `;
    
    if(modal.showModal) modal.showModal();
    else modal.style.display = 'block';
};

window.confirmAdd = (id) => {
    const p = store.getProductById(id);
    const size = document.getElementById('selected-size').value;
    let qty = parseInt(document.getElementById('modal-qty').value);
    if (!qty || qty < 1) qty = 1;

    const success = store.addToCart(p, size, qty);
    
    if (success) {
        const modal = document.getElementById('product-modal');
        if(modal.close) modal.close(); else modal.style.display = 'none';
        alert('Produto adicionado!');
    }
};

// Carrinho & Checkout
window.removeItem = (idx) => { store.removeFromCart(idx); UI.renderCart(); };

window.applyCouponUI = () => {
    const code = document.getElementById('coupon-code').value;
    const res = store.applyCoupon(code);
    const msgDiv = document.getElementById('coupon-msg');
    if(res.success) UI.renderCart();
    else { msgDiv.innerHTML = '<span class="text-error">Cupom inválido</span>'; }
};
window.removeCoupon = () => { store.state.activeCoupon = null; UI.renderCart(); };

window.finalizeOrder = () => {
    const cart = store.state.cart;
    if (cart.length === 0) return;
    store.logConversion();

    const { total, discount } = store.getCartTotal();
    const activeCoupon = store.state.activeCoupon;

    let msg = `Olá! Quero fazer um pedido no Veste Manto:\n\n`;
    cart.forEach(item => {
        msg += `• ${item.name} - Tam ${item.size} - x${item.qty} - R$ ${(item.price * item.qty).toFixed(2)}\n`;
    });
    
    if(activeCoupon) msg += `\n-----------------\nCupom Aplicado: ${activeCoupon.code} (-${activeCoupon.discount}%)`;
    msg += `\n*Total Final: R$ ${total.toFixed(2)}*`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    store.clearCart(); 
    window.location.hash = '#/';
};

// Admin Globals
window.tryLogin = () => { 
    if (store.login(document.getElementById('admin-pass').value)) renderAdminWithSettings(); 
    else alert('Senha incorreta!'); 
};

// --- MODIFICAÇÃO 2: Função para Alternar Configuração ---
window.toggleStockConfig = () => {
    if(store.toggleNegativeStock) {
        const isEnabled = store.toggleNegativeStock();
        alert(isEnabled ? 'Agora é permitido vender produtos sem estoque.' : 'O sistema bloqueará vendas sem estoque.');
    } else {
        alert('Erro: Atualize seu arquivo store.js primeiro!');
    }
};

// Admin - Produtos (Corrigido conforme conversa anterior)
window.saveProductForm = () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value; 
    const category = document.getElementById('prod-cat').value;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim());
    const fileInput = document.getElementById('prod-img');

    if(!name || !price || !stock) return alert('Preencha nome, preço e estoque');

    const finishSave = (base64Img) => {
        const product = { 
            id: id ? parseInt(id) : null,
            name, 
            price: parseFloat(price), 
            stock: parseInt(stock), 
            category, 
            sizes, 
            image: base64Img ? base64Img : (id ? store.getProductById(id).image : null)
        };
        
        store.saveProduct(product); 
        alert('Salvo!'); 
        renderAdminWithSettings(); // Recarrega Admin com Configurações
    };

    if (fileInput.files[0]) {
        Admin.handleImageUpload(fileInput.files[0], finishSave);
    } else {
        finishSave(null); 
    }
};
// --- NOVAS FUNÇÕES DE CONTROLE DO ADMIN ---

window.changeAdminTab = (tab, category = null) => {
    adminState.activeTab = tab;
    adminState.activeCategory = category;
    // Reseta a busca ao mudar a aba principal para evitar resultados vazios
    adminState.searchQuery = ''; 
    document.getElementById('product-search').value = '';
    renderAdminWithSettings();
};

window.changeSort = (select) => {
    adminState.sortBy = select.value;
    renderAdminWithSettings();
};

window.performSearch = (input) => {
    adminState.searchQuery = input.value;
    renderAdminWithSettings();
};
window.deleteProduct = (id) => { if(confirm('Excluir produto?')) { store.deleteProduct(id); renderAdminWithSettings(); } };

window.editProduct = (id) => {
    const p = store.getProductById(id);
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-stock').value = p.stock; 
    document.getElementById('prod-sizes').value = p.sizes.join(',');
    document.getElementById('prod-cat').value = p.category;
};

// Admin - Categorias & Cupons
window.addCategoryUI = () => {
    const val = document.getElementById('new-cat').value;
    if(val) { store.addCategory(val); renderAdminWithSettings(); }
};
window.deleteCategoryUI = (name) => {
    if(confirm('Remover categoria?')) { store.deleteCategory(name); renderAdminWithSettings(); }
};
window.addCouponUI = () => {
    const code = document.getElementById('new-coupon-code').value;
    const val = document.getElementById('new-coupon-val').value;
    if(code && val) { store.addCoupon(code, val); renderAdminWithSettings(); }
};
window.deleteCouponUI = (code) => { store.deleteCoupon(code); renderAdminWithSettings(); };

// Inicialização
window.addEventListener('hashchange', router);
window.addEventListener('load', () => { 
    store.logVisit(); 
    router(); 
});
window.addEventListener('cart-updated', UI.updateBadge);

// Sidebar Events
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('btn-menu').onclick = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
document.getElementById('close-sidebar').onclick = closeSidebar;
overlay.onclick = closeSidebar;
document.getElementById('btn-cart').onclick = () => window.location.hash = '#/cart';

function fillSidebar() {
    const nav = document.getElementById('category-list');
    let html = '';
    store.state.categories.forEach(c => {
        html += `<a href="#/category/${c}" onclick="document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="display:block; padding:10px; color:white; text-decoration:none; border-bottom:1px solid #333;">${c}</a>`;
    });
    html += `<a href="#/" onclick="document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="display:block; padding:10px; color:var(--accent-color); text-decoration:none;">Ver Tudo</a>`;
    nav.innerHTML = html;
}
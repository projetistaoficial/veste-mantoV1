import { store } from './store.js';
import { UI } from './ui.js';
import { Admin } from './admin.js';

// 🔴 ALTERE AQUI PARA O NÚMERO DO CLIENTE
const WHATSAPP_NUMBER = "5511941936976"; 

// Sistema de Rotas Simples
const router = () => {
    const hash = window.location.hash || '#/';
    
    if (hash === '#/cart') {
        UI.renderCart();
    } else if (hash === '#/admin') {
        Admin.render();
    } else {
        // Home ou Categoria Específica
        if (hash.includes('#/category/')) {
            UI.renderHome(decodeURIComponent(hash.split('/')[2]));
        } else {
            UI.renderHome();
        }
    }
    UI.updateBadge();
    fillSidebar(); // Atualiza sidebar caso categorias tenham mudado
};

// --- Funções Globais (Expostas para o HTML) ---
window.store = store; 

// Produto Modal
window.openProductModal = (id) => {
    const p = store.getProductById(id);
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    let sizesHtml = p.sizes.map(s => `<option value="${s}">${s}</option>`).join('');
    const img = p.image ? p.image : 'assets/placeholder.png';
    
    body.innerHTML = `
        <img src="${img}">
        <h2>${p.name}</h2>
        <p>${p.description || ''}</p>
        <h3 style="color:var(--accent-color); margin: 10px 0;">R$ ${parseFloat(p.price).toFixed(2)}</h3>
        <label>Tamanho:</label>
        <select id="selected-size" style="padding:5px; margin-bottom:15px; width:100%;">${sizesHtml}</select>
        <div style="display:flex; gap:10px;">
            <button class="btn-primary" onclick="window.confirmAdd(${p.id})">Adicionar ao Carrinho</button>
            <button class="btn-danger" onclick="document.getElementById('product-modal').close()">Fechar</button>
        </div>
    `;
    modal.showModal();
};

window.confirmAdd = (id) => {
    const p = store.getProductById(id);
    const size = document.getElementById('selected-size').value;
    store.addToCart(p, size);
    document.getElementById('product-modal').close();
    alert('Produto adicionado!');
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
    
    // Analytics: Registra a conversão
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
    if (store.login(document.getElementById('admin-pass').value)) Admin.render(); 
    else alert('Senha incorreta!'); 
};

// Admin - Produtos
window.saveProductForm = () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const category = document.getElementById('prod-cat').value;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim());
    const fileInput = document.getElementById('prod-img');

    if(!name || !price) return alert('Preencha nome e preço');

    const finishSave = (base64Img) => {
        const product = { id: id || null, name, price: parseFloat(price), category, sizes, image: base64Img };
        store.saveProduct(product); 
        alert('Salvo!'); 
        Admin.render();
    };

    if (fileInput.files[0]) {
        Admin.handleImageUpload(fileInput.files[0], finishSave);
    } else {
        // Mantém imagem antiga se for edição e não tiver nova (Lógica simplificada)
        finishSave(null); 
    }
};
window.deleteProduct = (id) => { if(confirm('Excluir produto?')) { store.deleteProduct(id); Admin.render(); } };
window.editProduct = (id) => {
    const p = store.getProductById(id);
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-sizes').value = p.sizes.join(',');
    // Nota: Categoria e imagem exigem mais lógica de UI para pré-seleção perfeita, simplificado para o exemplo.
};

// Admin - Categorias & Cupons
window.addCategoryUI = () => {
    const val = document.getElementById('new-cat').value;
    if(val) { store.addCategory(val); Admin.render(); }
};
window.deleteCategoryUI = (name) => {
    if(confirm('Remover categoria? (Produtos nela não serão excluídos)')) { store.deleteCategory(name); Admin.render(); }
};
window.addCouponUI = () => {
    const code = document.getElementById('new-coupon-code').value;
    const val = document.getElementById('new-coupon-val').value;
    if(code && val) { store.addCoupon(code, val); Admin.render(); }
};
window.deleteCouponUI = (code) => { store.deleteCoupon(code); Admin.render(); };

// Inicialização
window.addEventListener('hashchange', router);
window.addEventListener('load', () => { 
    store.logVisit(); // Analytics: Contar Visita ao carregar
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
    // Pega categorias dinamicamente da store
    store.state.categories.forEach(c => {
        html += `<a href="#/category/${c}" onclick="document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="display:block; padding:10px; color:white; text-decoration:none; border-bottom:1px solid #333;">${c}</a>`;
    });
    html += `<a href="#/" onclick="document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="display:block; padding:10px; color:var(--accent-color); text-decoration:none;">Ver Tudo</a>`;
    nav.innerHTML = html;
}
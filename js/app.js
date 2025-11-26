import { store } from './store.js';
import { UI } from './ui.js';
import { Admin } from './admin.js';

// --- CORREÇÃO CRÍTICA: EXPOSIÇÃO GLOBAL ---
// 1. Torna o objeto Admin acessível para o HTML (para chamadas como Admin.switchTab)
window.Admin = Admin;
// 2. Torna o objeto UI acessível para que os outros arquivos possam chamar a renderização
window.UI = UI; 

const WHATSAPP_NUMBER = "5511941936976"; 
let currentSlideIndex = 0; 

/* --- FUNÇÃO DE TOAST (POPUP) --- */
window.showToast = (message, type = 'success', duration = 1500) => {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        document.body.appendChild(toast);
    }

    // Adiciona classe do tipo (success, error, info)
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Força reflow para reiniciar animação se chamado rapidamente
    void toast.offsetWidth; 

    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
};

/* --- TEMA (MODO CLARO/ESCURO) --- */
window.toggleTheme = () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('vm_theme', isLight ? 'light' : 'dark');
    window.fillSidebar(); 
};

/* --- SIDEBAR --- */
const fillSidebar = () => {
    const list = document.getElementById('category-list');
    if (!list) return;

    const isLight = document.body.classList.contains('light-mode');
    const themeIcon = isLight ? '🌙' : '☀️';
    const themeText = isLight ? 'Modo Escuro' : 'Modo Claro';

    let html = `
        <li onclick="window.toggleTheme()" style="cursor:pointer; padding:15px 10px; border-bottom:1px solid #333; font-weight:bold; color:var(--accent-color); display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem">${themeIcon}</span> ${themeText}
        </li>
    `;

    html += `<li onclick="window.location.hash='#/'; document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="cursor:pointer; padding:10px; border-bottom:1px solid #333; list-style-type: none; font-weight: bold; font-size: 2vh">Todos os Produtos</li>`;
    
    store.state.categories.forEach(cat => {
        html += `<li onclick="window.location.hash='#/category/${encodeURIComponent(cat)}'; document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="cursor:pointer; padding:10px; border-bottom:1px solid #333;">${cat}</li>`;
    });
    
    list.innerHTML = html;
};
window.fillSidebar = fillSidebar;

/* --- ROTEADOR --- */
const router = () => {
    const hash = window.location.hash || '#/';
    if (hash === '#/cart') UI.renderCart();
    else if (hash === '#/admin') Admin.render();
    else {
        if (hash.includes('#/category/')) UI.renderHome(decodeURIComponent(hash.split('/')[2]));
        else UI.renderHome();
    }
    UI.updateBadge();
    window.fillSidebar();
};

window.store = store;

/* --- MODAL DO PRODUTO --- */
window.openProductModal = (id) => {
    const p = store.getProductById(id);
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const images = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : ['assets/placeholder.png']);
    currentSlideIndex = 0; 

    // onclick="window.zoomImage(this.src)" para zoom
    const slidesHtml = images.map((img) => `<div class="slide"><img src="${img}" onclick="window.zoomImage(this.src)"></div>`).join('');
    const dotsHtml = images.length > 1 ? images.map((_, idx) => `<div class="dot ${idx===0?'active':''}" onclick="window.goToSlide(${idx})"></div>`).join('') : '';
    const arrowsHtml = images.length > 1 ? `<button class="slider-btn prev-btn" onclick="window.changeSlide(-1)">&#10094;</button><button class="slider-btn next-btn" onclick="window.changeSlide(1)">&#10095;</button>` : '';
    let sizesHtml = p.sizes.map(s => `<option value="${s}">${s}</option>`).join('');

    const isOutOfStock = p.stock <= 0 && !store.state.settings?.allowNegativeStock;
    const maxQty = isOutOfStock ? 0 : (store.state.settings?.allowNegativeStock ? 999 : p.stock);

    body.innerHTML = `
        <div class="slider-container">
            <div class="slider-track" id="slider-track" style="display:flex; transition: transform 0.3s ease-in-out;">${slidesHtml}</div>
            ${arrowsHtml}
            <div class="slider-dots" id="slider-dots">${dotsHtml}</div>
        </div>
        <h2>${p.name}</h2>
        <div style="margin:10px 0; padding:10px; background:#222; border-radius:6px; font-size:0.9rem; color:#ddd;">
            ${p.description ? p.description.replace(/\n/g, '<br>') : 'Sem descrição.'}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin:10px 0;">
            <h3 style="color:var(--accent-color);">R$ ${parseFloat(p.price).toFixed(2)}</h3>
            <span style="font-size:0.9rem; color:${p.stock>0?'#aaa':'red'};">Estoque: ${p.stock} un</span>
        </div>
        ${!isOutOfStock ? `
            <label>Tamanho:</label><select id="selected-size" style="padding:5px; width:100%; margin-bottom:10px;">${sizesHtml}</select>
            <div class="qty-selector"><label class="qty-label">Quantidade:</label><input type="number" id="selected-qty" value="1" min="1" max="${maxQty}"></div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-primary" onclick="window.confirmAdd(${p.id})">Adicionar</button>
                <button class="btn-danger" onclick="document.getElementById('product-modal').close()">Fechar</button>
            </div>
        ` : `<div style="text-align:center; margin-top:20px;"><span class="badge" style="position:static; padding:10px; font-size:1rem;">ESGOTADO</span><br><br><button class="btn-danger" onclick="document.getElementById('product-modal').close()" style="width:100%">Fechar</button></div>`}
    `;
    window.updateSliderUI();
    modal.showModal();
};

window.changeSlide = (d) => {
    const t = document.getElementById('slider-track'); if (!t) return;
    const total = t.children.length;
    currentSlideIndex += d;
    if (currentSlideIndex < 0) currentSlideIndex = total - 1;
    if (currentSlideIndex >= total) currentSlideIndex = 0;
    window.updateSliderUI();
};
window.goToSlide = (idx) => { currentSlideIndex = idx; window.updateSliderUI(); };
window.updateSliderUI = () => {
    const t = document.getElementById('slider-track');
    if(t) {
        t.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        const dots = document.querySelectorAll('.dot');
        dots.forEach((d, i) => { if(i === currentSlideIndex) d.classList.add('active'); else d.classList.remove('active'); });
    }
};

window.confirmAdd = (id) => {
    const p = store.getProductById(id);
    const size = document.getElementById('selected-size').value;
    const qty = parseInt(document.getElementById('selected-qty').value) || 1;
    if(store.addToCart(p, size, qty)) { 
        document.getElementById('product-modal').close(); 
        window.showToast('Adicionado ao Carrinho!', 'success'); 
    } 
};

/* --- ZOOM EM TELA CHEIA --- */
window.zoomImage = (src) => {
    let zoomModal = document.getElementById('zoom-modal');
    if (!zoomModal) {
        zoomModal = document.createElement('dialog');
        zoomModal.id = 'zoom-modal';
        zoomModal.className = 'zoom-modal'; 
        zoomModal.onclick = (e) => {
            if (e.target === zoomModal) {
                zoomModal.close();
                zoomModal.innerHTML = ''; 
            }
        };
        document.body.appendChild(zoomModal);
    }
    zoomModal.innerHTML = `<img src="${src}" class="zoom-image">`;
    zoomModal.showModal();
};

/* --- ADMIN --- */
window.tryLogin = () => { 
    // CORREÇÃO: Chama store.loginAdmin (função que definimos no store.js)
    if (store.loginAdmin(document.getElementById('admin-pass').value)) {
        Admin.render();
        window.showToast('Bem-vindo!', 'success');
    } else {
        window.showToast('Senha incorreta!', 'error');
    }
};
window.toggleStockConfig = () => { 
    const status = store.toggleNegativeStock();
    window.showToast(`Venda sem estoque: ${status ? 'ON' : 'OFF'}`, 'info');
    Admin.render(); // Adicionado para forçar a re-renderização e atualizar o checkbox
};

// INTERAÇÕES DE SWIPE/TOQUE
let touchStartX = 0;
let touchEndX = 0;
window.handleTouchStart = (e, id) => { touchStartX = e.changedTouches[0].screenX; };
window.handleTouchMove = (e, id) => { };
window.handleTouchEnd = (e, id) => { touchEndX = e.changedTouches[0].screenX; handleSwipeGesture(id); };
function handleSwipeGesture(id) {
    const element = document.getElementById(`row-${id}`);
    if (!element) return;
    if (touchStartX - touchEndX > 50) element.classList.add('swiped');
    if (touchEndX - touchStartX > 50) element.classList.remove('swiped');
}

// SELEÇÃO DE LINHA
// A função selectRow também precisa ser exposta no window
window.selectRow = (id) => { 
    Admin.selectedRowId = id; 
    Admin.render();
};

// CORREÇÃO: Expondo searchInventory para ser chamado pelo HTML no admin.js
window.searchInventory = (val) => { Admin.setSearch(val); };

// SALVAR
window.saveProductForm = () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const desc = document.getElementById('prod-desc').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const category = document.getElementById('prod-cat').value;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim());
    const fileInput = document.getElementById('prod-imgs'); 

    if(!name || !price || !stock) return window.showToast('Preencha campos obrigatórios', 'error');

    const finishSave = (imagesArray) => {
        let finalImages = imagesArray;
        if ((!imagesArray || imagesArray.length === 0) && id) {
            const oldProd = store.getProductById(parseInt(id));
            if(oldProd) finalImages = oldProd.images || (oldProd.image ? [oldProd.image] : []);
        }
        const product = { id: id ? parseInt(id) : null, name, description: desc, price: parseFloat(price), stock: parseInt(stock), category, sizes, images: finalImages };
        store.saveProduct(product);
        
        // --- FEEDBACK VISUAL (TOAST) ---
        window.showToast('Produto Salvo com Sucesso!', 'success', 500);
        
        Admin.render();
        window.fillSidebar();
        window.clearForm();
    };
    if (fileInput.files.length > 0) Admin.handleImagesUpload(fileInput.files, finishSave); else finishSave([]);
};

window.editProduct = (id) => {
    const p = store.getProductById(parseInt(id));
    if(!p) return;

    Admin.selectedRowId = id;
    Admin.render();

    setTimeout(() => {
        const setVal = (eid, val) => { const el = document.getElementById(eid); if(el) el.value = val; };
        
        setVal('prod-id', p.id);
        setVal('prod-name', p.name);
        setVal('prod-desc', p.description || '');
        setVal('prod-price', p.price);
        setVal('prod-stock', p.stock);
        setVal('prod-sizes', p.sizes.join(','));
        setVal('prod-cat', p.category);
        
        const previewDiv = document.getElementById('existing-imgs');
        if (previewDiv) {
            previewDiv.innerHTML = '<small style="width:100%; color:#aaa; margin-bottom:5px;">Imagens Atuais:</small>';
            const imgs = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
            imgs.forEach(img => {
                previewDiv.innerHTML += `<img src="${img}" style="width:50px; height:50px; object-fit:cover; border:1px solid #555; margin-right:5px;">`;
            });
        }

        const formArea = document.querySelector('.section-title');
        if(formArea) formArea.scrollIntoView({ behavior: 'smooth' });
    }, 50);
};

window.clearForm = () => {
    const ids = ['prod-id', 'prod-name', 'prod-desc', 'prod-price', 'prod-stock', 'prod-sizes', 'prod-imgs'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    const prev = document.getElementById('existing-imgs'); if(prev) prev.innerHTML = '';
    Admin.selectedRowId = null; 
    Admin.render();
    window.showToast('Formulário Limpo', 'info');
};

window.deleteProduct = (id) => { 
    if(confirm('Excluir?')) { 
        store.deleteProduct(id); 
        Admin.render(); 
        window.fillSidebar(); 
        window.showToast('Produto Excluído!', 'success');
    } 
};

/* --- CATEGORIAS/CUPONS --- */
window.addCategoryUI = () => { const v = document.getElementById('new-cat').value; if(v) { store.addCategory(v); Admin.render(); window.fillSidebar(); window.showToast('Categoria Adicionada', 'success'); } };
window.deleteCategoryUI = (n) => { if(confirm('Remover?')) { store.deleteCategory(n); Admin.render(); window.fillSidebar(); window.showToast('Categoria Removida', 'success'); } };
window.addCouponUI = () => { const c = document.getElementById('new-coupon-code').value; const v = document.getElementById('new-coupon-val').value; if(c && v) { store.addCoupon(c,v); Admin.render(); window.showToast('Cupom Criado', 'success'); } };
window.deleteCouponUI = (c) => { store.deleteCoupon(c); Admin.render(); window.showToast('Cupom Removido', 'success'); };

/* --- CARRINHO --- */
window.removeItem = (idx) => { store.removeFromCart(idx); UI.renderCart(); window.showToast('Item Removido', 'info'); };
window.applyCouponUI = () => { const c = document.getElementById('coupon-code').value; if(store.applyCoupon(c).success) { UI.renderCart(); window.showToast('Cupom Aplicado!', 'success'); } else window.showToast('Inválido', 'error'); };
window.removeCoupon = () => { store.removeActiveCoupon(); UI.renderCart(); window.showToast('Cupom Removido', 'info'); };

window.finalizeOrder = () => {
    const cart = store.state.cart;
    if (cart.length === 0) return;
    
    // GESTÃO DE PEDIDOS: Cria pedido pendente em vez de baixar estoque direto
    const { subtotal, total, discount } = store.getCartTotal();
    const activeCoupon = store.state.activeCoupon;
    const couponCode = activeCoupon ? activeCoupon.code : null;
    
    // Cria pedido na Store
    const orderId = store.createOrder(cart, total, discount, couponCode);

    // Mensagem do WhatsApp
    const orderRef = `#${orderId.toString().slice(-4)}`; // Pega os ultimos 4 digitos do ID
    let msg = `Olá! Gostaria de finalizar o *Pedido ${orderRef}*:\n\n`;
    
    cart.forEach(i => {
        msg += `📦 *${i.name}*\n   └ Tam: ${i.size} | Qtd: ${i.qty} | R$ ${(i.price * i.qty).toFixed(2)}\n`;
    });

    msg += `\nSubtotal: R$ ${subtotal.toFixed(2)}`;

    if (activeCoupon && discount > 0) {
        msg += `\n🎫 *Cupom:* ${activeCoupon.code}`;
        msg += `\n📉 *Desconto:* - R$ ${discount.toFixed(2)}`;
    }

    msg += `\n\n💰 *TOTAL FINAL: R$ ${total.toFixed(2)}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    store.clearCart(); 
    window.location.hash = '#/';
    window.showToast('Pedido Enviado! Aguardando Aprovação.', 'success', 3000);
};

/* --- FUNÇÕES DE APROVAÇÃO DE PEDIDOS (NOVO) --- */
window.approveOrder = (orderId) => {
    if(confirm('Confirmar pagamento e baixar estoque?')) {
        if(store.approveOrder(orderId)) {
            window.showToast('Pedido Aprovado! Estoque atualizado.', 'success');
            Admin.render(); // Atualiza lista de pedidos (incluindo filtros e total de vendas)
        } else {
            window.showToast('Erro ao aprovar.', 'error');
        }
    }
};

window.rejectOrder = (orderId) => {
    if(confirm('Rejeitar pedido?')) {
        if(store.rejectOrder(orderId)) {
            window.showToast('Pedido Rejeitado.', 'info');
            Admin.render(); // Atualiza lista de pedidos (incluindo filtros)
        }
    }
};

/* --- START --- */
window.addEventListener('hashchange', router);
window.addEventListener('load', () => { 
    if (localStorage.getItem('vm_theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    store.logVisit(); 
    window.fillSidebar(); 
    router(); 
});
window.addEventListener('cart-updated', UI.updateBadge);
const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('overlay');
document.getElementById('btn-menu').onclick = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
document.getElementById('close-sidebar').onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
document.getElementById('overlay').onclick = document.getElementById('close-sidebar').onclick;
document.getElementById('btn-cart').onclick = () => window.location.hash = '#/cart';
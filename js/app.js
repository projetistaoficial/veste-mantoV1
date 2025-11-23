import { store } from './store.js';
import { UI } from './ui.js';
import { Admin } from './admin.js';

const WHATSAPP_NUMBER = "5511941936976"; 
let currentSlideIndex = 0; 

/* --- TOUCH SWIPE (ADMIN) --- */
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
window.selectRow = (id) => { Admin.selectedRowId = id; Admin.render(); };
window.searchInventory = (val) => { Admin.setSearch(val); };

/* --- SIDEBAR --- */
const fillSidebar = () => {
    const list = document.getElementById('category-list');
    if (!list) return;
    let html = `<li onclick="window.location.hash='#/'; document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open');" style="cursor:pointer; padding:10px; border-bottom:1px solid #333; font-size: 2vh; font-weight: bold; list-style-type: none">Todos os Produtos</li>`;
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

    const slidesHtml = images.map((img) => `<div class="slide"><img src="${img}"></div>`).join('');
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
    if(store.addToCart(p, size, qty)) { document.getElementById('product-modal').close(); alert('Adicionado!'); } 
};

/* --- ADMIN: LOGIN & SAVE --- */
window.tryLogin = () => { if (store.login(document.getElementById('admin-pass').value)) Admin.render(); else alert('Senha incorreta!'); };
window.toggleStockConfig = () => { store.toggleNegativeStock(); };

window.saveProductForm = () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const desc = document.getElementById('prod-desc').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const category = document.getElementById('prod-cat').value;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim());
    const fileInput = document.getElementById('prod-imgs'); 

    if(!name || !price || !stock) return alert('Preencha campos obrigatórios');

    const finishSave = (imagesArray) => {
        let finalImages = imagesArray;
        // Persistência de imagem antiga se não houver nova
        if ((!imagesArray || imagesArray.length === 0) && id) {
            const oldProd = store.getProductById(id);
            if(oldProd) finalImages = oldProd.images || (oldProd.image ? [oldProd.image] : []);
        }
        const product = { id: id ? parseInt(id) : null, name, description: desc, price: parseFloat(price), stock: parseInt(stock), category, sizes, images: finalImages };
        store.saveProduct(product); 
        alert('Salvo!'); 
        Admin.render();
        window.fillSidebar();
    };
    if (fileInput.files.length > 0) Admin.handleImagesUpload(fileInput.files, finishSave); else finishSave([]);
};

// --- CORREÇÃO: EDIÇÃO DE PRODUTO ---
window.editProduct = (id) => {
    const p = store.getProductById(id);
    if(!p) return;

    // Preenche campos
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-desc').value = p.description || '';
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-sizes').value = p.sizes.join(',');
    document.getElementById('prod-cat').value = p.category;
    
    // Preview Imagens
    const previewDiv = document.getElementById('existing-imgs');
    if (previewDiv) {
        previewDiv.innerHTML = '<small style="width:100%; color:#aaa; margin-bottom:5px;">Imagens Atuais:</small>';
        // Compatibilidade
        const imgs = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
        
        imgs.forEach(img => {
            previewDiv.innerHTML += `<img src="${img}" style="width:50px; height:50px; object-fit:cover; border:1px solid #555; margin-right:5px;">`;
        });
    }
    
    // Rola suavemente para o formulário
    const formArea = document.getElementById('product-form-area'); // Novo ID adicionado no admin.js
    if(formArea) formArea.scrollIntoView({ behavior: 'smooth' });
    
    window.selectRow(id);
};

window.clearForm = () => {
    document.getElementById('prod-id').value = ''; 
    document.getElementById('prod-name').value = ''; 
    document.getElementById('prod-desc').value = '';
    document.getElementById('prod-price').value = ''; 
    document.getElementById('prod-stock').value = ''; 
    document.getElementById('prod-sizes').value = '';
    document.getElementById('prod-imgs').value = ''; 
    const prev = document.getElementById('existing-imgs'); if(prev) prev.innerHTML = '';
};

window.deleteProduct = (id) => { if(confirm('Excluir?')) { store.deleteProduct(id); Admin.render(); window.fillSidebar(); } };

/* --- CATEGORIAS/CUPONS --- */
window.addCategoryUI = () => { const v = document.getElementById('new-cat').value; if(v) { store.addCategory(v); Admin.render(); window.fillSidebar(); } };
window.deleteCategoryUI = (n) => { if(confirm('Remover?')) { store.deleteCategory(n); Admin.render(); window.fillSidebar(); } };
window.addCouponUI = () => { const c = document.getElementById('new-coupon-code').value; const v = document.getElementById('new-coupon-val').value; if(c && v) { store.addCoupon(c,v); Admin.render(); } };
window.deleteCouponUI = (c) => { store.deleteCoupon(c); Admin.render(); };

/* --- CARRINHO --- */
window.removeItem = (idx) => { store.removeFromCart(idx); UI.renderCart(); };
window.applyCouponUI = () => { const c = document.getElementById('coupon-code').value; if(store.applyCoupon(c).success) UI.renderCart(); else alert('Inválido'); };
window.removeCoupon = () => { 
    store.state.activeCoupon = null; // Remove cupom direto
    UI.renderCart(); 
};
window.finalizeOrder = () => {
    const cart = store.state.cart;
    if (cart.length === 0) return;
    store.logConversion(); store.decreaseStock(cart);
    const { total } = store.getCartTotal();
    let msg = `Olá! Pedido:\n\n`;
    cart.forEach(i => msg += `• ${i.name} (${i.size}) x${i.qty}\n`);
    msg += `\nTotal: R$ ${total.toFixed(2)}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    store.clearCart(); window.location.hash = '#/';
};

/* --- START --- */
window.addEventListener('hashchange', router);
window.addEventListener('load', () => { store.logVisit(); window.fillSidebar(); router(); });
window.addEventListener('cart-updated', UI.updateBadge);
const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('overlay');
document.getElementById('btn-menu').onclick = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
document.getElementById('close-sidebar').onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
document.getElementById('overlay').onclick = document.getElementById('close-sidebar').onclick;
document.getElementById('btn-cart').onclick = () => window.location.hash = '#/cart';
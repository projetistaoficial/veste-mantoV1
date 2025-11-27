import { store } from './store.js';

// Função auxiliar de formatação de preço (Melhor usar a toLocaleString como em admin.js para evitar erros de tipagem)
const formatPrice = (val) => {
    // Garante que o valor é um número para evitar NaN
    const value = parseFloat(val) || 0; 
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
};

export const UI = {
    // ----------------------------------------------------
    // RENDERIZAÇÃO DA HOME (VITRINE)
    // ----------------------------------------------------
    renderHome(category = 'Todos') {
        // A função getProducts já existe e filtra corretamente
        const products = store.getProducts(category);
        const app = document.getElementById('app');
        
        // Cabeçalho da categoria com Contagem
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:end; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom:5px;">
                <h2 style="font-size:1.2rem; color: gray; margin:0;">${category}</h2>
                <span style="font-size:0.9rem; color:var(--accent-color);">${products.length} itens</span>
            </div>
            <div class="product-grid">
        `;
        
        if(products.length === 0) html += `<p>Nenhum produto encontrado nesta categoria.</p>`;
        
        products.forEach(p => {
            // Compatibilidade de imagem
            let img = 'assets/placeholder.png';
            if (p.images && p.images.length > 0) img = p.images[0];
            else if (p.image) img = p.image;

            const settings = store.state.settings || { allowNegativeStock: false };
            const isOutOfStock = !settings.allowNegativeStock && p.stock <= 0;
            
            const btnText = isOutOfStock ? 'Esgotado' : 'Ver Detalhes';
            const btnStyle = isOutOfStock ? 'background:#555; color:#aaa; border-color:#555; cursor:not-allowed;' : '';

            html += `<div class="card">
                ${isOutOfStock ? '<span class="badge" style="top:10px; right:10px; width:auto; padding:2px 8px; border-radius:4px;">ESGOTADO</span>' : ''}
                
                <img src="${img}" alt="${p.name}" class="card-image" style="${isOutOfStock ? 'opacity:0.5' : ''}">
                
                <div class="card-details">
                    <h3 style="margin-bottom: 2px;">${p.name}</h3>
                    <p class="card-desc">${p.description || 'Sem descrição disponível.'}</p>
                    <div class="price">${formatPrice(p.price)}</div>
                    <button class="btn-add" onclick="${isOutOfStock ? '' : `window.openProductModal(${p.id})`}" style="${btnStyle}">
                        ${btnText}
                    </button>
                </div>
            </div>`;
        });
        html += `</div>`;
        app.innerHTML = html;
    },

    // ----------------------------------------------------
    // RENDERIZAÇÃO DO CARRINHO (CHECKOUT)
    // ----------------------------------------------------
    renderCart() {
        const cart = store.state.cart;
        const app = document.getElementById('app');
        const { subtotal, total, discount } = store.getCartTotal();
        const activeCoupon = store.state.activeCoupon;

        // Cabeçalho do Carrinho
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">
                <h2 class="section-title" style="margin:0; border:none;">Seu Carrinho</h2>
                <button onclick="window.location.hash='#/'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
        `;

        if (cart.length === 0) {
            html += '<p style="text-align:center; margin-top:50px; color:#888;">Seu carrinho está vazio.</p>';
            html += '<button onclick="window.location.hash=\'#/\'" class="btn-primary" style="margin-top:20px;">Ver Produtos</button>';
            app.innerHTML = html;
            return;
        }

        html += `<div class="cart-list">`;
        
        cart.forEach((item, index) => {
            // Imagem do produto, prioriza item.image se existir (para carrinho)
            const thumb = item.image || 'assets/placeholder.png'; 

            html += `<div class="list-item">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${thumb}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    <div>
                        <strong>${item.name}</strong> <br> 
                        <small>Tam: ${item.size} | Qtd: ${item.qty}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div>${formatPrice(item.price * item.qty)}</div>
                    <button onclick="window.removeItem(${index})" style="color:red; background:none; border:none; font-size:0.8rem; margin-top:5px;">Remover</button>
                </div>
            </div>`;
        });

        html += `
            <div class="coupon-area">
                <input type="text" id="coupon-code" placeholder="Cupom" value="${activeCoupon ? activeCoupon.code : ''}" ${activeCoupon ? 'disabled' : ''}>
                ${activeCoupon 
                    ? `<button class="btn-danger" onclick="window.removeCoupon()">X</button>` 
                    : `<button class="btn-secondary" onclick="window.applyCouponUI()">Aplicar</button>`}
            </div>
            <div id="coupon-msg" class="coupon-msg">
                ${activeCoupon ? `<span class="text-success">-${activeCoupon.discount}% aplicado</span>` : ''}
            </div>
        `;

        html += `</div><div style="margin-top:20px; border-top:1px solid #555; padding-top:10px; font-size:1rem; text-align:right;">
            Subtotal: ${formatPrice(subtotal)} <br>
            ${discount > 0 ? `<span class="text-success">Desconto: -${formatPrice(discount)}</span><br>` : ''}
            <span style="font-size:1.4rem; font-weight:bold;">Total: ${formatPrice(total)}</span>
        </div>
        <button class="btn-primary" onclick="window.finalizeOrder()">FINALIZAR NO WHATSAPP</button>`;
        
        app.innerHTML = html;
    }
};

// ----------------------------------------------------
// FUNÇÃO GLOBAL DE ATUALIZAÇÃO DA SIDEBAR/BADGE
// ----------------------------------------------------

/**
 * Atualiza o badge de contagem de itens e a pré-visualização do total na sidebar/menu.
 * Chamada no app.js após qualquer modificação no carrinho.
 */
window.fillSidebar = () => {
    const elCount = document.getElementById('cart-count');
    const elTotal = document.getElementById('cart-total-preview');
    const elSideTotal = document.getElementById('sidebar-total'); 

    const cartCount = store.state.cart.reduce((acc, item) => acc + item.qty, 0);
    const { total } = store.getCartTotal();

    if (elCount) elCount.innerText = cartCount;
    if (elTotal) elTotal.innerText = formatPrice(total);
    
    // Atualiza o total dentro do painel lateral (se existir)
    if (elSideTotal) elSideTotal.innerHTML = `Total: <strong>${formatPrice(total)}</strong>`; 
};

// A função original updateBadge foi movida para window.fillSidebar e aprimorada para consistência.
// O módulo UI agora está perfeito.
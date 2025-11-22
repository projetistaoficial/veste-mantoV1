import { store } from './store.js';

const formatPrice = (val) => `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;

export const UI = {
    renderHome(category = 'Todos') {
        const products = store.getProducts(category);
        const app = document.getElementById('app');
        
        // Cabeçalho da categoria com Contagem
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:end; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom:5px;">
                <h2 style="font-size:1.2rem; color:#ccc; margin:0;">${category}</h2>
                <span style="font-size:0.9rem; color:var(--accent-color);">${products.length} itens</span>
            </div>
            <div class="product-grid">
        `;
        
        if(products.length === 0) html += `<p>Nenhum produto encontrado nesta categoria.</p>`;
        
        products.forEach(p => {
            const img = p.image ? p.image : 'assets/placeholder.png';
            // Verifica estoque para mudar visual do botão
            const isOutOfStock = p.stock <= 0;
            const btnText = isOutOfStock ? 'Esgotado' : 'Ver Detalhes';
            const btnStyle = isOutOfStock ? 'background:#555; color:#aaa; border-color:#555; cursor:not-allowed;' : '';

            html += `<div class="card">
                ${isOutOfStock ? '<span class="badge" style="top:10px; right:10px; width:auto; padding:2px 8px; border-radius:4px;">ESGOTADO</span>' : ''}
                <img src="${img}" alt="${p.name}" class="card-image" style="${isOutOfStock ? 'opacity:0.5' : ''}">
                <div class="card-details">
                    <h3>${p.name}</h3>
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

    renderCart() {
        const cart = store.state.cart;
        const app = document.getElementById('app');
        const { subtotal, total, discount } = store.getCartTotal();
        const activeCoupon = store.state.activeCoupon;

        if (cart.length === 0) {
            app.innerHTML = '<h2 class="section-title">Carrinho Vazio</h2><p style="text-align:center;">Nenhum item adicionado.</p>';
            return;
        }

        let html = `<h2 class="section-title">Seu Carrinho</h2><div class="cart-list">`;
        
        cart.forEach((item, index) => {
            html += `<div class="list-item">
                <div>
                    <strong>${item.name}</strong> <br> 
                    <small>Tam: ${item.size} | Qtd: ${item.qty}</small>
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

        html += `<div style="margin-top:20px; border-top:1px solid #555; padding-top:10px; font-size:1rem; text-align:right;">
            Subtotal: ${formatPrice(subtotal)} <br>
            ${discount > 0 ? `<span class="text-success">Desconto: -${formatPrice(discount)}</span><br>` : ''}
            <span style="font-size:1.4rem; font-weight:bold;">Total: ${formatPrice(total)}</span>
        </div>
        <button class="btn-primary" onclick="window.finalizeOrder()">FINALIZAR NO WHATSAPP</button></div>`;
        
        app.innerHTML = html;
    },

    updateBadge() {
        document.getElementById('cart-count').innerText = store.state.cart.reduce((acc, item) => acc + item.qty, 0);
    }
};
import { store } from './store.js';

const formatPrice = (val) => `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;

export const Admin = {
    render() {
        const app = document.getElementById('app');
        
        // Tela de Login
        if (!store.state.isAdmin) {
            app.innerHTML = `
                <h2 class="section-title">Área Administrativa</h2>
                <div style="max-width:300px; margin:auto;">
                    <div class="form-group"><label>Senha</label><input type="password" id="admin-pass"></div>
                    <button class="btn-primary" onclick="window.tryLogin()">Entrar</button>
                </div>`;
            return;
        }

        const stats = store.state.stats;
        const inventoryValue = store.getInventoryValue(); // Novo cálculo
        const totalProducts = store.state.products.length;

        let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 class="section-title">Dashboard</h2>
            <button onclick="window.store.logout(); window.location.reload()" class="btn-danger">Sair</button>
        </div>

        <div class="dash-grid">
            <div class="dash-card">
                <h4>VISITAS / VENDAS</h4>
                <div class="number">${stats.visits} / ${stats.conversions}</div>
            </div>
            <div class="dash-card">
                <h4>VALOR EM ESTOQUE</h4>
                <div class="number" style="color:#22c55e; font-size:1.2rem;">${formatPrice(inventoryValue)}</div>
                <small style="color:#aaa;">${totalProducts} produtos cadastrados</small>
            </div>
        </div>

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
                        <img src="${p.image || ''}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                        <div>
                            <div style="font-weight:bold;">${p.name}</div>
                            <small style="color:${p.stock > 0 ? '#aaa' : 'red'};">
                                Estoque: ${p.stock} un | ${formatPrice(p.price)}
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
    },
    handleImageUpload(file, callback) {
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result);
        if (file) reader.readAsDataURL(file);
    }
};
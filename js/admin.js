import { store } from './store.js';

const formatPrice = (val) => `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;

export const Admin = {
    currentTab: 'all',
    searchQuery: '',
    selectedRowId: null,

    // Variáveis de Swipe
    touchStartX: 0,
    touchEndX: 0,

    switchTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    setSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.render();
    },

    render() {
        const app = document.getElementById('app');
        
        if (!store.state.isAdmin) {
            app.innerHTML = `<h2 class="section-title">Área Administrativa</h2><div style="max-width:300px; margin:auto;"><div class="form-group"><label>Senha</label><input type="password" id="admin-pass"></div><button class="btn-primary" onclick="window.tryLogin()">Entrar</button></div>`;
            return;
        }

        const stats = store.state.stats;
        const inventoryValue = store.getInventoryValue();
        const totalProducts = store.state.products.length;
        const settings = store.state.settings || { allowNegativeStock: false };

        let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 class="section-title">Dashboard</h2>
            <button onclick="window.store.logout(); window.location.reload()" class="btn-danger">Sair</button>
        </div>

        <div class="dash-card" style="margin-bottom:15px; border:1px solid #444; background:#222; text-align:left; display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="stock-toggle" onchange="window.toggleStockConfig()" ${settings.allowNegativeStock ? 'checked' : ''} style="width:20px; height:20px;">
            <div>
                <strong style="color:var(--accent-color);">Venda Sem Estoque</strong><br>
                <small style="color:#aaa;">Permitir compra com estoque zero.</small>
            </div>
        </div>

        <div class="dash-grid">
            <div class="dash-card"><h4>VISITAS / VENDAS</h4><div class="number">${stats.visits} / ${stats.conversions}</div></div>
            <div class="dash-card"><h4>CAPITAL GIRO</h4><div class="number" style="color:#22c55e;">${formatPrice(inventoryValue)}</div><small>${totalProducts} produtos</small></div>
        </div>

        <h3 class="section-title">Categorias</h3>
        <div class="form-group" style="display:flex; gap:10px;">
            <input type="text" id="new-cat" placeholder="Nova Categoria">
            <button class="btn-secondary" onclick="window.addCategoryUI()">Add</button>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:30px;">
            ${store.state.categories.map(c => `<span style="background:#444; padding:5px 10px; border-radius:15px; font-size:0.9rem;">${c} <span onclick="window.deleteCategoryUI('${c}')" style="cursor:pointer; color:red; margin-left:5px;">&times;</span></span>`).join('')}
        </div>

        <h3 class="section-title">Cupons</h3>
        <div class="form-group" style="display:flex; gap:10px;">
            <input type="text" id="new-coupon-code" placeholder="Código">
            <input type="number" id="new-coupon-val" placeholder="%" style="width:80px;">
            <button class="btn-secondary" onclick="window.addCouponUI()">Criar</button>
        </div>
        <div style="margin-bottom:30px;">
            ${store.state.coupons.map(c => `<div class="list-item"  style="color: white"><span><strong>${c.code}</strong> (${c.discount}%)</span><button onclick="window.deleteCouponUI('${c.code}')" style="color:red; background:none; border:none;">🗑️</button></div>`).join('')}
        </div>

        <h3 class="section-title">Produto</h3>
        <div class="form-group" style="background:#333; padding:15px; border-radius:8px; margin-bottom:20px;" id="product-form-area">
            <input type="hidden" id="prod-id">
            <label>Nome:</label><input type="text" id="prod-name" placeholder="Nome" style="margin-bottom:10px;">
            <label>Descrição:</label><textarea id="prod-desc" rows="3" placeholder="Descrição detalhada..." style="width:100%; padding:10px; margin-bottom:10px; background:#444; color:white; border:none;"></textarea>
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <div style="flex:1"><label>Preço:</label><input type="number" id="prod-price" placeholder="0.00" step="0.01"></div>
                <div style="flex:1"><label>Estoque:</label><input type="number" id="prod-stock" placeholder="Qtd"></div>
            </div>
            <label>Categoria:</label><select id="prod-cat" style="margin-bottom:10px;">${store.state.categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <label>Tamanhos:</label><input type="text" id="prod-sizes" placeholder="P, M, G" style="margin-bottom:10px;">
            
            <label>Fotos (Múltiplas):</label>
            <input type="file" id="prod-imgs" accept="image/*" multiple style="margin-bottom:5px;">
            
            <div id="existing-imgs" style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:15px;"></div>
            
            <button class="btn-primary" onclick="window.saveProductForm()">Salvar Produto</button>
            <button class="btn-secondary" onclick="window.clearForm()" style="margin-top:5px; width:100%; background:#555;">Limpar / Cancelar</button>
        </div>

        <h3 class="section-title">Inventário</h3>
        
        <div style="position:relative; margin-bottom:15px;">
            <input type="text" 
                   id="inventory-search"
                   placeholder="Pesquisar produto..." 
                   value="${this.searchQuery}" 
                   onkeyup="window.searchInventory(this.value)" 
                   style="width:100%; padding:10px 10px 10px 40px; border-radius:20px; border:1px solid #444; background:#222; color:white;">
            <span class="material-icons" style="position:absolute; left:10px; top:8px; color:#888;">search</span>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button onclick="import('./js/admin.js').then(m => m.Admin.switchTab('all'))" class="btn-secondary" style="${this.currentTab === 'all' ? 'background:var(--accent-color); color:black;' : ''}">Todos</button>
            <button onclick="import('./js/admin.js').then(m => m.Admin.switchTab('cats'))" class="btn-secondary" style="${this.currentTab === 'cats' ? 'background:var(--accent-color); color:black;' : ''}">Por Categoria</button>
        </div>
        
        <div style="display:grid; gap:10px;" id="product-list-container">`;

        let filteredProducts = store.state.products.filter(p => p.name.toLowerCase().includes(this.searchQuery));

        if (this.currentTab === 'all') {
            html += this.renderProductList(filteredProducts);
        } else {
            store.state.categories.forEach(cat => {
                const prodsInCat = filteredProducts.filter(p => p.category === cat);
                if (prodsInCat.length > 0) {
                    html += `<h4 style="margin:15px 0 5px 0; color:var(--accent-color); border-bottom:1px solid #444">${cat}</h4>`;
                    html += this.renderProductList(prodsInCat);
                }
            });
        }
        
        html += `</div>`;
        app.innerHTML = html;

        this.attachKeyboardEvents();

        // --- CORREÇÃO DO FOCO NA BUSCA ---
        // Restaura o foco para o input de busca após renderizar
        const searchInput = document.getElementById('inventory-search');
        if (searchInput && this.searchQuery) {
            searchInput.focus();
            // Move o cursor para o final do texto (truque do value = value)
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
        }
    },

    renderProductList(products) {
        if(products.length === 0) return '<p style="color:#666; text-align:center;">Nenhum produto.</p>';
        
        return products.map(p => {
            let thumb = 'assets/placeholder.png';
            if (p.images && p.images.length > 0) thumb = p.images[0];
            else if (p.image) thumb = p.image;

            const isSelected = this.selectedRowId === p.id ? 'selected' : '';
            
            return `
            <div class="list-item swipe-container ${isSelected}" 
                 id="row-${p.id}"
                 onclick="window.selectRow(${p.id})" 
                 ondblclick="window.editProduct(${p.id})"
                 ontouchstart="window.handleTouchStart(event, ${p.id})"
                 ontouchmove="window.handleTouchMove(event, ${p.id})"
                 ontouchend="window.handleTouchEnd(event, ${p.id})">
                
                <div class="swipe-delete-btn" onclick="event.stopPropagation(); window.deleteProduct(${p.id})">
                    <span class="material-icons">delete</span>
                </div>

                <div class="swipe-content">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${thumb}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                        <div>
                            <div style="font-weight:bold; color: white">${p.name}</div>
                            <small style="color:#aaa;">
                                Est: <span style="color:${p.stock > 0 ? '#fff' : 'red'}">${p.stock}</span> | 
                                Vend: <span style="color:var(--success)">${p.sold || 0}</span>
                            </small>
                        </div>
                    </div>
                    <div>
                        <button onclick="event.stopPropagation(); window.editProduct(${p.id})" style="margin-right:5px; background:none; border:none; color:#ccc;">✏️</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    attachKeyboardEvents() {
        document.removeEventListener('keydown', this.handleKeyDelete);
        document.addEventListener('keydown', this.handleKeyDelete);
    },

    handleKeyDelete(e) {
        if (e.key === 'Delete' && Admin.selectedRowId) {
            if(confirm('Excluir produto selecionado?')) {
                store.deleteProduct(Admin.selectedRowId);
                Admin.selectedRowId = null;
                Admin.render();
                if(window.fillSidebar) window.fillSidebar();
            }
        }
    },

    handleImagesUpload(fileList, callback) {
        const promises = Array.from(fileList).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        });
        Promise.all(promises).then(imagesArray => callback(imagesArray));
    }
};
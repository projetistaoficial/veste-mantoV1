import { store } from './store.js';

function formatPrice(value) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}


export const Admin = {
    currentTab: 'all', 
    searchQuery: '', 
    selectedRowId: null,

    // NOVO ESTADO: Controla a visibilidade dos filtros de Pedido
    orderFiltersVisible: true, // Começa visível por padrão

    // ESTADOS DE FILTRO DE PEDIDOS
    orderFilterStatus: 'all', 
    filterStartDate: '',      
    filterEndDate: '',        

    // Variáveis de Swipe
    touchStartX: 0,
    touchEndX: 0,

    switchTab(tab) {
        if (tab === 'inventory') {
            this.currentTab = 'all';
        } else {
            this.currentTab = tab;
        }
        // Limpa a busca ao mudar de aba
        this.searchQuery = '';
        // Reseta a visibilidade dos filtros ao trocar de aba para 'orders'
        if (tab === 'orders') {
            this.orderFiltersVisible = true;
        }
        this.render();
    },

    setSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.render();
    },
    
    // NOVO MÉTODO: Alterna a visibilidade dos filtros de pedido
    toggleOrderFilters() {
        this.orderFiltersVisible = !this.orderFiltersVisible;
        this.render();
    },

    setOrderFilter(type, value) {
        if (type === 'status') {
            this.orderFilterStatus = value;
        } else if (type === 'start') {
            this.filterStartDate = value;
        } else if (type === 'end') {
            this.filterEndDate = value;
        }
        this.render(); 
    },

    clearOrderFilters() {
        this.orderFilterStatus = 'all';
        this.filterStartDate = '';
        this.filterEndDate = '';
        this.searchQuery = ''; 
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
        const pendingOrdersCount = store.state.orders.filter(o => o.status === 'pending').length;

        const isInventoryConfigActive = this.currentTab !== 'orders';

        let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 class="section-title">Dashboard</h2>
            <button onclick="window.store.logout(); window.location.reload()" class="btn-danger">Sair</button>
        </div>
        
        <div style="display:flex; gap:10px; margin-bottom:15px; overflow-x: auto; padding-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 15px;">
            <button onclick="Admin.switchTab('inventory')" 
                    class="btn-secondary" 
                    style="${isInventoryConfigActive ? 'background:var(--accent-color); color:black;' : ''}">Inventário & Config.</button>
            
            <button onclick="Admin.switchTab('orders')" 
                    class="btn-secondary" 
                    style="${this.currentTab === 'orders' ? 'background:var(--accent-color); color:black;' : ''}">
                Pedidos 
                ${pendingOrdersCount > 0 ? `<span class="badge" style="position:static; margin-left:5px; background:red;">${pendingOrdersCount}</span>` : ''}
            </button>
        </div>

        <div id="admin-content-area">`;

        // ----------------------------------------------------
        // LÓGICA DE RENDERIZAÇÃO
        // ----------------------------------------------------

        if (this.currentTab === 'orders') {
            html += this.renderOrders();
        } else {
            // ... [O restante da renderização do Inventário/Config permanece inalterado]
            
            html += `
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
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:30px; color: white">
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
                    <button onclick="Admin.switchTab('all')" class="btn-secondary" style="${this.currentTab === 'all' ? 'background:var(--accent-color); color:black;' : ''}">Todos</button>
                    <button onclick="Admin.switchTab('cats')" class="btn-secondary" style="${this.currentTab === 'cats' ? 'background:var(--accent-color); color:black;' : ''}">Por Categoria</button>
                </div>
                
                <div style="display:grid; gap:10px;" id="product-list-container">`;

            let filteredProducts = store.state.products.filter(p => p.name.toLowerCase().includes(this.searchQuery));

            if (this.currentTab === 'all') { 
                html += this.renderProductList(filteredProducts);
            } else if (this.currentTab === 'cats') {
                store.state.categories.forEach(cat => {
                    const prodsInCat = filteredProducts.filter(p => p.category === cat);
                    if (prodsInCat.length > 0) {
                        html += `<h4 style="margin:15px 0 5px 0; color:var(--accent-color); border-bottom:1px solid #444">${cat}</h4>`;
                        html += this.renderProductList(prodsInCat);
                    }
                });
            }
            
            html += `</div>`;
        }
        
        // ----------------------------------------------------

        html += `</div>`; 
        app.innerHTML = html;

        this.attachKeyboardEvents();

        const searchInput = document.getElementById('inventory-search') || document.getElementById('order-search');
        if (searchInput && this.searchQuery) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
        }
    },
    
    renderOrders() {
        let orders = store.state.orders.sort((a, b) => b.id - a.id); 
        let totalSalesValue = 0;
        
        const currentSearchQuery = this.searchQuery.trim();
        
        // 1. FILTRAGEM POR NÚMERO DE PEDIDO (ID)
        if (currentSearchQuery) {
            orders = orders.filter(o => 
                o.id.toString().includes(currentSearchQuery) || 
                (`#${o.id.toString().slice(-4)}`).includes(currentSearchQuery)
            );
        }

        // 2. FILTRAGEM POR STATUS
        if (this.orderFilterStatus !== 'all') {
            orders = orders.filter(o => o.status === this.orderFilterStatus);
        }

        // 3. FILTRAGEM POR PERÍODO (Entre Datas)
        const start = this.filterStartDate ? new Date(this.filterStartDate) : null;
        const end = this.filterEndDate ? new Date(this.filterEndDate) : null;
        
        if (start || end) {
            orders = orders.filter(order => {
                const dateParts = order.date.split(',')[0].split('/');
                const orderDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`); 
                
                let dateMatch = true;
                if (start && orderDate < start) dateMatch = false;
                
                if (end) {
                    const nextDay = new Date(end);
                    nextDay.setDate(nextDay.getDate() + 1);
                    if (orderDate >= nextDay) dateMatch = false;
                }
                return dateMatch;
            });
        }
        
        // 4. CÁLCULO DO TOTAL DE VENDAS FINALIZADAS (Apenas 'approved')
        const allApprovedOrders = store.state.orders
            .filter(o => o.status === 'approved');
            
        totalSalesValue = allApprovedOrders.reduce((acc, o) => acc + o.total, 0);

        // Estilo para a seta (arrow)
        const arrowStyle = this.orderFiltersVisible ? 'transform: rotate(180deg);' : '';
        const filtersDisplay = this.orderFiltersVisible ? 'display:grid;' : 'display:none;';


        let orderHtml = `
            <h3 class="section-title" style="margin-top:0;">Estatísticas de Vendas</h3>
            <div class="dash-card" style="margin-bottom:20px; text-align:center;">
                <p style="margin:0; font-size:0.9rem; color:#aaa;">Valor Total de Vendas Finalizadas (Aprovadas):</p>
                <h3 style="color:var(--success); margin:5px 0 0 0;">${formatPrice(totalSalesValue)}</h3>
            </div>
            
            <div style="margin-bottom:10px; padding:10px; background:#333; border-radius:8px;">
                <h3 class="section-title" 
                    onclick="Admin.toggleOrderFilters()"
                    style="margin:0; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    Filtros de Pedido
                    <span class="material-icons" style="transition: transform 0.3s; ${arrowStyle}">expand_more</span>
                </h3>
            </div>

            <div class="filter-controls" 
                 style="margin-bottom:20px; padding:15px; background:#222; border-radius:8px; grid-template-columns: 1fr 1fr; gap:10px; ${filtersDisplay}">
                
                <div style="grid-column: 1 / -1; position:relative;">
                    <label for="order-search">Buscar Ref. Pedido (Ex: #1234):</label>
                    <input type="text" 
                                 id="order-search"
                                 placeholder="Buscar por ID..." 
                                 value="${this.searchQuery}" 
                                 onkeyup="Admin.setSearch(this.value)" 
                                 style="width:100%; padding:10px 10px 10px 10px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                </div>

                <div style="grid-column: 1 / -1;"><label for="order-status-filter">Status:</label>
                <select id="order-status-filter" onchange="Admin.setOrderFilter('status', this.value)" style="width:100%; padding:8px; background:#333; color:white; border:none; border-radius:4px;">
                    <option value="all">Todos os Pedidos</option>
                    <option value="pending" ${this.orderFilterStatus === 'pending' ? 'selected' : ''}>Pendentes</option>
                    <option value="approved" ${this.orderFilterStatus === 'approved' ? 'selected' : ''}>Aprovados (Venda Concluída)</option>
                    <option value="rejected" ${this.orderFilterStatus === 'rejected' ? 'selected' : ''}>Rejeitados</option>
                </select></div>

                <div><label for="filter-start-date">Data Inicial:</label>
                <input type="date" id="filter-start-date" value="${this.filterStartDate}" onchange="Admin.setOrderFilter('start', this.value)" style="width:100%; padding:8px; background:#333; color:white; border:none; border-radius:4px;"></div>
                
                <div><label for="filter-end-date">Data Final:</label>
                <input type="date" id="filter-end-date" value="${this.filterEndDate}" onchange="Admin.setOrderFilter('end', this.value)" style="width:100%; padding:8px; background:#333; color:white; border:none; border-radius:4px;"></div>
                
                <button onclick="Admin.clearOrderFilters()" class="btn-secondary" style="grid-column: 1 / -1; background:#444;">Limpar Filtros de Pedido</button>
            </div>
        
        <h3 class="section-title">Lista de Pedidos (${orders.length} encontrados)</h3>`;
        

        if (orders.length === 0) {
            orderHtml += '<p style="color:#666; text-align:center;">Nenhum pedido encontrado com os filtros atuais.</p>';
            return orderHtml;
        }

        orderHtml += orders.map(o => {
            const isPending = o.status === 'pending';
            const isApproved = o.status === 'approved'; // Nova variável
            const statusColor = isPending ? 'orange' : (isApproved ? 'var(--success)' : 'red');
            const statusText = isPending ? 'PENDENTE' : (isApproved ? 'APROVADO' : 'REJEITADO / ESTORNADO'); // Atualizado
            const orderRef = `#${o.id.toString().slice(-4)}`;

            const itemsList = o.items.map(i => 
                `<small style="display:block;">${i.qty}x ${i.name} (${i.size}) - ${formatPrice(i.price)}</small>`
            ).join('');

            return `
                <div class="list-item" style="display:block; border-left: 5px solid ${statusColor}; margin-bottom: 10px; background:#222; padding:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--accent-color);">PEDIDO ${orderRef}</span>
                        <span style="font-size:0.8rem; color:${statusColor}; font-weight:bold;">${statusText}</span>
                    </div>
                    
                    <small style="color:#aaa;">Data: ${o.date}</small>
                    <div style="margin:10px 0; padding:10px; background:#333; border-radius:4px;">
                        ${itemsList}
                    </div>
                    
                    <p style="margin:0; font-size:1rem; font-weight:bold;">Total: ${formatPrice(o.total)}
                        ${o.discount > 0 ? `<br><small style="color:var(--success);">Desconto: ${formatPrice(o.discount)} (${o.coupon})</small>` : ''}
                    </p>

                    ${isPending ? `
                        <div style="margin-top:10px; display:flex; gap:10px;">
                            <button class="btn-primary" style="background:var(--success); flex:1;" onclick="window.approveOrder(${o.id})">Aprovar</button>
                            <button class="btn-danger" style="flex:1;" onclick="window.rejectOrder(${o.id})">Rejeitar</button>
                        </div>
                    ` : ''}

                    ${isApproved ? `
                        <div style="margin-top:10px;">
                            <button class="btn-danger" style="width:100%; background:darkred;" onclick="window.refundOrder(${o.id})">Estornar Venda (Reembolso)</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        return orderHtml;
    },

    // ... [Os métodos restantes (renderProductList, attachKeyboardEvents, etc.) permanecem inalterados]
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
        if (e.key === 'Delete' && Admin.selectedRowId && Admin.currentTab !== 'orders') {
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
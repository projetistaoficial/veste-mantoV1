import { store } from './store.js';

function formatPrice(value) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

// ----------------------------------------------------
// FUNÇÕES AUXILIARES GLOBAIS (PARA O CONTEXTO GLOBAL/WINDOW)
// ----------------------------------------------------

// Funções de Recadastro/Estorno (já estavam corretas, mantidas)
window.handleProductNotFound = (productsData) => {
    productsData.forEach(p => {
        const shouldRecadastrar = confirm(`⚠️ PRODUTO EXCLUÍDO ENCONTRADO!\n\nO produto "${p.name}" foi removido do catálogo.\nDeseja usar os dados do estorno para recadastrá-lo e devolver o estoque?`);

        if (shouldRecadastrar && window.fillProductFormForRecadastro) {
            window.fillProductFormForRecadastro(p);
        }
    });
};

window.fillProductFormForRecadastro = (data) => {
    // 1. Garante que estamos na aba de inventário
    Admin.switchTab('inventory');

    // 2. Limpa e Preenche
    window.clearForm();

    // Timeout para garantir que a renderização da aba terminou
    setTimeout(() => {
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-name').value = data.name;
        document.getElementById('prod-desc').value = data.description || 'Recadastrado via Estorno de Venda.';
        document.getElementById('prod-price').value = data.price ? data.price.toFixed(2) : '0.00';
        document.getElementById('prod-stock').value = data.stock;

        const catSelect = document.getElementById('prod-cat');
        if (catSelect) {
            // Tenta selecionar a categoria original ou a primeira disponível
            let catExists = false;
            for (let i = 0; i < catSelect.options.length; i++) {
                if (catSelect.options[i].value === data.category) {
                    catSelect.selectedIndex = i;
                    catExists = true;
                    break;
                }
            }
            if (!catExists && catSelect.options.length > 0) catSelect.selectedIndex = 0;
        }

        document.getElementById('prod-sizes').value = data.size || '';

        // 3. Rola e Destaca
        const formArea = document.getElementById('product-form-area');
        if (formArea) {
            formArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            formArea.style.border = '2px solid var(--accent-color)';
            formArea.style.transition = 'border 0.5s';
            setTimeout(() => formArea.style.border = '1px solid transparent', 3000);
        }

        alert(`Formulário preenchido com dados de "${data.name}".\nVerifique as informações e clique em SALVAR.`);
    }, 100);
};

// Funções de Formulário (já estavam corretas, mantidas)
window.clearForm = () => {
    const ids = ['prod-id', 'prod-name', 'prod-desc', 'prod-price', 'prod-stock', 'prod-sizes', 'prod-imgs'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const prev = document.getElementById('existing-imgs');
    if (prev) prev.innerHTML = '';
    Admin.selectedRowId = null;
    // Não chamamos Admin.render() aqui para evitar resetar a view se estivermos no meio de uma edição
};

// FUNÇÕES DE ADMINISTRAÇÃO CRÍTICAS (ADICIONADAS/CORRIGIDAS)
// ----------------------------------------------------

window.selectRow = (id) => {
    if (Admin.selectedRowId === id) {
        Admin.selectedRowId = null;
    } else {
        Admin.selectedRowId = id;
    }
    Admin.render(); // Re-renderiza para aplicar a classe 'selected'
};

window.editProduct = (id) => {
    const product = store.state.products.find(p => p.id === id);
    if (!product) {
        window.showToast('Produto não encontrado!', 'error');
        return;
    }

    // 1. Preenche o formulário
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-price').value = product.price.toFixed(2);
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-sizes').value = product.sizes ? product.sizes.join(', ') : '';

    const catSelect = document.getElementById('prod-cat');
    if (catSelect) {
        catSelect.value = product.category;
    }

    // 2. Renderiza imagens existentes (se houver)
    const existingImgsDiv = document.getElementById('existing-imgs');
    if (existingImgsDiv && product.images) {
        existingImgsDiv.innerHTML = product.images.map(url => `
            <div style="position:relative;">
                <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:4px;">
                <span onclick="window.removeImage('${url}')" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:15px; height:15px; text-align:center; font-size:10px; line-height:15px; cursor:pointer;">&times;</span>
            </div>
        `).join('');
    }

    // 3. Rola até o formulário
    const formArea = document.getElementById('product-form-area');
    if (formArea) {
        formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    Admin.selectedRowId = id; // Mantém a linha selecionada
    Admin.render();
};

window.deleteProduct = (id) => {
    if (confirm(`Tem certeza que deseja EXCLUIR o produto ID ${id}? Esta ação é irreversível!`)) {
        store.deleteProduct(id);
        window.showToast('Produto excluído!', 'success');
        Admin.selectedRowId = null;
        Admin.render();
    }
};

window.approveOrder = (orderId) => {
    if (confirm(`Aprovar o pedido ID ${orderId}? O estoque será atualizado.`)) {
        store.updateOrderStatus(orderId, 'approved');
        window.showToast('Pedido APROVADO! Estoque atualizado.', 'success', 3000);
        Admin.render();
    }
};

window.rejectOrder = (orderId) => {
    if (confirm(`Rejeitar o pedido ID ${orderId}? O estoque NÃO será devolvido, mas o status será alterado.`)) {
        store.updateOrderStatus(orderId, 'rejected');
        window.showToast('Pedido REJEITADO! Status alterado.', 'warning', 3000);
        Admin.render();
    }
};

window.refundOrder = (orderId) => {
    if (confirm(`ESTORNAR a venda do pedido ID ${orderId}? O estoque será DEVOLVIDO.`)) {
        store.refundOrder(orderId); // Assumindo que essa função faz o estorno e devolve o estoque
        window.showToast('Estorno processado! Estoque devolvido.', 'success', 4000);
        Admin.render();
    }
};

window.handleTouchStart = (e, id) => {
    Admin.touchStartX = e.touches[0].clientX;
    const item = document.getElementById(`row-${id}`);
    if (item) item.style.transform = 'translateX(0)'; // Limpa qualquer swipe anterior
};

window.handleTouchMove = (e, id) => {
    Admin.touchEndX = e.touches[0].clientX;
    const diff = Admin.touchEndX - Admin.touchStartX;
    const item = document.getElementById(`row-${id}`);

    // Permite arrastar para a esquerda para revelar o botão
    if (diff < 0) {
        item.style.transform = `translateX(${Math.max(-80, diff)}px)`; // Limita o swipe a 80px
    } else {
        item.style.transform = 'translateX(0)';
    }
};

window.handleTouchEnd = (e, id) => {
    const diff = Admin.touchEndX - Admin.touchStartX;
    const item = document.getElementById(`row-${id}`);

    if (item) {
        // Se arrastou mais de 40px para a esquerda, mantém o botão à mostra
        if (diff < -40) {
            item.style.transform = 'translateX(-80px)';
        } else {
            item.style.transform = 'translateX(0)'; // Volta
        }
    }
    // Reseta as coordenadas
    Admin.touchStartX = 0;
    Admin.touchEndX = 0;
};

// Funções de Utilidade (Adicionar Categoria, Cupom, etc. - necessárias para o render)
window.addCategoryUI = () => {
    const input = document.getElementById('new-cat');
    const newCat = input.value.trim();
    if (newCat) {
        store.addCategory(newCat);
        input.value = '';
        Admin.render();
    }
};

window.deleteCategoryUI = (category) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${category}"? Os produtos serão categorizados como "Geral".`)) {
        store.deleteCategory(category);
        Admin.render();
    }
};

window.addCouponUI = () => {
    const codeInput = document.getElementById('new-coupon-code');
    const valInput = document.getElementById('new-coupon-val');
    const code = codeInput.value.trim().toUpperCase();
    const discount = parseInt(valInput.value);

    if (code && discount > 0 && discount <= 100) {
        store.addCoupon(code, discount);
        codeInput.value = '';
        valInput.value = '';
        Admin.render();
    } else {
        alert('Preencha o código e o valor do desconto (1-100%).');
    }
};

window.deleteCouponUI = (code) => {
    if (confirm(`Excluir o cupom "${code}"?`)) {
        store.deleteCoupon(code);
        Admin.render();
    }
};

window.toggleStockConfig = () => {
    const checkbox = document.getElementById('stock-toggle');
    store.updateSetting('allowNegativeStock', checkbox.checked);
};

window.searchInventory = (query) => {
    Admin.setSearch(query);
};

window.removeImage = (urlToRemove) => {
    if (confirm('Tem certeza que deseja remover esta imagem?')) {
        const prodId = document.getElementById('prod-id').value;
        if (prodId) {
            store.removeProductImage(parseInt(prodId), urlToRemove);
            window.editProduct(parseInt(prodId)); // Re-renderiza a área de imagens do formulário
        } else {
            // Lógica para remover imagem de um novo produto (apenas visualmente no form)
            const existingImgsDiv = document.getElementById('existing-imgs');
            const imgElement = existingImgsDiv.querySelector(`img[src="${urlToRemove}"]`).closest('div');
            if (imgElement) {
                imgElement.remove();
            }
        }
    }
};

// ----------------------------------------------------------------------------------
// FUNÇÃO CRÍTICA: SALVAR PRODUTO
// ----------------------------------------------------------------------------------
window.saveProductForm = async () => {
    const id = document.getElementById('prod-id').value ? parseInt(document.getElementById('prod-id').value) : null;
    const name = document.getElementById('prod-name').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    const category = document.getElementById('prod-cat').value;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim()).filter(s => s !== '');
    const imageFiles = document.getElementById('prod-imgs').files;

    if (!name || isNaN(price) || isNaN(stock) || !category) {
        alert('Preencha Nome, Preço e Estoque corretamente.');
        return;
    }

    const productData = { name, description, price, stock, category, sizes };

    // 1. Coleta URLs de imagens existentes (se estiver editando)
    const existingImgsDiv = document.getElementById('existing-imgs');
    let existingUrls = [];
    if (existingImgsDiv) {
        existingUrls = Array.from(existingImgsDiv.querySelectorAll('img')).map(img => img.src);
    }

    if (imageFiles.length > 0) {
        window.showToast('Processando upload de novas imagens...', 'info', 2000);
        // 2. Faz o upload das novas imagens
        Admin.handleImagesUpload(imageFiles, (newUrls) => {
            productData.images = existingUrls.concat(newUrls);
            // 3. Salva o produto na store
            store.saveProduct(id, productData);
            window.showToast(`Produto ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
            window.clearForm();
            Admin.render();
        });
    } else {
        // 3. Salva o produto sem upload de novas imagens
        productData.images = existingUrls;
        store.saveProduct(id, productData);
        window.showToast(`Produto ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
        window.clearForm();
        Admin.render();
    }
};

// ----------------------------------------------------
// OBJETO PRINCIPAL ADMIN
// ----------------------------------------------------

export const Admin = {
    currentTab: 'all',
    searchQuery: '',
    selectedRowId: null,

    orderFiltersVisible: true,

    orderFilterStatus: 'all',
    filterStartDate: '',
    filterEndDate: '',

    touchStartX: 0,
    touchEndX: 0,

    setupListeners() {
        // CORREÇÃO CRÍTICA: Adiciona o listener para o evento de atualização da store
        window.addEventListener('admin-data-updated', () => {
            // Verifica se a store está no modo Admin e se o painel está visível
            if (store.state.isAdmin && window.location.hash === '#/admin') {
                console.log('Evento admin-data-updated recebido. Re-renderizando Admin.');
                this.render();

                // Opcional: Recarregar a sidebar do app.js se houver uma (não inclusa aqui, mas boa prática)
                if (window.fillSidebar) window.fillSidebar();
            }
        });
    },

    switchTab(tab) {
        if (tab === 'inventory') {
            this.currentTab = 'all';
        } else {
            this.currentTab = tab;
        }
        this.searchQuery = '';
        if (tab === 'orders') {
            this.orderFiltersVisible = true;
        }
        this.render();
    },

    setSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.render();
    },

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

        if (this.currentTab === 'orders') {
            html += this.renderOrders();
        } else {

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
                    ${store.state.coupons.map(c => `<div class="list-item" style="color: white"><span><strong>${c.code}</strong> (${c.discount}%)</span><button onclick="window.deleteCouponUI('${c.code}')" style="color:red; background:none; border:none;">🗑️</button></div>`).join('')}
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

        if (currentSearchQuery) {
            orders = orders.filter(o =>
                o.id.toString().includes(currentSearchQuery) ||
                (`P${o.id.toString().slice(-4)}`).includes(currentSearchQuery.toUpperCase()) // Adicionei 'P' para referência de pedido, como no HTML
            );
        }

        if (this.orderFilterStatus !== 'all') {
            orders = orders.filter(o => o.status === this.orderFilterStatus);
        }

        const start = this.filterStartDate ? new Date(this.filterStartDate) : null;
        const end = this.filterEndDate ? new Date(this.filterEndDate) : null;

        if (start || end) {
            orders = orders.filter(order => {
                const dateParts = order.date.split(',')[0].split('/');
                // Converte DD/MM/YYYY para YYYY-MM-DD para criar uma data correta
                const orderDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);

                let dateMatch = true;
                // Verifica data inicial
                if (start && orderDate < start) dateMatch = false;

                // Verifica data final (incluindo o dia inteiro)
                if (end) {
                    const nextDay = new Date(end);
                    nextDay.setDate(nextDay.getDate() + 1);
                    if (orderDate >= nextDay) dateMatch = false;
                }
                return dateMatch;
            });
        }

        const allApprovedOrders = store.state.orders.filter(o => o.status === 'approved');
        totalSalesValue = allApprovedOrders.reduce((acc, o) => acc + o.total, 0);

        const arrowStyle = this.orderFiltersVisible ? 'transform: rotate(180deg);' : '';

        const filtersDisplay = this.orderFiltersVisible ? 'display:grid; grid-template-columns: 1fr 1fr; gap:10px;' : 'display:none;';

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
                      style="margin-bottom:20px; padding:15px; background:#222; border-radius:8px; ${filtersDisplay}">
                
                <div style="grid-column: 1 / -1; position:relative;">
                    <label for="order-search">Buscar Ref. Pedido (Ex: P1234):</label>
                    <input type="text" 
                                         id="order-search"
                                         placeholder="Buscar por ID..." 
                                         value="${this.searchQuery}" 
                                         onkeyup="Admin.setSearch(this.value)" 
                                         style="width:100%; padding:10px 10px 10px 40px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                    <span class="material-icons" style="position:absolute; left:10px; top:38px; color:#888; font-size: 1.2rem;">search</span>
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
            const isApproved = o.status === 'approved';
            const statusColor = isPending ? 'orange' : (isApproved ? 'var(--success)' : 'red');
            const statusText = isPending ? 'PENDENTE' : (isApproved ? 'APROVADO' : 'REJEITADO / ESTORNADO');
            const orderRef = `P${o.id.toString().slice(-4)}`;

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

    renderProductList(products) {
        if (products.length === 0) return '<p style="color:#666; text-align:center;">Nenhum produto.</p>';

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
        // Remove o listener anterior antes de adicionar um novo para evitar múltiplos
        document.removeEventListener('keydown', this.handleKeyDelete);
        document.addEventListener('keydown', this.handleKeyDelete);
    },

    handleKeyDelete(e) {
        if (e.key === 'Delete' && Admin.selectedRowId && Admin.currentTab !== 'orders') {
            if (confirm('Excluir produto selecionado?')) {
                store.deleteProduct(Admin.selectedRowId);
                Admin.selectedRowId = null;
                Admin.render();
                if (window.fillSidebar) window.fillSidebar();
            }
        }
    },

    // ----------------------------------------------------------------------------------
    // CORREÇÃO CRÍTICA: Upload de Imagens para o Firebase Storage (em vez de DataURL)
    // ----------------------------------------------------------------------------------
    handleImagesUpload(fileList, callback) {
        // Fallback: Se o storage não estiver inicializado (erro na configuração do Firebase)
        if (!window.storage) {
            window.showToast('Erro: Firebase Storage não disponível. Verifique a inicialização do Firebase.', 'error', 4000);

            // Faz o upload como DataURL (Base64) - apenas como último recurso/debug, não recomendado
            const promises = Array.from(fileList).map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            });
            return Promise.all(promises).then(imagesArray => callback(imagesArray));
        }

        // LÓGICA DE UPLOAD PARA FIREBASE STORAGE
        const storageRef = window.storage.ref();
        const promises = Array.from(fileList).map(file => {
            return new Promise((resolve, reject) => {
                const fileName = `${Date.now()}_${file.name}`;
                // Organiza as imagens na pasta 'images/SEU_CLIENT_ID/'
                const imageRef = storageRef.child(`images/${window.CLIENT_ID}/${fileName}`);

                imageRef.put(file).then(snapshot => {
                    snapshot.ref.getDownloadURL().then(downloadURL => {
                        window.showToast(`Upload de ${file.name} concluído!`, 'info');
                        resolve(downloadURL); // Resolve com o URL de download
                    }).catch(reject);
                }).catch(reject);
            });
        });

        window.showToast(`Iniciando upload de ${fileList.length} imagem(s)...`, 'info', 1000);

        Promise.all(promises)
            .then(imagesArray => callback(imagesArray))
            .catch(error => {
                console.error("Erro no upload de imagem:", error);
                window.showToast('Erro no Upload! Tente novamente.', 'error', 3000);
                callback([]); // Retorna array vazio em caso de erro
            });
    }
};

// Chamada de inicialização que garante que os listeners estejam prontos
// A Store já deve estar carregada neste ponto.
Admin.setupListeners();
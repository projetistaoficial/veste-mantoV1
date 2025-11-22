# Veste Manto - Catálogo Digital

Projeto Front-end de catálogo de produtos com integração WhatsApp.

## 🚀 Como rodar localmente

Este projeto utiliza Módulos ES6, por isso precisa de um servidor local para rodar (não funciona apenas clicando no html devido às políticas de CORS dos navegadores para módulos).

1. Tenha o **VS Code** instalado.
2. Instale a extensão **Live Server**.
3. Clique com botão direito no `index.html` e escolha "Open with Live Server".

## 🛠️ Configuração

1. Abra o arquivo `js/app.js`.
2. Altere a constante `WHATSAPP_NUMBER` para o número do seu cliente (formato: 55 + DDD + Numero).

## 📦 Deploy (GitHub Pages)

1. Crie um repositório no GitHub.
2. Suba os arquivos.
3. Vá em Settings > Pages e selecione a branch `main` ou `master`.
4. O site estará no ar em instantes.

## 💾 Backend (Migração Futura)

Atualmente o projeto usa `localStorage`. Para migrar para Firebase:
1. Edite o arquivo `js/store.js`.
2. Substitua os métodos `_persist` e o carregamento inicial para usar `firebase.firestore().collection('products').get()`.
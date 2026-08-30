/* =============================================================
   KL DOCES - Carrinho de Pedidos
   Vanilla JS, sem dependências. Guarda os itens no localStorage
   e monta a mensagem final para enviar via WhatsApp.
   ============================================================= */

(function () {
  "use strict";

  // ---- CONFIGURAÇÃO ----
  const WHATSAPP_NUMBER = "555599957545"; // mesmo número já usado no site
  const STORAGE_KEY = "kl_cart";

  // ---- ESTADO ----
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCart();
  }

  function addItem(item) {
    const cart = getCart();
    const existing = cart.find((i) => i.name === item.name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    saveCart(cart);
    openDrawer();
  }

  function changeQty(name, delta) {
    let cart = getCart();
    const item = cart.find((i) => i.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter((i) => i.name !== name);
    }
    saveCart(cart);
  }

  function clearCart() {
    saveCart([]);
  }

  function getTotal(cart) {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  // ---- INTERFACE ----
  function buildDrawer() {
    if (document.getElementById("kl-cart-drawer")) return;

    const button = document.createElement("button");
    button.id = "kl-cart-button";
    button.innerHTML = '🛒 <span id="kl-cart-count">0</span>';
    button.addEventListener("click", openDrawer);
    document.body.appendChild(button);

    const overlay = document.createElement("div");
    overlay.id = "kl-cart-overlay";
    overlay.addEventListener("click", closeDrawer);
    document.body.appendChild(overlay);

    const drawer = document.createElement("aside");
    drawer.id = "kl-cart-drawer";
    drawer.innerHTML = `
      <div class="kl-cart-header">
        <h3>Seu pedido</h3>
        <button id="kl-cart-close" aria-label="Fechar">&times;</button>
      </div>
      <div id="kl-cart-items"></div>
      <div class="kl-cart-footer">
        <div class="kl-cart-total">
          <span>Total</span>
          <span id="kl-cart-total-value">R$ 0,00</span>
        </div>
        <button id="kl-cart-checkout">Enviar pedido no WhatsApp</button>
        <button id="kl-cart-clear">Esvaziar carrinho</button>
      </div>
    `;
    document.body.appendChild(drawer);

    document.getElementById("kl-cart-close").addEventListener("click", closeDrawer);
    document.getElementById("kl-cart-clear").addEventListener("click", clearCart);
    document.getElementById("kl-cart-checkout").addEventListener("click", checkout);
  }

  function openDrawer() {
    document.getElementById("kl-cart-drawer").classList.add("open");
    document.getElementById("kl-cart-overlay").classList.add("open");
  }

  function closeDrawer() {
    document.getElementById("kl-cart-drawer").classList.remove("open");
    document.getElementById("kl-cart-overlay").classList.remove("open");
  }

  function formatPrice(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }

  function renderCart() {
    const cart = getCart();
    const itemsEl = document.getElementById("kl-cart-items");
    const countEl = document.getElementById("kl-cart-count");
    const totalEl = document.getElementById("kl-cart-total-value");
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="kl-cart-empty">Seu carrinho está vazio.</p>';
    } else {
      itemsEl.innerHTML = cart
        .map(
          (item) => `
        <div class="kl-cart-item">
          <div class="kl-cart-item-info">
            <strong>${item.name}</strong>
            <span>${formatPrice(item.price)} cada</span>
          </div>
          <div class="kl-cart-item-qty">
            <button data-name="${item.name}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button data-name="${item.name}" data-delta="1">+</button>
          </div>
        </div>`
        )
        .join("");

      itemsEl.querySelectorAll("button[data-delta]").forEach((btn) => {
        btn.addEventListener("click", () =>
          changeQty(btn.dataset.name, parseInt(btn.dataset.delta, 10))
        );
      });
    }

    const total = getTotal(cart);
    countEl.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
    totalEl.textContent = formatPrice(total);
  }

  function checkout() {
    const cart = getCart();
    if (cart.length === 0) return;

    let message = "Olá! Gostaria de fazer o seguinte pedido:%0A%0A";
    cart.forEach((item) => {
      message += `• ${item.qty}x ${item.name} - ${formatPrice(item.price * item.qty)}%0A`;
    });
    message += `%0ATotal: ${formatPrice(getTotal(cart))}%0A%0AMe chamo: `;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(url, "_blank");
  }

  // ---- LIGAÇÃO COM OS BOTÕES "PEDIR" DOS CARDS ----
  function bindProductButtons() {
    document.querySelectorAll(".btn-pedir").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem({
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildDrawer();
    bindProductButtons();
    renderCart();
  });
})();

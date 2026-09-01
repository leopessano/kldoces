/* =============================================================
   KL DOCES - Carrinho de Pedidos
   Vanilla JS, sem dependências. Guarda os itens no localStorage
   e monta a mensagem final para enviar via WhatsApp.

   Cada item do carrinho agora tem um "type":
     - "now"   -> pedido para hoje  (botão "Pedir")
     - "order" -> encomenda para uma data futura (botão "Encomendar")
   Itens do tipo "order" exigem uma data escolhida no carrinho
   antes de enviar o pedido pelo WhatsApp.
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

  // Salva sem re-renderizar tudo (usado ao digitar a data, para não
  // perder o foco do campo enquanto o usuário digita).
  function persistCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function findItem(cart, name, type) {
    return cart.find((i) => i.name === name && i.type === type);
  }

  function addItem(item, type) {
    const cart = getCart();
    const existing = findItem(cart, item.name, type);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: 1, type, date: type === "order" ? "" : null });
    }
    saveCart(cart);
    openDrawer();
  }

  function changeQty(name, type, delta) {
    let cart = getCart();
    const item = findItem(cart, name, type);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter((i) => !(i.name === name && i.type === type));
    }
    saveCart(cart);
  }

  function setItemDate(name, type, value) {
    const cart = getCart();
    const item = findItem(cart, name, type);
    if (!item) return;
    item.date = value;
    persistCart(cart);
    updateCheckoutState();
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
        <p id="kl-cart-warning" class="kl-cart-warning" hidden>
          ⚠️ Escolha a data de entrega para cada item de encomenda antes de enviar.
        </p>
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

  // Retorna a data mínima permitida no seletor (hoje), em formato yyyy-mm-dd
  function todayISO() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split("T")[0];
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
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
        .map((item) => {
          const isOrder = item.type === "order";
          const badge = isOrder
            ? '<span class="kl-cart-badge kl-cart-badge-order">Encomenda</span>'
            : '<span class="kl-cart-badge kl-cart-badge-now">Para hoje</span>';

          const dateField = isOrder
            ? `
            <div class="kl-cart-item-date">
              <label>Data da encomenda:
                <input
                  type="date"
                  min="${todayISO()}"
                  value="${item.date || ""}"
                  data-name="${item.name}"
                  data-type="${item.type}"
                  class="${!item.date ? "kl-cart-date-missing" : ""}"
                />
              </label>
            </div>`
            : "";

          return `
        <div class="kl-cart-item">
          <div class="kl-cart-item-info">
            <strong>${item.name}</strong> ${badge}
            <span>${formatPrice(item.price)} cada</span>
            ${dateField}
          </div>
          <div class="kl-cart-item-qty">
            <button data-name="${item.name}" data-type="${item.type}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button data-name="${item.name}" data-type="${item.type}" data-delta="1">+</button>
          </div>
        </div>`;
        })
        .join("");

      itemsEl.querySelectorAll("button[data-delta]").forEach((btn) => {
        btn.addEventListener("click", () =>
          changeQty(btn.dataset.name, btn.dataset.type, parseInt(btn.dataset.delta, 10))
        );
      });

      itemsEl.querySelectorAll('input[type="date"]').forEach((input) => {
        input.addEventListener("change", () =>
          setItemDate(input.dataset.name, input.dataset.type, input.value)
        );
      });
    }

    const total = getTotal(cart);
    countEl.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
    totalEl.textContent = formatPrice(total);
    updateCheckoutState();
  }

  // Verifica se existe alguma encomenda sem data escolhida
  function hasMissingDate(cart) {
    return cart.some((i) => i.type === "order" && !i.date);
  }

  function updateCheckoutState() {
    const cart = getCart();
    const warningEl = document.getElementById("kl-cart-warning");
    const checkoutBtn = document.getElementById("kl-cart-checkout");
    if (!warningEl || !checkoutBtn) return;

    const missing = hasMissingDate(cart);
    warningEl.hidden = !missing;
    checkoutBtn.disabled = missing || cart.length === 0;
  }

  function checkout() {
    const cart = getCart();
    if (cart.length === 0) return;

    if (hasMissingDate(cart)) {
      updateCheckoutState();
      return;
    }

    const nowItems = cart.filter((i) => i.type !== "order");
    const orderItems = cart.filter((i) => i.type === "order");

    let message = "Olá! Gostaria de fazer o seguinte pedido:%0A";

    if (nowItems.length > 0) {
      message += "%0A*PARA HOJE*%0A";
      nowItems.forEach((item) => {
        message += `• ${item.qty}x ${item.name} - ${formatPrice(item.price * item.qty)}%0A`;
      });
    }

    if (orderItems.length > 0) {
      message += "%0A*ENCOMENDAS*%0A";
      orderItems.forEach((item) => {
        message += `• ${item.qty}x ${item.name} - ${formatPrice(
          item.price * item.qty
        )} (para ${formatDateBR(item.date)})%0A`;
      });
    }

    message += `%0ATotal: ${formatPrice(getTotal(cart))}%0A%0AMe chamo: `;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(url, "_blank");
  }

  // ---- LIGAÇÃO COM OS BOTÕES "PEDIR" E "ENCOMENDAR" DOS CARDS ----
  function bindProductButtons() {
    document.querySelectorAll(".btn-pedir").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem(
          { name: btn.dataset.name, price: parseFloat(btn.dataset.price) },
          "now"
        );
      });
    });

    document.querySelectorAll(".btn-encomendar").forEach((btn) => {
      btn.addEventListener("click", () => {
        addItem(
          { name: btn.dataset.name, price: parseFloat(btn.dataset.price) },
          "order"
        );
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildDrawer();
    bindProductButtons();
    renderCart();
  });
})();

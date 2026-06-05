/* public/onpri-customizer.js */
(function () {
  function getScriptOrigin() {
    var scripts = document.getElementsByTagName("script");
    var currentScript = document.currentScript || scripts[scripts.length - 1];

    if (!currentScript || !currentScript.src) {
      return window.location.origin;
    }

    try {
      return new URL(currentScript.src).origin;
    } catch (error) {
      return window.location.origin;
    }
  }

  function createStatus(message) {
    var element = document.createElement("p");
    element.textContent = message;
    element.style.margin = "0 0 12px";
    return element;
  }

  function createList(settings) {
    var list = document.createElement("ul");
    list.style.margin = "0";
    list.style.paddingLeft = "20px";

    settings.forEach(function (setting) {
      var item = document.createElement("li");
      var imageName = setting.image && setting.image.name ? setting.image.name : "画像未設定";
      item.textContent =
        setting.label +
        " / " +
        setting.inputType +
        " / " +
        imageName;
      list.appendChild(item);
    });

    return list;
  }

  function renderCustomizer(container, config) {
    container.innerHTML = "";

    var wrapper = document.createElement("div");
    wrapper.style.border = "1px solid #dddddd";
    wrapper.style.padding = "16px";
    wrapper.style.margin = "16px 0";

    var title = document.createElement("h3");
    title.textContent = "ONPRI Customizer";
    title.style.margin = "0 0 12px";
    wrapper.appendChild(title);

    if (!config || !config.product) {
      wrapper.appendChild(createStatus("この商品に紐づくカスタマイズ設定はありません。"));
      container.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(createStatus("商品: " + config.product.productTitle));
    wrapper.appendChild(createStatus("ブランドID: " + config.product.brandId));

    if (!config.settings || config.settings.length === 0) {
      wrapper.appendChild(createStatus("カスタマイズ項目は未設定です。"));
      container.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(createList(config.settings));
    container.appendChild(wrapper);
  }

  function renderError(container) {
    container.innerHTML = "";

    var wrapper = document.createElement("div");
    wrapper.style.border = "1px solid #dddddd";
    wrapper.style.padding = "16px";
    wrapper.style.margin = "16px 0";

    var title = document.createElement("h3");
    title.textContent = "ONPRI Customizer";
    title.style.margin = "0 0 12px";

    wrapper.appendChild(title);
    wrapper.appendChild(createStatus("カスタマイズ設定を取得できませんでした。"));
    container.appendChild(wrapper);
  }

  function init() {
    var containers = document.querySelectorAll("[data-onpri-customizer]");

    if (!containers.length) {
      return;
    }

    var defaultApiBase = getScriptOrigin();

    containers.forEach(function (container) {
      var productId = container.getAttribute("data-product-id");
      var apiBase = container.getAttribute("data-api-base") || defaultApiBase;

      if (!productId) {
        renderError(container);
        return;
      }

      fetch(apiBase.replace(/\/$/, "") + "/api/customizer/" + encodeURIComponent(productId), {
        method: "GET",
        credentials: "omit",
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to fetch customizer config");
          }

          return response.json();
        })
        .then(function (config) {
          renderCustomizer(container, config);
        })
        .catch(function () {
          renderError(container);
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

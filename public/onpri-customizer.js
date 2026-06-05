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

  function createText(message) {
    var element = document.createElement("p");
    element.textContent = message;
    element.style.margin = "0 0 12px";
    return element;
  }

  function createCustomizerOption(setting, selectedOutput) {
    var imageName = setting.image && setting.image.name ? setting.image.name : "画像未設定";
    var optionId = "onpri-customizer-option-" + setting.id;

    var wrapper = document.createElement("label");
    wrapper.setAttribute("for", optionId);
    wrapper.style.display = "block";
    wrapper.style.border = "1px solid #dddddd";
    wrapper.style.padding = "12px";
    wrapper.style.margin = "0 0 10px";
    wrapper.style.cursor = "pointer";

    var radio = document.createElement("input");
    radio.type = "radio";
    radio.id = optionId;
    radio.name = "onpri_customizer_registered_image";
    radio.value = setting.imageId;
    radio.style.marginRight = "8px";

    var title = document.createElement("strong");
    title.textContent = setting.label;

    var detail = document.createElement("div");
    detail.textContent = setting.inputType + " / " + imageName;
    detail.style.marginTop = "6px";
    detail.style.fontSize = "14px";

    radio.addEventListener("change", function () {
      selectedOutput.textContent = "選択中: " + imageName;
      selectedOutput.setAttribute("data-selected-image-id", setting.imageId);
      selectedOutput.setAttribute("data-selected-setting-id", setting.id);
    });

    wrapper.appendChild(radio);
    wrapper.appendChild(title);
    wrapper.appendChild(detail);

    return wrapper;
  }

  function createCustomizerOptions(settings) {
    var wrapper = document.createElement("div");

    var heading = document.createElement("h4");
    heading.textContent = "登録済み画像を選択";
    heading.style.margin = "16px 0 12px";
    wrapper.appendChild(heading);

    var selectedOutput = document.createElement("p");
    selectedOutput.textContent = "選択中: 未選択";
    selectedOutput.style.margin = "12px 0 0";
    selectedOutput.style.fontWeight = "600";

    settings.forEach(function (setting) {
      wrapper.appendChild(createCustomizerOption(setting, selectedOutput));
    });

    wrapper.appendChild(selectedOutput);

    return wrapper;
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
      wrapper.appendChild(createText("この商品に紐づくカスタマイズ設定はありません。"));
      container.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(createText("商品: " + config.product.productTitle));
    wrapper.appendChild(createText("ブランドID: " + config.product.brandId));

    if (!config.settings || config.settings.length === 0) {
      wrapper.appendChild(createText("カスタマイズ項目は未設定です。"));
      container.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(createCustomizerOptions(config.settings));
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
    wrapper.appendChild(createText("カスタマイズ設定を取得できませんでした。"));
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

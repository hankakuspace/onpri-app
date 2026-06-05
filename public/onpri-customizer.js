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

  function findProductForms(container) {
    var forms = [];
    var productInfo = container.closest(".product__info-container");

    if (productInfo) {
      forms = Array.from(productInfo.querySelectorAll('form[action*="/cart/add"]'));
    }

    if (!forms.length) {
      forms = Array.from(document.querySelectorAll('form[action*="/cart/add"]'));
    }

    return forms;
  }

  function setHiddenInput(form, name, value) {
    var selector = 'input[name="' + name.replace(/"/g, '\\"') + '"]';
    var input = form.querySelector(selector);

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.setAttribute("data-onpri-customizer-property", "true");
      form.appendChild(input);
    }

    input.value = value;
  }

  function clearCustomizerProperties(form) {
    var inputs = form.querySelectorAll("[data-onpri-customizer-property='true']");

    inputs.forEach(function (input) {
      input.remove();
    });
  }

  function applySelectionToProductForm(container, config, setting) {
    var forms = findProductForms(container);

    if (!forms.length) {
      return false;
    }

    var imageName = setting.image && setting.image.name ? setting.image.name : "";
    var imageUrl = setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";

    forms.forEach(function (form) {
      clearCustomizerProperties(form);

      setHiddenInput(form, "properties[ONPRI商品設定ID]", config.product.id);
      setHiddenInput(form, "properties[ONPRI商品名]", config.product.productTitle);
      setHiddenInput(form, "properties[ONPRIブランドID]", config.product.brandId);
      setHiddenInput(form, "properties[ONPRI設定ID]", setting.id);
      setHiddenInput(form, "properties[ONPRI画像ID]", setting.imageId);
      setHiddenInput(form, "properties[ONPRI画像名]", imageName);
      setHiddenInput(form, "properties[ONPRI画像URL]", imageUrl);
    });

    window.__onpriCustomizerSelection = {
      container: container,
      config: config,
      setting: setting,
    };

    return true;
  }

  function createCustomizerOption(container, config, setting, selectedOutput) {
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
      var applied = applySelectionToProductForm(container, config, setting);

      selectedOutput.textContent = applied
        ? "選択中: " + imageName
        : "選択中: " + imageName + "（商品フォーム未検出）";

      selectedOutput.setAttribute("data-selected-image-id", setting.imageId);
      selectedOutput.setAttribute("data-selected-setting-id", setting.id);
    });

    wrapper.appendChild(radio);
    wrapper.appendChild(title);
    wrapper.appendChild(detail);

    return wrapper;
  }

  function createCustomizerOptions(container, config, settings) {
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
      wrapper.appendChild(createCustomizerOption(container, config, setting, selectedOutput));
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

    wrapper.appendChild(createCustomizerOptions(container, config, config.settings));
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

  document.addEventListener("submit", function (event) {
    var form = event.target;

    if (!form || !form.matches || !form.matches('form[action*="/cart/add"]')) {
      return;
    }

    if (!window.__onpriCustomizerSelection) {
      return;
    }

    applySelectionToProductForm(
      window.__onpriCustomizerSelection.container,
      window.__onpriCustomizerSelection.config,
      window.__onpriCustomizerSelection.setting,
    );
  }, true);

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest
      ? event.target.closest('button[type="submit"], input[type="submit"]')
      : null;

    if (!button || !window.__onpriCustomizerSelection) {
      return;
    }

    var form = button.form || button.closest('form[action*="/cart/add"]');

    if (!form) {
      return;
    }

    applySelectionToProductForm(
      window.__onpriCustomizerSelection.container,
      window.__onpriCustomizerSelection.config,
      window.__onpriCustomizerSelection.setting,
    );
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

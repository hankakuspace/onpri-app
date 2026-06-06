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

  function getCustomizerState(container) {
    if (!container.__onpriCustomizerState) {
      container.__onpriCustomizerState = {
        positionX: 0,
        positionY: 0,
        scale: 1,
      };
    }

    return container.__onpriCustomizerState;
  }

  function clampCustomizerState(state) {
    state.positionX = Math.max(-45, Math.min(45, state.positionX));
    state.positionY = Math.max(-45, Math.min(45, state.positionY));
    state.scale = Math.max(0.4, Math.min(2.5, state.scale));

    return state;
  }

  function formatCustomizerNumber(value) {
    return String(Math.round(value * 100) / 100);
  }

  function getProductImageUrl() {
    var selectors = [
      ".product__media img",
      ".product-media-container img",
      ".product__media-list img",
      ".product img",
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var image = document.querySelector(selectors[index]);

      if (image) {
        var imageUrl = image.currentSrc || image.src || "";

        if (imageUrl) {
          return imageUrl;
        }
      }
    }

    return "";
  }

  function getMainProductImageElement() {
    var selectors = [
      ".product__media img",
      ".product-media-container img",
      ".product__media-list img",
      ".product img",
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var image = document.querySelector(selectors[index]);

      if (image && (image.currentSrc || image.src)) {
        return image;
      }
    }

    return null;
  }

  function getMainProductOverlayRoot(image) {
    if (!image) {
      return null;
    }

    return (
      image.closest(".product__media") ||
      image.closest(".product-media-container") ||
      image.closest(".product__media-item") ||
      image.parentElement
    );
  }

  function makeMainPreviewImageDraggable(container, image) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startPositionX = 0;
    var startPositionY = 0;

    image.style.pointerEvents = "auto";
    image.style.cursor = "grab";
    image.style.userSelect = "none";
    image.style.touchAction = "none";
    image.style.position = "relative";
    image.style.zIndex = "4";
    image.draggable = false;

    image.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);

    function updateFromPointer(clientX, clientY) {
      var state = clampCustomizerState(getCustomizerState(container));
      var deltaX = clientX - startX;
      var deltaY = clientY - startY;

      state.positionX = startPositionX + deltaX / 4;
      state.positionY = startPositionY + deltaY / 4;

      clampCustomizerState(state);
      updatePreview(container, window.__onpriCustomizerSelection.setting);
      applySelectionToProductForm(
        window.__onpriCustomizerSelection.container,
        window.__onpriCustomizerSelection.config,
        window.__onpriCustomizerSelection.setting,
      );
    }

    image.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!window.__onpriCustomizerSelection) {
        return;
      }

      var state = clampCustomizerState(getCustomizerState(container));

      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startPositionX = state.positionX;
      startPositionY = state.positionY;

      image.style.cursor = "grabbing";
      image.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    image.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      updateFromPointer(event.clientX, event.clientY);
    });

    image.addEventListener("pointerup", function (event) {
      event.preventDefault();
      event.stopPropagation();

      dragging = false;
      image.style.cursor = "grab";

      try {
        image.releasePointerCapture(event.pointerId);
      } catch (error) {
        // pointer capture が解除済みの場合は何もしない。
      }
    });

    image.addEventListener("pointercancel", function (event) {
      event.preventDefault();
      event.stopPropagation();

      dragging = false;
      image.style.cursor = "grab";
    });
  }

  function syncMainProductPreviewOverlay(container, setting) {
    var mainImage = getMainProductImageElement();
    var overlayRoot = getMainProductOverlayRoot(mainImage);

    if (!overlayRoot) {
      return;
    }

    var existingOverlay = overlayRoot.querySelector("[data-onpri-main-preview-overlay='true']");

    if (existingOverlay) {
      existingOverlay.remove();
    }

    var imageUrl = setting && setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";

    if (!imageUrl) {
      return;
    }

    var imageName = setting && setting.image && setting.image.name ? setting.image.name : "選択画像";
    var state = clampCustomizerState(getCustomizerState(container));
    var computedStyle = window.getComputedStyle(overlayRoot);

    if (computedStyle.position === "static") {
      overlayRoot.style.position = "relative";
    }

    var overlay = document.createElement("div");
    overlay.setAttribute("data-onpri-main-preview-overlay", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "3";

    var image = document.createElement("img");
    image.src = imageUrl;
    image.alt = imageName;
    image.loading = "lazy";
    image.style.maxWidth = "28%";
    image.style.maxHeight = "18%";
    image.style.objectFit = "contain";
    image.style.transform =
      "translate(" + state.positionX + "%, " + state.positionY + "%) scale(" + state.scale + ")";
    image.style.transformOrigin = "center center";

    makeMainPreviewImageDraggable(container, image);

    overlay.appendChild(image);
    overlayRoot.appendChild(overlay);
  }

  function createPreviewArea() {
    var previewWrapper = document.createElement("div");
    previewWrapper.setAttribute("data-onpri-preview-wrapper", "true");
    previewWrapper.style.margin = "16px 0";
    previewWrapper.style.padding = "16px";
    previewWrapper.style.border = "1px solid #dddddd";
    previewWrapper.style.background = "#fafafa";

    var previewTitle = document.createElement("h4");
    previewTitle.textContent = "プレビュー";
    previewTitle.style.margin = "0 0 12px";

    var previewCanvas = document.createElement("div");
    previewCanvas.setAttribute("data-onpri-preview-canvas", "true");
    previewCanvas.style.position = "relative";
    previewCanvas.style.width = "100%";
    previewCanvas.style.aspectRatio = "4 / 3";
    previewCanvas.style.border = "1px solid #eeeeee";
    previewCanvas.style.background = "#ffffff";
    previewCanvas.style.overflow = "hidden";
    previewCanvas.style.display = "flex";
    previewCanvas.style.alignItems = "center";
    previewCanvas.style.justifyContent = "center";

    var productImageUrl = getProductImageUrl();

    if (productImageUrl) {
      var productImage = document.createElement("img");
      productImage.src = productImageUrl;
      productImage.alt = "商品画像";
      productImage.loading = "lazy";
      productImage.setAttribute("data-onpri-preview-product-image", "true");
      productImage.style.position = "absolute";
      productImage.style.inset = "0";
      productImage.style.width = "100%";
      productImage.style.height = "100%";
      productImage.style.objectFit = "contain";
      productImage.style.zIndex = "1";
      previewCanvas.appendChild(productImage);
    }

    var overlayLayer = document.createElement("div");
    overlayLayer.setAttribute("data-onpri-preview-overlay-layer", "true");
    overlayLayer.style.position = "absolute";
    overlayLayer.style.inset = "0";
    overlayLayer.style.display = "flex";
    overlayLayer.style.alignItems = "center";
    overlayLayer.style.justifyContent = "center";
    overlayLayer.style.zIndex = "2";
    previewCanvas.appendChild(overlayLayer);

    var placeholder = document.createElement("p");
    placeholder.setAttribute("data-onpri-preview-placeholder", "true");
    placeholder.textContent = "画像を選択するとプレビューが表示されます。";
    placeholder.style.margin = "0";
    placeholder.style.color = "#666666";
    placeholder.style.fontSize = "14px";
    placeholder.style.textAlign = "center";

    overlayLayer.appendChild(placeholder);
    previewWrapper.appendChild(previewTitle);
    previewWrapper.appendChild(previewCanvas);

    return previewWrapper;
  }

  function updatePreview(container, setting) {
    var previewCanvas = container.querySelector("[data-onpri-preview-canvas]");

    if (!previewCanvas) {
      return;
    }

    var overlayLayer = previewCanvas.querySelector("[data-onpri-preview-overlay-layer]");

    if (!overlayLayer) {
      overlayLayer = document.createElement("div");
      overlayLayer.setAttribute("data-onpri-preview-overlay-layer", "true");
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      overlayLayer.style.display = "flex";
      overlayLayer.style.alignItems = "center";
      overlayLayer.style.justifyContent = "center";
      overlayLayer.style.zIndex = "2";
      previewCanvas.appendChild(overlayLayer);
    }

    overlayLayer.innerHTML = "";

    var imageUrl = setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";
    var imageName = setting.image && setting.image.name ? setting.image.name : "選択画像";

    if (!imageUrl) {
      var placeholder = document.createElement("p");
      placeholder.setAttribute("data-onpri-preview-placeholder", "true");
      placeholder.textContent = "画像URLが未設定です。";
      placeholder.style.margin = "0";
      placeholder.style.color = "#666666";
      placeholder.style.fontSize = "14px";
      placeholder.style.textAlign = "center";
      overlayLayer.appendChild(placeholder);
      syncMainProductPreviewOverlay(container, setting);
      return;
    }

    var image = document.createElement("img");
    image.src = imageUrl;
    image.alt = imageName;
    image.loading = "lazy";
    var state = clampCustomizerState(getCustomizerState(container));

    image.setAttribute("data-onpri-preview-overlay-image", "true");
    image.style.maxWidth = "42%";
    image.style.maxHeight = "28%";
    image.style.objectFit = "contain";
    image.style.transform =
      "translate(" + state.positionX + "%, " + state.positionY + "%) scale(" + state.scale + ")";
    image.style.transformOrigin = "center center";

    overlayLayer.appendChild(image);
    syncMainProductPreviewOverlay(container, setting);
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
      var state = clampCustomizerState(getCustomizerState(container));

      setHiddenInput(form, "properties[ONPRI画像ID]", setting.imageId);
      setHiddenInput(form, "properties[ONPRI画像名]", imageName);
      setHiddenInput(form, "properties[ONPRI画像URL]", imageUrl);
      setHiddenInput(form, "properties[ONPRI位置X]", formatCustomizerNumber(state.positionX));
      setHiddenInput(form, "properties[ONPRI位置Y]", formatCustomizerNumber(state.positionY));
      setHiddenInput(form, "properties[ONPRI拡大率]", formatCustomizerNumber(state.scale));
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
    var imageUrl = setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";
    var optionId = "onpri-customizer-option-" + setting.id;

    var wrapper = document.createElement("label");
    wrapper.setAttribute("for", optionId);
    wrapper.style.display = "block";
    wrapper.style.border = "1px solid #dddddd";
    wrapper.style.padding = "12px";
    wrapper.style.margin = "0 0 10px";
    wrapper.style.cursor = "pointer";

    var content = document.createElement("div");
    content.style.display = "flex";
    content.style.gap = "12px";
    content.style.alignItems = "center";

    if (imageUrl) {
      var thumbnail = document.createElement("img");
      thumbnail.src = imageUrl;
      thumbnail.alt = imageName;
      thumbnail.loading = "lazy";
      thumbnail.style.width = "56px";
      thumbnail.style.height = "56px";
      thumbnail.style.objectFit = "contain";
      thumbnail.style.border = "1px solid #eeeeee";
      thumbnail.style.background = "#ffffff";
      content.appendChild(thumbnail);
    }

    var textContent = document.createElement("div");
    textContent.style.flex = "1";

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

      updatePreview(container, setting);
    });

    textContent.appendChild(radio);
    textContent.appendChild(title);
    textContent.appendChild(detail);
    content.appendChild(textContent);
    wrapper.appendChild(content);

    return wrapper;
  }

  function createPreviewControls(container) {
    var controls = document.createElement("div");
    controls.setAttribute("data-onpri-preview-controls", "true");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "repeat(3, 1fr)";
    controls.style.gap = "8px";
    controls.style.margin = "12px 0 16px";

    function createButton(label, action) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.padding = "8px";
      button.style.border = "1px solid #dddddd";
      button.style.background = "#ffffff";
      button.style.cursor = "pointer";

      button.addEventListener("click", function () {
        if (!window.__onpriCustomizerSelection) {
          return;
        }

        var state = clampCustomizerState(getCustomizerState(container));
        action(state);
        clampCustomizerState(state);

        updatePreview(container, window.__onpriCustomizerSelection.setting);
        applySelectionToProductForm(
          window.__onpriCustomizerSelection.container,
          window.__onpriCustomizerSelection.config,
          window.__onpriCustomizerSelection.setting,
        );
      });

      return button;
    }

    controls.appendChild(createButton("小さく", function (state) {
      state.scale -= 0.1;
    }));
    controls.appendChild(createButton("上へ", function (state) {
      state.positionY -= 5;
    }));
    controls.appendChild(createButton("大きく", function (state) {
      state.scale += 0.1;
    }));
    controls.appendChild(createButton("左へ", function (state) {
      state.positionX -= 5;
    }));
    controls.appendChild(createButton("中央", function (state) {
      state.positionX = 0;
      state.positionY = 0;
      state.scale = 1;
    }));
    controls.appendChild(createButton("右へ", function (state) {
      state.positionX += 5;
    }));
    controls.appendChild(document.createElement("span"));
    controls.appendChild(createButton("下へ", function (state) {
      state.positionY += 5;
    }));
    controls.appendChild(document.createElement("span"));

    return controls;
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

    wrapper.appendChild(createPreviewArea());
    wrapper.appendChild(createPreviewControls(container));
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

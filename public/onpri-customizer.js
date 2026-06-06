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

  function getRenderedImageArea(root, image) {
    var rootRect = root.getBoundingClientRect();
    var imageRect = image.getBoundingClientRect();

    var elementLeft = imageRect.left - rootRect.left;
    var elementTop = imageRect.top - rootRect.top;
    var elementWidth = imageRect.width;
    var elementHeight = imageRect.height;

    var naturalWidth = image.naturalWidth || elementWidth;
    var naturalHeight = image.naturalHeight || elementHeight;

    if (!naturalWidth || !naturalHeight || !elementWidth || !elementHeight) {
      return {
        left: elementLeft,
        top: elementTop,
        width: elementWidth,
        height: elementHeight,
      };
    }

    var elementRatio = elementWidth / elementHeight;
    var imageRatio = naturalWidth / naturalHeight;

    var renderedWidth = elementWidth;
    var renderedHeight = elementHeight;
    var offsetLeft = 0;
    var offsetTop = 0;

    if (imageRatio > elementRatio) {
      renderedHeight = elementWidth / imageRatio;
      offsetTop = (elementHeight - renderedHeight) / 2;
    } else {
      renderedWidth = elementHeight * imageRatio;
      offsetLeft = (elementWidth - renderedWidth) / 2;
    }

    return {
      left: elementLeft + offsetLeft,
      top: elementTop + offsetTop,
      width: renderedWidth,
      height: renderedHeight,
    };
  }

  function positionOverlayOnImageArea(overlay, image, root) {
    if (!overlay || !image || !root) {
      return;
    }

    var area = getRenderedImageArea(root, image);

    overlay.style.left = area.left + "px";
    overlay.style.top = area.top + "px";
    overlay.style.width = area.width + "px";
    overlay.style.height = area.height + "px";
  }

  function syncSmallPreviewOverlayBounds(container) {
    var previewCanvas = container.querySelector("[data-onpri-preview-canvas]");
    var productImage = container.querySelector("[data-onpri-preview-product-image='true']");
    var overlayLayer = container.querySelector("[data-onpri-preview-overlay-layer]");

    if (!previewCanvas || !productImage || !overlayLayer) {
      return;
    }

    positionOverlayOnImageArea(overlayLayer, productImage, previewCanvas);
  }

  function applyPreviewTransforms(container) {
    var state = clampCustomizerState(getCustomizerState(container));
    var left = "calc(50% + " + state.positionX + "%)";
    var top = "calc(50% + " + state.positionY + "%)";
    var baseWidthPercent = 32;
    var width = (baseWidthPercent * state.scale) + "%";

    syncSmallPreviewOverlayBounds(container);

    var smallPreviewImage = container.querySelector("[data-onpri-preview-overlay-image='true']");
    if (smallPreviewImage) {
      smallPreviewImage.style.left = left;
      smallPreviewImage.style.top = top;
      smallPreviewImage.style.width = width;
      smallPreviewImage.style.maxWidth = "none";
      smallPreviewImage.style.maxHeight = "none";
      smallPreviewImage.style.height = "auto";
      smallPreviewImage.style.transform = "translate(-50%, -50%)";
      smallPreviewImage.style.transformOrigin = "center center";
    }

    var mainPreviewImage = document.querySelector("[data-onpri-main-preview-image='true']");
    if (mainPreviewImage) {
      mainPreviewImage.style.left = left;
      mainPreviewImage.style.top = top;
      mainPreviewImage.style.width = width;
      mainPreviewImage.style.maxWidth = "none";
      mainPreviewImage.style.maxHeight = "none";
      mainPreviewImage.style.height = "auto";
      mainPreviewImage.style.transform = "translate(-50%, -50%)";
      mainPreviewImage.style.transformOrigin = "center center";
    }

    var selectionFrame = document.querySelector("[data-onpri-main-selection-frame='true']");
    if (selectionFrame && mainPreviewImage) {
      selectionFrame.style.left = left;
      selectionFrame.style.top = top;
      selectionFrame.style.width = mainPreviewImage.offsetWidth + "px";
      selectionFrame.style.height = mainPreviewImage.offsetHeight + "px";
      selectionFrame.style.transform = "translate(-50%, -50%)";
    }
  }

  function makeMainPreviewImageDraggable(container, image, resizeHandles) {
    var dragging = false;
    var resizing = false;
    var resizeCorner = "se";
    var startX = 0;
    var startY = 0;
    var startPositionX = 0;
    var startPositionY = 0;
    var startScale = 1;

    image.style.pointerEvents = "auto";
    image.style.cursor = "move";
    image.style.userSelect = "none";
    image.style.touchAction = "none";
    image.style.position = "absolute";
    image.style.zIndex = "4";
    image.draggable = false;

    image.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);

    function applyStateUpdate() {
      clampCustomizerState(getCustomizerState(container));
      applyPreviewTransforms(container);
      updateGeneratedPreviewData(container, window.__onpriCustomizerSelection.setting).then(function () {
        applySelectionToProductForm(
          window.__onpriCustomizerSelection.container,
          window.__onpriCustomizerSelection.config,
          window.__onpriCustomizerSelection.setting,
        );
      });
    }

    function updatePositionFromPointer(clientX, clientY) {
      var state = clampCustomizerState(getCustomizerState(container));
      var deltaX = clientX - startX;
      var deltaY = clientY - startY;
      var root = image.closest("[data-onpri-main-preview-overlay='true']") || image.parentElement;
      var rect = root ? root.getBoundingClientRect() : null;

      if (!rect || rect.width === 0 || rect.height === 0) {
        return;
      }

      state.positionX = startPositionX + (deltaX / rect.width) * 100;
      state.positionY = startPositionY + (deltaY / rect.height) * 100;

      applyStateUpdate();
    }

    function updateScaleFromPointer(clientX, clientY) {
      var state = clampCustomizerState(getCustomizerState(container));
      var deltaX = clientX - startX;
      var deltaY = clientY - startY;
      var delta = 0;

      if (resizeCorner === "se") {
        delta = deltaX + deltaY;
      } else if (resizeCorner === "sw") {
        delta = -deltaX + deltaY;
      } else if (resizeCorner === "ne") {
        delta = deltaX - deltaY;
      } else {
        delta = -deltaX - deltaY;
      }

      state.scale = startScale + delta / 260;

      applyStateUpdate();
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
    });

    image.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      updatePositionFromPointer(event.clientX, event.clientY);
    });

    image.addEventListener("pointerup", function (event) {
      event.preventDefault();
      event.stopPropagation();

      dragging = false;
      image.style.cursor = "move";

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
      image.style.cursor = "move";
    });

    resizeHandles.forEach(function (resizeHandle) {
      resizeHandle.style.pointerEvents = "auto";
      resizeHandle.style.cursor = resizeHandle.getAttribute("data-onpri-resize-cursor") || "nwse-resize";
      resizeHandle.style.touchAction = "none";

      resizeHandle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
      }, true);

      resizeHandle.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (!window.__onpriCustomizerSelection) {
          return;
        }

        var state = clampCustomizerState(getCustomizerState(container));

        resizing = true;
        resizeCorner = resizeHandle.getAttribute("data-onpri-resize-corner") || "se";
        startX = event.clientX;
        startY = event.clientY;
        startScale = state.scale;

        resizeHandle.setPointerCapture(event.pointerId);
      });

      resizeHandle.addEventListener("pointermove", function (event) {
        if (!resizing) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        updateScaleFromPointer(event.clientX, event.clientY);
      });

      resizeHandle.addEventListener("pointerup", function (event) {
        event.preventDefault();
        event.stopPropagation();

        resizing = false;

        try {
          resizeHandle.releasePointerCapture(event.pointerId);
        } catch (error) {
          // pointer capture が解除済みの場合は何もしない。
        }
      });

      resizeHandle.addEventListener("pointercancel", function (event) {
        event.preventDefault();
        event.stopPropagation();

        resizing = false;
      });
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
    var computedStyle = window.getComputedStyle(overlayRoot);

    if (computedStyle.position === "static") {
      overlayRoot.style.position = "relative";
    }

    var overlay = document.createElement("div");
    overlay.setAttribute("data-onpri-main-preview-overlay", "true");
    overlay.style.position = "absolute";
    overlay.style.display = "block";
    overlay.style.pointerEvents = "auto";
    overlay.style.zIndex = "20";

    positionOverlayOnImageArea(overlay, mainImage, overlayRoot);

    overlay.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);

    overlay.addEventListener("pointerdown", function (event) {
      if (
        event.target &&
        event.target.closest &&
        (
          event.target.closest("[data-onpri-main-preview-image='true']") ||
          event.target.closest("[data-onpri-main-resize-handle='true']")
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }, true);

    var image = document.createElement("img");
    image.src = imageUrl;
    image.alt = imageName;
    image.loading = "lazy";
    image.setAttribute("data-onpri-main-preview-image", "true");
    image.style.position = "absolute";
    image.style.maxWidth = "32%";
    image.style.maxHeight = "22%";
    image.style.objectFit = "contain";

    var selectionFrame = document.createElement("div");
    selectionFrame.setAttribute("data-onpri-main-selection-frame", "true");
    selectionFrame.style.position = "absolute";
    selectionFrame.style.border = "2px solid #00a3ff";
    selectionFrame.style.boxSizing = "border-box";
    selectionFrame.style.pointerEvents = "none";
    selectionFrame.style.zIndex = "5";

    var corners = [
      { key: "nw", cursor: "nwse-resize", left: "-6px", top: "-6px" },
      { key: "ne", cursor: "nesw-resize", right: "-6px", top: "-6px" },
      { key: "sw", cursor: "nesw-resize", left: "-6px", bottom: "-6px" },
      { key: "se", cursor: "nwse-resize", right: "-6px", bottom: "-6px" },
    ];

    var resizeHandles = corners.map(function (corner) {
      var handle = document.createElement("button");
      handle.type = "button";
      handle.setAttribute("data-onpri-main-resize-handle", "true");
      handle.setAttribute("data-onpri-resize-corner", corner.key);
      handle.setAttribute("data-onpri-resize-cursor", corner.cursor);
      handle.setAttribute("aria-label", "ロゴサイズを変更");
      handle.style.position = "absolute";
      handle.style.width = "12px";
      handle.style.height = "12px";
      handle.style.border = "1px solid #0077cc";
      handle.style.background = "#ffffff";
      handle.style.padding = "0";
      handle.style.zIndex = "6";
      handle.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.25)";

      if (corner.left) handle.style.left = corner.left;
      if (corner.right) handle.style.right = corner.right;
      if (corner.top) handle.style.top = corner.top;
      if (corner.bottom) handle.style.bottom = corner.bottom;

      selectionFrame.appendChild(handle);

      return handle;
    });

    makeMainPreviewImageDraggable(container, image, resizeHandles);
    overlay.appendChild(image);
    overlay.appendChild(selectionFrame);
    overlayRoot.appendChild(overlay);
    applyPreviewTransforms(container);
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
    previewCanvas.style.display = "block";

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
      productImage.addEventListener("load", function () {
        var customizerContainer = previewWrapper.closest("[data-onpri-customizer]");

        if (customizerContainer) {
          syncSmallPreviewOverlayBounds(customizerContainer);
          applyPreviewTransforms(customizerContainer);
        }
      });
      previewCanvas.appendChild(productImage);
    }

    var overlayLayer = document.createElement("div");
    overlayLayer.setAttribute("data-onpri-preview-overlay-layer", "true");
    overlayLayer.style.position = "absolute";
    overlayLayer.style.display = "block";
    overlayLayer.style.zIndex = "2";
    overlayLayer.style.pointerEvents = "none";
    previewCanvas.appendChild(overlayLayer);

    var placeholder = document.createElement("p");
    placeholder.setAttribute("data-onpri-preview-placeholder", "true");
    placeholder.textContent = "画像を選択するとプレビューが表示されます。";
    placeholder.style.margin = "0";
    placeholder.style.color = "#666666";
    placeholder.style.fontSize = "14px";
    placeholder.style.textAlign = "center";
    placeholder.style.position = "absolute";
    placeholder.style.left = "50%";
    placeholder.style.top = "50%";
    placeholder.style.transform = "translate(-50%, -50%)";

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
      overlayLayer.style.display = "block";
      overlayLayer.style.zIndex = "2";
      overlayLayer.style.pointerEvents = "none";
      previewCanvas.appendChild(overlayLayer);
    }

    overlayLayer.innerHTML = "";
    syncSmallPreviewOverlayBounds(container);

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
      placeholder.style.position = "absolute";
      placeholder.style.left = "50%";
      placeholder.style.top = "50%";
      placeholder.style.transform = "translate(-50%, -50%)";
      overlayLayer.appendChild(placeholder);
      syncMainProductPreviewOverlay(container, setting);
      return;
    }

    var image = document.createElement("img");
    image.src = imageUrl;
    image.alt = imageName;
    image.loading = "lazy";
    image.setAttribute("data-onpri-preview-overlay-image", "true");
    image.style.position = "absolute";
    image.style.maxWidth = "32%";
    image.style.maxHeight = "22%";
    image.style.objectFit = "contain";

    overlayLayer.appendChild(image);
    syncMainProductPreviewOverlay(container, setting);
    applyPreviewTransforms(container);
  }


  function loadImageForCanvas(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("画像を読み込めませんでした: " + src));
      };
      image.src = src;
    });
  }

  function drawContainImage(context, image, canvasWidth, canvasHeight) {
    var imageRatio = image.naturalWidth / image.naturalHeight;
    var canvasRatio = canvasWidth / canvasHeight;

    var width = canvasWidth;
    var height = canvasHeight;
    var x = 0;
    var y = 0;

    if (imageRatio > canvasRatio) {
      height = canvasWidth / imageRatio;
      y = (canvasHeight - height) / 2;
    } else {
      width = canvasHeight * imageRatio;
      x = (canvasWidth - width) / 2;
    }

    context.drawImage(image, x, y, width, height);

    return {
      x: x,
      y: y,
      width: width,
      height: height,
    };
  }

  function generatePreviewDataUrl(container, setting) {
    var productImageUrl = getProductImageUrl();
    var logoImageUrl = setting && setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";

    if (!productImageUrl || !logoImageUrl) {
      return Promise.resolve("");
    }

    var state = clampCustomizerState(getCustomizerState(container));
    var canvas = document.createElement("canvas");
    var canvasWidth = 1200;
    var canvasHeight = 900;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    var context = canvas.getContext("2d");

    if (!context) {
      return Promise.resolve("");
    }

    return Promise.all([
      loadImageForCanvas(productImageUrl),
      loadImageForCanvas(logoImageUrl),
    ]).then(function (images) {
      var productImage = images[0];
      var logoImage = images[1];

      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      var productArea = drawContainImage(context, productImage, canvasWidth, canvasHeight);

      var logoBaseWidth = productArea.width * 0.32;
      var logoWidth = logoBaseWidth * state.scale;
      var logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);

      var logoCenterX = productArea.x + productArea.width * (0.5 + state.positionX / 100);
      var logoCenterY = productArea.y + productArea.height * (0.5 + state.positionY / 100);

      context.drawImage(
        logoImage,
        logoCenterX - logoWidth / 2,
        logoCenterY - logoHeight / 2,
        logoWidth,
        logoHeight
      );

      return canvas.toDataURL("image/png");
    }).catch(function () {
      return "";
    });
  }

  function updateGeneratedPreviewData(container, setting) {
    return generatePreviewDataUrl(container, setting).then(function (previewDataUrl) {
      container.__onpriPreviewDataUrl = previewDataUrl || "";
      return container.__onpriPreviewDataUrl;
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
      var state = clampCustomizerState(getCustomizerState(container));

      setHiddenInput(form, "properties[ONPRI画像ID]", setting.imageId);
      setHiddenInput(form, "properties[ONPRI画像名]", imageName);
      setHiddenInput(form, "properties[ONPRI画像URL]", imageUrl);
      setHiddenInput(form, "properties[ONPRI位置X]", formatCustomizerNumber(state.positionX));
      setHiddenInput(form, "properties[ONPRI位置Y]", formatCustomizerNumber(state.positionY));
      setHiddenInput(form, "properties[ONPRI拡大率]", formatCustomizerNumber(state.scale));
      setHiddenInput(form, "properties[ONPRIプレビュー画像データ]", container.__onpriPreviewDataUrl || "");
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
      updateGeneratedPreviewData(container, setting).then(function () {
        applySelectionToProductForm(container, config, setting);
      });
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
        updateGeneratedPreviewData(container, window.__onpriCustomizerSelection.setting).then(function () {
          applySelectionToProductForm(
            window.__onpriCustomizerSelection.container,
            window.__onpriCustomizerSelection.config,
            window.__onpriCustomizerSelection.setting,
          );
        });
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

    updateGeneratedPreviewData(
      window.__onpriCustomizerSelection.container,
      window.__onpriCustomizerSelection.setting,
    );

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

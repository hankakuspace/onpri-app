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

  function clearThirdPartyCustomizerProperties(form) {
    var fields = form.querySelectorAll("input[name^='properties[_customily'], input[name^='properties[customily'], input[name='properties[_preview_image]'], input[name='properties[_Preview Image]'], input[name='properties[_customily-thumb]'], input[name='properties[_customily-preview]'], input[name='properties[_customily-production-url]'], input[name='properties[_customily-id]'], input[name='properties[_customily-eps-name]'], input[name='properties[_customily-personalization-id]'], input[name='properties[_customily-template-id]'], input[name='properties[_customily-cart-image]'], textarea[name^='properties[_customily'], select[name^='properties[_customily']");

    fields.forEach(function (field) {
      field.remove();
    });
  }

  function installOnpriFormSubmitCleanup(container) {
    var forms = findProductForms(container);

    forms.forEach(function (form) {
      if (form.__onpriSubmitCleanupInstalled) {
        return;
      }

      form.__onpriSubmitCleanupInstalled = true;

      form.addEventListener(
        "submit",
        function () {
          if (form.querySelector("[data-onpri-customizer-property='true']")) {
            clearThirdPartyCustomizerProperties(form);
          }
        },
        true,
      );
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

  function setMainSelectionControlsVisible(visible) {
    var opacity = visible ? "1" : "0";
    var pointerEvents = visible ? "auto" : "none";

    var selectionFrame = document.querySelector("[data-onpri-main-selection-frame='true']");
    if (selectionFrame) {
      selectionFrame.style.opacity = opacity;
    }

    document.querySelectorAll("[data-onpri-main-resize-handle='true']").forEach(function (handle) {
      handle.style.opacity = opacity;
      handle.style.pointerEvents = pointerEvents;
    });
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
      smallPreviewImage.style.height = "auto";
      smallPreviewImage.style.maxWidth = "none";
      smallPreviewImage.style.maxHeight = "none";
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
      mainPreviewImage.style.transform = "translate(-50%, -50%)";
      mainPreviewImage.style.transformOrigin = "center center";

      if (mainPreviewImage.tagName === "DIV") {
        var overlayRoot = mainPreviewImage.closest("[data-onpri-main-preview-overlay='true']");
        var overlayWidth = overlayRoot ? overlayRoot.clientWidth : 0;
        var logoWidth = overlayWidth * (baseWidthPercent * state.scale / 100);

        mainPreviewImage.style.height = (logoWidth * 200 / 675) + "px";
        mainPreviewImage.style.display = "block";
      } else {
        mainPreviewImage.style.height = "auto";
      }
    }

    var selectionFrame = document.querySelector("[data-onpri-main-selection-frame='true']");
    if (selectionFrame && mainPreviewImage) {
      selectionFrame.style.left = left;
      selectionFrame.style.top = top;
      selectionFrame.style.width = mainPreviewImage.offsetWidth + "px";
      selectionFrame.style.height = mainPreviewImage.offsetHeight + "px";
      selectionFrame.style.transform = "translate(-50%, -50%)";
    }

    document.querySelectorAll("[data-onpri-main-resize-handle='true']").forEach(function (handle) {
      var corner = handle.getAttribute("data-onpri-resize-corner") || "se";
      var frameWidth = mainPreviewImage ? mainPreviewImage.offsetWidth : 0;
      var frameHeight = mainPreviewImage ? mainPreviewImage.offsetHeight : 0;
      var offsetX = frameWidth / 2;
      var offsetY = frameHeight / 2;

      handle.style.left = left;
      handle.style.top = top;

      if (corner === "nw") {
        handle.style.transform = "translate(calc(-50% - " + offsetX + "px), calc(-50% - " + offsetY + "px))";
      } else if (corner === "ne") {
        handle.style.transform = "translate(calc(-50% + " + offsetX + "px), calc(-50% - " + offsetY + "px))";
      } else if (corner === "sw") {
        handle.style.transform = "translate(calc(-50% - " + offsetX + "px), calc(-50% + " + offsetY + "px))";
      } else {
        handle.style.transform = "translate(calc(-50% + " + offsetX + "px), calc(-50% + " + offsetY + "px))";
      }
    });
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

      if (event.buttons === 0) {
        dragging = false;
        image.style.cursor = "move";
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

        if (event.buttons === 0) {
          resizing = false;
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

      resizeHandle.addEventListener("lostpointercapture", function () {
        resizing = false;
      });
    });

    window.addEventListener("pointerup", function () {
      dragging = false;
      resizing = false;
      image.style.cursor = "move";
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

    var image = document.createElement("div");
    image.setAttribute("data-onpri-main-preview-image", "true");
    image.setAttribute("aria-label", imageName);
    image.style.position = "absolute";
    image.style.width = "32%";
    image.style.aspectRatio = "675 / 200";
    image.style.height = "auto";
    image.style.maxWidth = "none";
    image.style.maxHeight = "none";
    image.style.backgroundImage = "url('" + imageUrl.replace(/'/g, "\\'") + "')";
    image.style.backgroundRepeat = "no-repeat";
    image.style.backgroundPosition = "center";
    image.style.backgroundSize = "contain";

    var selectionFrame = document.createElement("div");
    selectionFrame.setAttribute("data-onpri-main-selection-frame", "true");
    selectionFrame.style.position = "absolute";
    selectionFrame.style.border = "2px solid #00a3ff";
    selectionFrame.style.boxSizing = "border-box";
    selectionFrame.style.pointerEvents = "none";
    selectionFrame.style.zIndex = "5";
    selectionFrame.style.opacity = "0";
    selectionFrame.style.transition = "opacity 120ms ease";

    var corners = [
      { key: "nw", cursor: "nwse-resize" },
      { key: "ne", cursor: "nesw-resize" },
      { key: "sw", cursor: "nesw-resize" },
      { key: "se", cursor: "nwse-resize" },
    ];

    var resizeHandles = corners.map(function (corner) {
      var handle = document.createElement("span");
      handle.setAttribute("data-onpri-main-resize-handle", "true");
      handle.setAttribute("data-onpri-resize-corner", corner.key);
      handle.setAttribute("data-onpri-resize-cursor", corner.cursor);
      handle.setAttribute("aria-label", "ロゴサイズを変更");
      handle.setAttribute("role", "button");
      handle.style.position = "absolute";
      handle.style.display = "block";
      handle.style.width = "12px";
      handle.style.height = "12px";
      handle.style.minWidth = "12px";
      handle.style.minHeight = "12px";
      handle.style.maxWidth = "12px";
      handle.style.maxHeight = "12px";
      handle.style.border = "1px solid #0077cc";
      handle.style.background = "#ffffff";
      handle.style.padding = "0";
      handle.style.margin = "0";
      handle.style.boxSizing = "border-box";
      handle.style.borderRadius = "0";
      handle.style.lineHeight = "0";
      handle.style.fontSize = "0";
      handle.style.zIndex = "6";
      handle.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.25)";
      handle.style.opacity = "0";
      handle.style.pointerEvents = "none";
      handle.style.transition = "opacity 120ms ease";
      handle.style.appearance = "none";
      handle.style.webkitAppearance = "none";

      overlay.appendChild(handle);

      return handle;
    });

    var hideSelectionTimer = null;

    function showMainSelectionControls() {
      if (hideSelectionTimer) {
        window.clearTimeout(hideSelectionTimer);
        hideSelectionTimer = null;
      }

      setMainSelectionControlsVisible(true);
    }

    function hideMainSelectionControlsSoon() {
      if (hideSelectionTimer) {
        window.clearTimeout(hideSelectionTimer);
      }

      hideSelectionTimer = window.setTimeout(function () {
        var hoveredControl = document.querySelector(
          "[data-onpri-main-preview-image='true']:hover, " +
          "[data-onpri-main-selection-frame='true']:hover, " +
          "[data-onpri-main-resize-handle='true']:hover"
        );

        if (!hoveredControl) {
          setMainSelectionControlsVisible(false);
        }
      }, 120);
    }

    image.addEventListener("mouseenter", showMainSelectionControls);
    image.addEventListener("mouseleave", hideMainSelectionControlsSoon);

    selectionFrame.addEventListener("mouseenter", showMainSelectionControls);
    selectionFrame.addEventListener("mouseleave", hideMainSelectionControlsSoon);

    resizeHandles.forEach(function (resizeHandle) {
      resizeHandle.addEventListener("mouseenter", showMainSelectionControls);
      resizeHandle.addEventListener("mouseleave", hideMainSelectionControlsSoon);
    });

    document.addEventListener("click", function (event) {
      if (
        event.target &&
        event.target.closest &&
        (
          event.target.closest("[data-onpri-main-preview-image='true']") ||
          event.target.closest("[data-onpri-main-selection-frame='true']") ||
          event.target.closest("[data-onpri-main-resize-handle='true']")
        )
      ) {
        return;
      }

      setMainSelectionControlsVisible(false);
    });

    makeMainPreviewImageDraggable(container, image, resizeHandles);
    overlay.appendChild(image);
    overlay.appendChild(selectionFrame);
    overlayRoot.appendChild(overlay);
    setMainSelectionControlsVisible(false);
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
    image.style.width = "32%";
    image.style.height = "auto";
    image.style.maxWidth = "none";
    image.style.maxHeight = "none";
    image.style.objectFit = "contain";

    overlayLayer.appendChild(image);
    syncMainProductPreviewOverlay(container, setting);
    applyPreviewTransforms(container);
  }

  function getDefaultTextCustomizerOptions() {
    return {
      area: "前面",
      position: "中央",
      fontSize: "中",
      fontColor: "白",
      fontFamily: "ゴシック",
    };
  }

  function normalizeTextCustomizerOptions(options) {
    var defaults = getDefaultTextCustomizerOptions();
    var normalized = options || {};

    return {
      area: normalized.area || defaults.area,
      position: normalized.position || defaults.position,
      fontSize: normalized.fontSize || defaults.fontSize,
      fontColor: normalized.fontColor || defaults.fontColor,
      fontFamily: normalized.fontFamily || defaults.fontFamily,
    };
  }

  function getTextPreviewPositionStyles(position) {
    if (position === "上") {
      return { left: "50%", top: "40%" };
    }

    if (position === "下") {
      return { left: "50%", top: "64%" };
    }

    if (position === "左胸") {
      return { left: "42%", top: "42%" };
    }

    return { left: "50%", top: "52%" };
  }

  function getTextPreviewFontSize(fontSize) {
    if (fontSize === "小") {
      return "clamp(22px, 3.2vw, 48px)";
    }

    if (fontSize === "大") {
      return "clamp(34px, 5.2vw, 84px)";
    }

    return "clamp(28px, 4.5vw, 72px)";
  }

  function getTextPreviewColor(fontColor) {
    if (fontColor === "黒") {
      return "#111111";
    }

    if (fontColor === "赤") {
      return "#d32f2f";
    }

    if (fontColor === "青") {
      return "#1976d2";
    }

    return "#ffffff";
  }

  function getTextPreviewFontFamily(fontFamily) {
    if (fontFamily === "明朝") {
      return "'Times New Roman', 'Yu Mincho', 'Hiragino Mincho ProN', serif";
    }

    if (fontFamily === "丸ゴシック") {
      return "'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif";
    }

    return "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif";
  }

  function getTextPreviewShadow(fontColor) {
    if (fontColor === "白") {
      return "0 3px 10px rgba(0, 0, 0, 0.55)";
    }

    return "0 2px 6px rgba(255, 255, 255, 0.35)";
  }


  function syncMainProductTextPreviewOverlay(textValue, options) {
    var mainImage = getMainProductImageElement();
    var overlayRoot = getMainProductOverlayRoot(mainImage);

    if (!overlayRoot) {
      return;
    }

    var existingOverlay = overlayRoot.querySelector("[data-onpri-main-text-preview-overlay='true']");

    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (!textValue) {
      return;
    }

    var normalizedOptions = normalizeTextCustomizerOptions(options);
    var positionStyles = getTextPreviewPositionStyles(normalizedOptions.position);
    var computedStyle = window.getComputedStyle(overlayRoot);

    if (computedStyle.position === "static") {
      overlayRoot.style.position = "relative";
    }

    var overlay = document.createElement("div");
    overlay.setAttribute("data-onpri-main-text-preview-overlay", "true");
    overlay.style.position = "absolute";
    overlay.style.display = "block";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "21";

    positionOverlayOnImageArea(overlay, mainImage, overlayRoot);

    var textPreview = document.createElement("div");
    textPreview.setAttribute("data-onpri-main-preview-text", "true");
    textPreview.textContent = textValue;
    textPreview.style.position = "absolute";
    textPreview.style.left = positionStyles.left;
    textPreview.style.top = positionStyles.top;
    textPreview.style.transform = "translate(-50%, -50%)";
    textPreview.style.maxWidth = "72%";
    textPreview.style.textAlign = "center";
    textPreview.style.fontSize = getTextPreviewFontSize(normalizedOptions.fontSize);
    textPreview.style.fontFamily = getTextPreviewFontFamily(normalizedOptions.fontFamily);
    textPreview.style.fontWeight = "700";
    textPreview.style.lineHeight = "1.1";
    textPreview.style.letterSpacing = "0.02em";
    textPreview.style.color = getTextPreviewColor(normalizedOptions.fontColor);
    textPreview.style.textShadow = getTextPreviewShadow(normalizedOptions.fontColor);
    textPreview.style.whiteSpace = "nowrap";
    textPreview.style.wordBreak = "normal";
    textPreview.style.pointerEvents = "none";

    overlay.appendChild(textPreview);
    overlayRoot.appendChild(overlay);
  }


  function updateTextPreview(container, textValue, options) {
    syncMainProductTextPreviewOverlay(textValue, options);

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

    if (!textValue) {
      var placeholder = document.createElement("p");
      placeholder.setAttribute("data-onpri-preview-placeholder", "true");
      placeholder.textContent = "名入れ文字を入力するとプレビューが表示されます。";
      placeholder.style.margin = "0";
      placeholder.style.color = "#666666";
      placeholder.style.fontSize = "14px";
      placeholder.style.textAlign = "center";
      placeholder.style.position = "absolute";
      placeholder.style.left = "50%";
      placeholder.style.top = "50%";
      placeholder.style.transform = "translate(-50%, -50%)";
      overlayLayer.appendChild(placeholder);
      return;
    }

    var textPreview = document.createElement("div");
    textPreview.setAttribute("data-onpri-preview-text", "true");
    textPreview.textContent = textValue;
    textPreview.style.position = "absolute";
    textPreview.style.left = "50%";
    textPreview.style.top = "50%";
    textPreview.style.transform = "translate(-50%, -50%)";
    textPreview.style.maxWidth = "80%";
    textPreview.style.textAlign = "center";
    textPreview.style.fontSize = "clamp(22px, 6vw, 42px)";
    textPreview.style.fontWeight = "700";
    textPreview.style.lineHeight = "1.2";
    textPreview.style.color = "#ffffff";
    textPreview.style.textShadow = "0 2px 6px rgba(0, 0, 0, 0.45)";
    textPreview.style.whiteSpace = "pre-wrap";
    textPreview.style.wordBreak = "break-word";
    textPreview.style.pointerEvents = "none";

    overlayLayer.appendChild(textPreview);
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
      var apiBase = container.__onpriApiBase || container.getAttribute("data-api-base") || "";

      container.__onpriPreviewDataUrl = previewDataUrl || "";

      if (!previewDataUrl || !apiBase) {
        container.__onpriPreviewImageUrl = "";
        return container.__onpriPreviewImageUrl;
      }

      return fetch(apiBase.replace(/\/$/, "") + "/api/customizer/preview", {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId:
            window.__onpriCustomizerSelection &&
            window.__onpriCustomizerSelection.config &&
            window.__onpriCustomizerSelection.config.product
              ? window.__onpriCustomizerSelection.config.product.id
              : "",
          settingId: setting && setting.id ? setting.id : "",
          previewDataUrl: previewDataUrl,
        }),
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to save preview image");
          }

          return response.json();
        })
        .then(function (result) {
          container.__onpriPreviewImageUrl = result.previewImageUrl || "";
          return container.__onpriPreviewImageUrl;
        })
        .catch(function () {
          container.__onpriPreviewImageUrl = "";
          return "";
        });
    });
  }

  function applySelectionToProductForm(container, config, setting) {
    if (!setting || setting.inputType !== "registered_image") {
      return false;
    }

    var forms = findProductForms(container);

    if (!forms.length) {
      return false;
    }

    var imageName = setting.image && setting.image.name ? setting.image.name : "";
    var imageUrl = setting.image && setting.image.imageUrl ? setting.image.imageUrl : "";

    forms.forEach(function (form) {
      clearCustomizerProperties(form);
      clearThirdPartyCustomizerProperties(form);

      setHiddenInput(form, "properties[ONPRI商品設定ID]", config.product.id);
      setHiddenInput(form, "properties[ONPRI商品名]", config.product.productTitle);
      setHiddenInput(form, "properties[ONPRIブランドID]", config.product.brandId);
      setHiddenInput(form, "properties[ONPRI設定ID]", setting.id);
      setHiddenInput(form, "properties[ONPRIカスタマイズ種別]", "イラスト印刷");
      var state = clampCustomizerState(getCustomizerState(container));

      setHiddenInput(form, "properties[ONPRI画像ID]", setting.imageId);
      setHiddenInput(form, "properties[ONPRI画像名]", imageName);
      setHiddenInput(form, "properties[ONPRI画像URL]", imageUrl);
      setHiddenInput(form, "properties[ONPRI位置X]", formatCustomizerNumber(state.positionX));
      setHiddenInput(form, "properties[ONPRI位置Y]", formatCustomizerNumber(state.positionY));
      setHiddenInput(form, "properties[ONPRI拡大率]", formatCustomizerNumber(state.scale));
      setHiddenInput(form, "properties[ONPRIプレビュー画像URL]", container.__onpriPreviewImageUrl || "");
    });

    window.__onpriCustomizerSelection = {
      container: container,
      config: config,
      setting: setting,
    };

    return true;
  }

  function applyTextSelectionToProductForm(container, config, setting, textValue, options) {
    var forms = findProductForms(container);

    if (!forms.length) {
      return false;
    }

    var normalizedOptions = normalizeTextCustomizerOptions(options);

    forms.forEach(function (form) {
      clearCustomizerProperties(form);
      clearThirdPartyCustomizerProperties(form);

      setHiddenInput(form, "properties[ONPRI商品設定ID]", config.product.id);
      setHiddenInput(form, "properties[ONPRI商品名]", config.product.productTitle);
      setHiddenInput(form, "properties[ONPRIブランドID]", config.product.brandId);
      setHiddenInput(form, "properties[ONPRI設定ID]", setting.id);
      setHiddenInput(form, "properties[ONPRIカスタマイズ種別]", "名入れ");
      setHiddenInput(form, "properties[ONPRI名入れテキスト]", textValue);
      setHiddenInput(form, "properties[ONPRI名入れ入力エリア]", normalizedOptions.area);
      setHiddenInput(form, "properties[ONPRI名入れ位置]", normalizedOptions.position);
      setHiddenInput(form, "properties[ONPRI名入れフォントサイズ]", normalizedOptions.fontSize);
      setHiddenInput(form, "properties[ONPRI名入れフォントカラー]", normalizedOptions.fontColor);
      setHiddenInput(form, "properties[ONPRI名入れフォント種類]", normalizedOptions.fontFamily);
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

  function createTextCustomizerOption(container, config, setting) {
    var wrapper = document.createElement("div");
    wrapper.style.border = "1px solid #dddddd";
    wrapper.style.padding = "12px";
    wrapper.style.margin = "0 0 16px";
    wrapper.style.background = "#ffffff";

    var label = document.createElement("label");
    label.textContent = setting.label || "名入れ";
    label.style.display = "block";
    label.style.fontWeight = "600";
    label.style.margin = "0 0 8px";

    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "名入れ文字を入力";
    input.maxLength = 30;
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    input.style.padding = "10px";
    input.style.border = "1px solid #dddddd";
    input.style.borderRadius = "6px";

    var controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "1fr 1fr";
    controls.style.gap = "10px";
    controls.style.margin = "12px 0 0";

    function createSelect(labelText, options, defaultValue) {
      var field = document.createElement("label");
      field.style.display = "block";
      field.style.fontSize = "13px";
      field.style.fontWeight = "600";

      var caption = document.createElement("span");
      caption.textContent = labelText;
      caption.style.display = "block";
      caption.style.margin = "0 0 4px";

      var select = document.createElement("select");
      select.style.width = "100%";
      select.style.boxSizing = "border-box";
      select.style.padding = "8px";
      select.style.border = "1px solid #dddddd";
      select.style.borderRadius = "6px";
      select.style.background = "#ffffff";

      options.forEach(function (optionValue) {
        var option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      });

      select.value = defaultValue;

      field.appendChild(caption);
      field.appendChild(select);

      return {
        field: field,
        select: select,
      };
    }

    var defaults = getDefaultTextCustomizerOptions();
    var areaSelect = createSelect("入力エリア", ["前面", "背面"], defaults.area);
    var positionSelect = createSelect("場所", ["中央", "上", "下", "左胸"], defaults.position);
    var fontSizeSelect = createSelect("フォントサイズ", ["小", "中", "大"], defaults.fontSize);
    var fontColorSelect = createSelect("フォントカラー", ["白", "黒", "赤", "青"], defaults.fontColor);
    var fontFamilySelect = createSelect("フォント種類", ["ゴシック", "明朝", "丸ゴシック"], defaults.fontFamily);

    controls.appendChild(areaSelect.field);
    controls.appendChild(positionSelect.field);
    controls.appendChild(fontSizeSelect.field);
    controls.appendChild(fontColorSelect.field);
    controls.appendChild(fontFamilySelect.field);

    var note = document.createElement("p");
    note.textContent = "入力した文字と選択内容はカート・注文情報に保存されます。";
    note.style.margin = "8px 0 0";
    note.style.fontSize = "13px";
    note.style.color = "#666666";

    var output = document.createElement("p");
    updateTextPreview(container, "", defaults);

    output.textContent = "名入れ: 未入力";
    output.style.margin = "8px 0 0";
    output.style.fontWeight = "600";

    function getCurrentOptions() {
      return {
        area: areaSelect.select.value,
        position: positionSelect.select.value,
        fontSize: fontSizeSelect.select.value,
        fontColor: fontColorSelect.select.value,
        fontFamily: fontFamilySelect.select.value,
      };
    }

    function refreshTextCustomization() {
      var textValue = input.value.trim();
      var options = getCurrentOptions();
      var applied = applyTextSelectionToProductForm(container, config, setting, textValue, options);

      updateTextPreview(container, textValue, options);

      output.textContent = textValue
        ? "名入れ: " + textValue
        : "名入れ: 未入力";

      if (!applied) {
        output.textContent += "（商品フォーム未検出）";
      }
    }

    input.addEventListener("input", refreshTextCustomization);
    areaSelect.select.addEventListener("change", refreshTextCustomization);
    positionSelect.select.addEventListener("change", refreshTextCustomization);
    fontSizeSelect.select.addEventListener("change", refreshTextCustomization);
    fontColorSelect.select.addEventListener("change", refreshTextCustomization);
    fontFamilySelect.select.addEventListener("change", refreshTextCustomization);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(controls);
    wrapper.appendChild(note);
    wrapper.appendChild(output);

    return wrapper;
  }


  function createCustomizerOptions(container, config, settings) {
    var wrapper = document.createElement("div");
    var registeredImageSettings = settings.filter(function (setting) {
      return setting.inputType === "registered_image";
    });
    var textSettings = settings.filter(function (setting) {
      return setting.inputType === "text";
    });

    if (textSettings.length) {
      var textHeading = document.createElement("h4");
      textHeading.textContent = "名入れ";
      textHeading.style.margin = "16px 0 12px";
      wrapper.appendChild(textHeading);

      textSettings.forEach(function (setting) {
        wrapper.appendChild(createTextCustomizerOption(container, config, setting));
      });
    }

    if (registeredImageSettings.length) {
      var heading = document.createElement("h4");
      heading.textContent = "登録済み画像を選択";
      heading.style.margin = "16px 0 12px";
      wrapper.appendChild(heading);

      var selectedOutput = document.createElement("p");
      selectedOutput.textContent = "選択中: 未選択";
      selectedOutput.style.margin = "12px 0 0";
      selectedOutput.style.fontWeight = "600";

      registeredImageSettings.forEach(function (setting) {
        wrapper.appendChild(createCustomizerOption(container, config, setting, selectedOutput));
      });

      wrapper.appendChild(selectedOutput);
      wrapper.appendChild(createPreviewControls(container));
    }

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

    installOnpriFormSubmitCleanup(container);

    wrapper.appendChild(createText("商品: " + config.product.productTitle));
    wrapper.appendChild(createText("ブランドID: " + config.product.brandId));

    if (!config.settings || config.settings.length === 0) {
      wrapper.appendChild(createText("カスタマイズ項目は未設定です。"));
      container.appendChild(wrapper);
      return;
    }

    var hasRegisteredImageSettings = config.settings.some(function (setting) {
      return setting.inputType === "registered_image";
    });

    if (hasRegisteredImageSettings) {
      wrapper.appendChild(createPreviewArea());
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
      container.__onpriApiBase = apiBase.replace(/\/$/, "");

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
        .catch(function (error) {
          console.error("ONPRI Customizer failed:", error);
          renderError(container);
        });
    });
  }

  function submitOnpriFormAfterPreview(form, submitter) {
    if (!window.__onpriCustomizerSelection) {
      return;
    }

    var selection = window.__onpriCustomizerSelection;

    updateGeneratedPreviewData(
      selection.container,
      selection.setting,
    ).then(function () {
      applySelectionToProductForm(
        selection.container,
        selection.config,
        selection.setting,
      );

      form.setAttribute("data-onpri-preview-ready", "true");

      if (typeof form.requestSubmit === "function") {
        form.requestSubmit(submitter || undefined);
        return;
      }

      form.submit();
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

    if (form.getAttribute("data-onpri-preview-ready") === "true") {
      form.removeAttribute("data-onpri-preview-ready");
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    submitOnpriFormAfterPreview(form, event.submitter || null);
  }, true);

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest
      ? event.target.closest('button[type="submit"], input[type="submit"]')
      : null;

    if (!button || !window.__onpriCustomizerSelection) {
      return;
    }

    var form = button.form || button.closest('form[action*="/cart/add"]');

    if (!form || !form.matches('form[action*="/cart/add"]')) {
      return;
    }

    if (form.getAttribute("data-onpri-preview-ready") === "true") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    submitOnpriFormAfterPreview(form, button);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

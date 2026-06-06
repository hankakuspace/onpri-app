// app/routes/app.customizer.tsx
import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  createCustomizerImageUpload,
  createCustomizerProduct,
  createCustomizerProductSetting,
  getCustomizerData,
  saveCustomizerProductImageAssignments,
} from "../lib/customizer.server";
import { authenticate } from "../shopify.server";

type ShopifyProductForCustomizer = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  brandId: string;
  featuredImageUrl: string;
  customizerProductId: string;
};

type ShopifyProductsGraphqlResponse = {
  data?: {
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          vendor: string;
          brandId: {
            value: string;
          } | null;
          featuredMedia: {
            preview: {
              image: {
                url: string;
              } | null;
            } | null;
          } | null;
          customizerProductId: {
            value: string;
          } | null;
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const customizerData = await getCustomizerData();
  const productsResponse = await admin.graphql(
    `#graphql
      query OnpriCustomizerProducts {
        products(first: 50, sortKey: TITLE) {
          edges {
            node {
              id
              title
              handle
              vendor
              brandId: metafield(namespace: "onpri", key: "brand_id") {
                value
              }
              featuredMedia {
                preview {
                  image {
                    url
                  }
                }
              }
              customizerProductId: metafield(namespace: "onpri", key: "customizer_product_id") {
                value
              }
            }
          }
        }
      }
    `,
  );

  const productsJson = (await productsResponse.json()) as ShopifyProductsGraphqlResponse;

  const shopifyProducts: ShopifyProductForCustomizer[] =
    productsJson.data?.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      vendor: node.vendor,
      brandId: node.brandId?.value || "",
      featuredImageUrl: node.featuredMedia?.preview?.image?.url || "",
      customizerProductId: node.customizerProductId?.value || "",
    })) || [];

  return {
    ...customizerData,
    shop: session.shop,
    shopifyProducts,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-customizer-image") {
    const imageFiles = formData
      .getAll("imageFiles")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (imageFiles.length === 0) {
      return {
        ok: false,
        message: "画像ファイルを選択してください。",
      };
    }

    for (const imageFile of imageFiles) {
      const result = await createCustomizerImageUpload({
        file: imageFile,
      });

      if (!result.ok) {
        return result;
      }
    }

    return {
      ok: true,
      message: `${imageFiles.length}件の登録済み画像をアップロードしました。`,
    };
  }

  if (intent === "save-shopify-product-images") {
    const productId = String(formData.get("productId") ?? "");
    const productTitle = String(formData.get("productTitle") ?? "");
    const productHandle = String(formData.get("productHandle") ?? "");
    const productVendor = String(formData.get("productVendor") ?? "");
    const productBrandId = String(formData.get("productBrandId") ?? "");
    const customizerProductId = String(formData.get("customizerProductId") ?? "");
    const customizationType = String(formData.get("customizationType") ?? "registered_image");
    const imageIds = formData.getAll("imageIds").map((imageId) => String(imageId));

    const result = await saveCustomizerProductImageAssignments({
      shop: session.shop,
      productId,
      productTitle,
      productHandle,
      productVendor,
      productBrandId,
      customizerProductId,
      customizationType,
      imageIds,
    });

    if (!result.ok) {
      return result;
    }

    const metafieldsResponse = await admin.graphql(
      `#graphql
        mutation OnpriSetCustomizerProductId($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: [
            {
              ownerId: productId,
              namespace: "onpri",
              key: "customizer_product_id",
              type: "single_line_text_field",
              value: result.customizerProductId,
            },
          ],
        },
      },
    );

    const metafieldsJson = await metafieldsResponse.json();
    const userErrors = metafieldsJson.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      return {
        ok: false,
        message: userErrors.map((error: { message: string }) => error.message).join(" / "),
      };
    }

    return {
      ok: true,
      message: "Shopify商品への登録画像紐づけを保存しました。",
    };
  }

  if (intent === "create-customizer-product") {
    const result = await createCustomizerProduct({
      id: String(formData.get("id") ?? ""),
      shop: String(formData.get("shop") ?? ""),
      productId: String(formData.get("productId") ?? ""),
      productTitle: String(formData.get("productTitle") ?? ""),
      brandId: String(formData.get("brandId") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      message: "対象商品を保存しました。",
    };
  }

  if (intent === "create-customizer-product-setting") {
    const result = await createCustomizerProductSetting({
      id: String(formData.get("id") ?? ""),
      productSettingId: String(formData.get("productSettingId") ?? ""),
      productId: String(formData.get("productId") ?? ""),
      imageId: String(formData.get("imageId") ?? ""),
      label: String(formData.get("label") ?? ""),
      inputType: String(formData.get("inputType") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      message: "商品別カスタマイズ設定を保存しました。",
    };
  }

  return {
    ok: false,
    message: "未対応の操作です。",
  };
};

export default function CustomizerPage() {
  const { images, products, settings, shopifyProducts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeSection, setActiveSection] = useState("shopify-products");
  const [selectedImageFileNames, setSelectedImageFileNames] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingImageIds, setEditingImageIds] = useState<string[]>([]);
  const [editingCustomizationType, setEditingCustomizationType] =
    useState<"registered_image" | "text">("registered_image");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");

  const menuItems = [
    { id: "shopify-products", label: "Shopify商品設定" },
    { id: "create-image", label: "登録済み画像を追加" },
  ];
  const productById = new Map(products.map((product) => [product.id, product]));
  const imageById = new Map(images.map((image) => [image.id, image]));
  const registeredImages = images.filter(
    (image) => image.type === "登録済み画像" && image.imageUrl,
  );

  function getAssignedImageIds(customizerProductId: string) {
    return settings
      .filter(
        (setting) =>
          setting.productId === customizerProductId &&
          setting.inputType === "registered_image",
      )
      .map((setting) => setting.imageId);
  }

  function getCustomizationTypes(customizerProductId: string) {
    const targetSettings = settings.filter(
      (setting) => setting.productId === customizerProductId,
    );
    const types: string[] = [];

    if (targetSettings.some((setting) => setting.inputType === "text")) {
      types.push("名入れ");
    }

    if (targetSettings.some((setting) => setting.inputType === "registered_image")) {
      types.push("イラスト印刷");
    }

    return types.length > 0 ? types.join(" / ") : "未設定";
  }

  function getDefaultCustomizationType(customizerProductId: string) {
    const targetSettings = settings.filter(
      (setting) => setting.productId === customizerProductId,
    );

    return targetSettings.some((setting) => setting.inputType === "text")
      ? "text"
      : "registered_image";
  }

  function openProductImageEditor(productId: string, assignedImageIds: string[], customizationType: "registered_image" | "text") {
    setEditingProductId(productId);
    setEditingImageIds(assignedImageIds);
    setEditingCustomizationType(customizationType);
    setLibrarySearchQuery("");
  }

  function closeProductImageEditor() {
    setEditingProductId(null);
    setEditingImageIds([]);
    setEditingCustomizationType("registered_image");
    setLibrarySearchQuery("");
  }

  function toggleEditingImageId(imageId: string) {
    setEditingImageIds((currentImageIds) =>
      currentImageIds.includes(imageId)
        ? currentImageIds.filter((currentImageId) => currentImageId !== imageId)
        : [...currentImageIds, imageId],
    );
  }

  function updateSelectedImageFileNames(files: FileList | null) {
    setSelectedImageFileNames(files ? Array.from(files).map((file) => file.name) : []);
  }

  function handleImageFilesDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (droppedFiles.length === 0) {
      return;
    }

    const dataTransfer = new DataTransfer();

    droppedFiles.forEach((file) => {
      dataTransfer.items.add(file);
    });

    const input = event.currentTarget.querySelector<HTMLInputElement>(
      'input[name="imageFiles"]',
    );

    if (input) {
      input.files = dataTransfer.files;
      updateSelectedImageFileNames(input.files);
    }
  }

  return (
    <div className="onpri-customizer-full-page">
      <style>
        {`
          .onpri-admin-table-wrap {
            width: 100%;
            overflow-x: auto;
          }

          .onpri-admin-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          .onpri-admin-table th,
          .onpri-admin-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e5e5;
            text-align: left;
            vertical-align: top;
            white-space: nowrap;
          }

          .onpri-admin-table th {
            background: #f6f6f7;
            font-weight: 600;
          }

          .onpri-admin-table tr:last-child td {
            border-bottom: none;
          }

          .onpri-customizer-menu {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 0 0 20px;
          }

          .onpri-customizer-menu button {
            padding: 8px 12px;
            border: 1px solid #d6d6d6;
            border-radius: 999px;
            background: #fff;
            cursor: pointer;
          }

          .onpri-customizer-menu button.is-active {
            border-color: #111;
            background: #111;
            color: #fff;
          }

          .onpri-upload-box {
            display: grid;
            gap: 8px;
            padding: 28px;
            border: 2px dashed #c9c9c9;
            border-radius: 12px;
            background: #fafafa;
            text-align: center;
          }

          .onpri-upload-box input {
            margin: 0 auto;
          }

          .onpri-upload-note {
            margin: 0;
            color: #666;
            font-size: 13px;
          }

          .onpri-product-card {
            display: grid;
            gap: 16px;
            padding: 16px;
            border: 1px solid #e1e1e1;
            border-radius: 12px;
            background: #fff;
          }

          .onpri-product-card + .onpri-product-card {
            margin-top: 16px;
          }

          .onpri-product-card-header {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .onpri-product-card-image {
            width: 72px;
            height: 72px;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f6f6f6;
          }

          .onpri-image-check-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
          }

          .onpri-image-check {
            display: grid;
            gap: 8px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 10px;
            background: #fafafa;
          }

          .onpri-image-check img {
            width: 100%;
            height: 96px;
            object-fit: contain;
            background: #fff;
          }

          .onpri-assigned-images {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
          }

          .onpri-assigned-image {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #fff;
          }

          .onpri-product-image {
            width: 56px;
            height: 56px;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f6f6f6;
          }

          .onpri-edit-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(0, 0, 0, 0.5);
          }

          .onpri-edit-modal {
            width: min(960px, 92vw);
            max-height: 88vh;
            overflow: auto;
            padding: 24px;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
          }

          .onpri-edit-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
          }

          .onpri-edit-modal-close {
            border: 0;
            background: #111;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
          }

          .onpri-edit-modal-section {
            margin-top: 20px;
          }

          .onpri-library-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
          }

          .onpri-library-card {
            display: grid;
            gap: 8px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 10px;
            background: #fafafa;
          }

          .onpri-library-card.is-selected {
            border-color: #111;
            background: #f1f1f1;
          }

          .onpri-library-card img {
            width: 100%;
            height: 56px;
            object-fit: contain;
            background: #fff;
          }

          .onpri-library-card button {
            width: 100%;
          }

          .onpri-customization-type-options {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .onpri-customization-type-options label {
            display: flex;
            gap: 6px;
            align-items: center;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 999px;
            background: #fafafa;
          }

          .onpri-assigned-images {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
          }

          .onpri-assigned-image {
            width: 56px;
            height: 56px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #fff;
          }

          .onpri-product-setting-details {
            margin-top: 8px;
          }

          .onpri-product-setting-details summary {
            cursor: pointer;
            font-weight: 600;
          }

          .onpri-edit-modal {
            width: min(960px, 92vw);
            max-height: 88vh;
            overflow: hidden;
            padding: 0;
            border-radius: 16px;
            background: #ffffff;
            color: #1f2225;
            box-shadow: 0 0 0 1px rgba(26, 28, 29, 0.05), 0 30px 60px -20px rgba(26, 28, 29, 0.45);
            display: flex;
            flex-direction: column;
          }

          .onpri-edit-modal-header {
            padding: 24px 28px;
            border-bottom: 1px solid #e3e3e3;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
          }

          .onpri-modal-title {
            margin: 0;
            font-size: 22px;
            line-height: 1.35;
            font-weight: 700;
          }

          .onpri-modal-subtitle {
            margin-top: 6px;
            color: #5c5f62;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .onpri-brand-badge {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 2px 10px;
            border-radius: 999px;
            background: #f1f2f3;
            color: #5c5f62;
            font-size: 13px;
          }

          .onpri-edit-modal-close {
            border: 0;
            background: transparent;
            color: #5c5f62;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 28px;
            line-height: 1;
          }

          .onpri-edit-modal-close:hover {
            background: #f6f6f7;
          }

          .onpri-modal-body {
            padding: 28px;
            overflow: auto;
          }

          .onpri-modal-section-title {
            margin: 0 0 14px;
            font-size: 16px;
            font-weight: 700;
          }

          .onpri-segment {
            display: inline-flex;
            padding: 4px;
            border: 1px solid #d2d4d6;
            border-radius: 12px;
            background: #f1f2f3;
            gap: 4px;
          }

          .onpri-segment-button {
            min-height: 42px;
            padding: 0 18px;
            border: 1px solid transparent;
            border-radius: 9px;
            background: transparent;
            color: #5c5f62;
            font-weight: 600;
            cursor: pointer;
          }

          .onpri-segment-button.is-active {
            background: #ffffff;
            color: #1f2225;
            border-color: #d2d4d6;
            box-shadow: 0 1px 0 rgba(26, 28, 29, 0.10);
          }

          .onpri-current-images {
            margin-top: 24px;
            padding: 14px;
            border: 1px solid #e3e3e3;
            border-radius: 12px;
            background: #fafafa;
          }

          .onpri-current-images-title {
            margin: 0 0 10px;
            font-size: 14px;
            font-weight: 700;
          }

          .onpri-current-images-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .onpri-current-image-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border: 1px solid #d2d4d6;
            border-radius: 999px;
            background: #ffffff;
            font-size: 13px;
            max-width: 220px;
          }

          .onpri-current-image-chip img {
            width: 28px;
            height: 28px;
            object-fit: contain;
            border-radius: 6px;
            background: #fff;
          }

          .onpri-current-image-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .onpri-library-head {
            margin-top: 22px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 16px;
          }

          .onpri-count-badge {
            display: inline-flex;
            margin-left: 8px;
            padding: 2px 10px;
            border-radius: 999px;
            background: #f1f2f3;
            color: #5c5f62;
            font-size: 13px;
            font-weight: 600;
          }

          .onpri-library-tools {
            margin-top: 14px;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items: center;
          }

          .onpri-library-search {
            min-height: 44px;
            width: 100%;
            padding: 0 14px;
            border: 1px solid #c9cccf;
            border-radius: 10px;
            background: #ffffff;
            font-size: 14px;
          }

          .onpri-bulk-button {
            min-height: 44px;
            padding: 0 18px;
            border: 1px solid #008060;
            border-radius: 10px;
            background: #008060;
            color: #ffffff;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
          }

          .onpri-bulk-button:hover {
            background: #006e52;
          }

          .onpri-library-list {
            margin-top: 18px;
            border: 1px solid #e3e3e3;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
          }

          .onpri-library-row {
            display: grid;
            grid-template-columns: 32px 52px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            padding: 8px 14px;
            border-bottom: 1px solid #e3e3e3;
          }

          .onpri-library-row:last-child {
            border-bottom: 0;
          }

          .onpri-library-row.is-selected {
            background: #f1f8f5;
          }

          .onpri-library-checkbox {
            width: 18px;
            height: 18px;
            accent-color: #008060;
          }

          .onpri-library-thumb {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border: 1px solid #e3e3e3;
            border-radius: 10px;
            background: #ffffff;
          }

          .onpri-library-name {
            min-width: 0;
            font-size: 14px;
            font-weight: 700;
            color: #1f2225;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .onpri-library-meta {
            margin-top: 2px;
            font-size: 12px;
            color: #5c5f62;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .onpri-status-badge {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
          }

          .onpri-status-badge.is-selected {
            background: #e3f1ec;
            color: #0c5132;
          }

          .onpri-status-badge.is-empty {
            background: #f1f2f3;
            color: #5c5f62;
          }

          .onpri-name-placeholder {
            margin-top: 18px;
            padding: 20px;
            border: 1px dashed #c9cccf;
            border-radius: 12px;
            background: #fafafa;
            color: #5c5f62;
          }

          .onpri-edit-modal-footer {
            padding: 18px 28px;
            border-top: 1px solid #e3e3e3;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            background: #ffffff;
          }

          .onpri-footer-note {
            color: #5c5f62;
            font-size: 14px;
          }

          .onpri-footer-actions {
            display: flex;
            gap: 10px;
          }

          .onpri-secondary-button {
            min-height: 40px;
            padding: 0 18px;
            border: 1px solid #c9cccf;
            border-radius: 9px;
            background: #ffffff;
            color: #1f2225;
            font-weight: 700;
            cursor: pointer;
          }

          .onpri-primary-button {
            min-height: 40px;
            padding: 0 18px;
            border: 1px solid #008060;
            border-radius: 9px;
            background: #008060;
            color: #ffffff;
            font-weight: 700;
            cursor: pointer;
          }

          .onpri-primary-button:hover {
            background: #006e52;
          }

          .onpri-segment {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 0;
            border: 0;
            background: transparent;
          }

          .onpri-segment-button {
            min-height: 74px;
            padding: 14px 16px;
            border: 1px solid #d2d4d6;
            border-radius: 10px;
            background: #ffffff;
            color: #1f2225;
            cursor: pointer;
            text-align: left;
            display: grid;
            gap: 6px;
          }

          .onpri-segment-button.is-active {
            border-color: #008060;
            background: #f1f8f5;
            box-shadow: 0 0 0 1px #008060;
          }

          .onpri-customization-card-title {
            font-size: 15px;
            font-weight: 700;
          }

          .onpri-customization-card-description {
            color: #5c5f62;
            font-size: 13px;
            line-height: 1.45;
            font-weight: 400;
          }

          .onpri-current-images {
            margin-top: 24px;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
          }

          .onpri-current-images-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 10px;
          }

          .onpri-current-images-title {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
          }

          .onpri-current-image-list {
            display: grid;
            gap: 8px;
          }

          .onpri-current-image-row {
            display: grid;
            grid-template-columns: 48px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            padding: 10px 12px;
            border: 1px solid #dbe9e3;
            border-radius: 10px;
            background: #f1f8f5;
          }

          .onpri-current-image-row img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border: 1px solid #e3e3e3;
            border-radius: 8px;
            background: #ffffff;
          }

          .onpri-current-image-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2225;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .onpri-current-image-meta {
            margin-top: 2px;
            color: #5c5f62;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .onpri-danger-button {
            min-height: 32px;
            padding: 0 12px;
            border: 1px solid #f0c6c6;
            border-radius: 8px;
            background: #ffffff;
            color: #d72c0d;
            font-weight: 700;
            cursor: pointer;
          }

          .onpri-danger-button:hover {
            background: #fff4f4;
          }

          .onpri-admin-page {
            max-width: none;
            width: 100%;
          }

          .onpri-admin-section {
            width: 100%;
            border: 1px solid #dcdfe3;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }

          .onpri-admin-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 16px;
            border-bottom: 1px solid #dcdfe3;
            background: #ffffff;
          }

          .onpri-admin-section-title {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: #202223;
          }

          .onpri-admin-section-description {
            margin: 2px 0 0;
            color: #616161;
            font-size: 13px;
          }

          .onpri-admin-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .onpri-admin-toolbar-button {
            min-height: 32px;
            padding: 0 12px;
            border: 1px solid #c9cccf;
            border-radius: 8px;
            background: #ffffff;
            color: #202223;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .onpri-admin-toolbar-button:hover {
            background: #f6f6f7;
          }

          .onpri-admin-table-wrap {
            width: 100%;
            overflow-x: auto;
            background: #ffffff;
          }

          .onpri-admin-table {
            width: 100%;
            min-width: 920px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 14px;
          }

          .onpri-admin-table thead th {
            padding: 10px 12px;
            border-bottom: 1px solid #dcdfe3;
            background: #f7f7f7;
            color: #616161;
            font-size: 13px;
            font-weight: 700;
            text-align: left;
            white-space: nowrap;
          }

          .onpri-admin-table tbody td {
            padding: 10px 12px;
            border-bottom: 1px solid #ebebeb;
            color: #202223;
            vertical-align: middle;
          }

          .onpri-admin-table tbody tr:last-child td {
            border-bottom: 0;
          }

          .onpri-admin-table tbody tr:hover td {
            background: #f9fafb;
          }

          .onpri-admin-table .onpri-product-image {
            width: 44px;
            height: 44px;
            object-fit: contain;
            border: 1px solid #dcdfe3;
            border-radius: 8px;
            background: #ffffff;
          }

          .onpri-admin-table .onpri-assigned-images {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
          }

          .onpri-admin-table .onpri-assigned-image {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border: 1px solid #dcdfe3;
            border-radius: 8px;
            background: #ffffff;
          }

          .onpri-admin-edit-button {
            min-height: 32px;
            padding: 0 12px;
            border: 1px solid #8c9196;
            border-radius: 8px;
            background: #ffffff;
            color: #202223;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .onpri-admin-edit-button:hover {
            background: #f6f6f7;
          }

          /* Shopify orders-like list overrides */
          .onpri-admin-wrap {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 16px 0 0;
          }

          .onpri-admin-menu {
            width: 100%;
            max-width: none;
            margin: 0 0 12px;
            padding: 0 16px;
            display: flex;
            gap: 8px;
          }

          .onpri-admin-menu button {
            min-height: 32px;
            padding: 0 12px;
            border: 1px solid #c9cccf;
            border-radius: 8px;
            background: #ffffff;
            color: #202223;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
          }

          .onpri-admin-menu button.is-active {
            background: #1f1f1f;
            border-color: #1f1f1f;
            color: #ffffff;
          }

          .onpri-admin-section {
            width: calc(100% - 32px);
            max-width: none;
            margin: 0 16px;
            border: 1px solid #dcdfe3;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }

          .onpri-admin-section-header {
            min-height: 44px;
            padding: 0;
            border-bottom: 1px solid #dcdfe3;
            background: #ffffff;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
          }

          .onpri-admin-section-header > div:first-child {
            padding: 10px 16px;
          }

          .onpri-admin-section-title {
            display: none;
          }

          .onpri-admin-section-description {
            margin: 0;
            color: #616161;
            font-size: 13px;
          }

          .onpri-admin-toolbar {
            height: 44px;
            padding: 0 12px;
            display: flex;
            align-items: center;
            border-left: 1px solid #ebebeb;
          }

          .onpri-admin-toolbar-button {
            min-height: 28px;
            padding: 0 12px;
            border: 0;
            border-radius: 8px;
            background: #f1f1f1;
            color: #202223;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .onpri-admin-toolbar-button:hover {
            background: #e7e7e7;
          }

          .onpri-admin-table-wrap {
            width: 100%;
            overflow-x: auto;
            background: #ffffff;
          }

          .onpri-admin-table {
            width: 100%;
            min-width: 1180px;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 13px;
          }

          .onpri-admin-table thead th {
            height: 36px;
            padding: 0 12px;
            border-bottom: 1px solid #dcdfe3;
            background: #f7f7f7;
            color: #616161;
            font-size: 12px;
            font-weight: 600;
            text-align: left;
            white-space: nowrap;
          }

          .onpri-admin-table tbody td {
            height: 44px;
            padding: 6px 12px;
            border-bottom: 1px solid #ebebeb;
            color: #202223;
            vertical-align: middle;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .onpri-admin-table tbody tr:last-child td {
            border-bottom: 0;
          }

          .onpri-admin-table tbody tr:hover td {
            background: #f9fafb;
          }

          .onpri-admin-table th:nth-child(1),
          .onpri-admin-table td:nth-child(1) {
            width: 96px;
          }

          .onpri-admin-table th:nth-child(2),
          .onpri-admin-table td:nth-child(2) {
            width: 340px;
          }

          .onpri-admin-table th:nth-child(3),
          .onpri-admin-table td:nth-child(3) {
            width: 120px;
          }

          .onpri-admin-table th:nth-child(4),
          .onpri-admin-table td:nth-child(4) {
            width: 150px;
          }

          .onpri-admin-table th:nth-child(5),
          .onpri-admin-table td:nth-child(5) {
            width: 170px;
          }

          .onpri-admin-table th:nth-child(6),
          .onpri-admin-table td:nth-child(6) {
            width: 92px;
            text-align: right;
          }

          .onpri-admin-table .onpri-product-image {
            width: 32px;
            height: 32px;
            object-fit: contain;
            border: 1px solid #dcdfe3;
            border-radius: 6px;
            background: #ffffff;
          }

          .onpri-admin-table .onpri-assigned-images {
            display: flex;
            flex-wrap: nowrap;
            gap: 4px;
            align-items: center;
          }

          .onpri-admin-table .onpri-assigned-image {
            width: 32px;
            height: 32px;
            object-fit: contain;
            border: 1px solid #dcdfe3;
            border-radius: 6px;
            background: #ffffff;
          }

          .onpri-admin-edit-button {
            min-height: 28px;
            padding: 0 12px;
            border: 1px solid #8c9196;
            border-radius: 8px;
            background: #ffffff;
            color: #202223;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .onpri-admin-edit-button:hover {
            background: #f6f6f7;
          }

          .onpri-muted-text {
            color: #6d7175;
          }

          /* Force Shopify admin orders-like full width layout */
          .onpri-admin-page,
          .onpri-admin-wrap {
            width: 100vw !important;
            max-width: none !important;
            margin-left: calc(50% - 50vw) !important;
            margin-right: calc(50% - 50vw) !important;
            padding: 12px 0 0 !important;
          }

          .onpri-admin-menu {
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 12px !important;
            padding: 0 16px !important;
            display: flex !important;
            gap: 8px !important;
          }

          .onpri-admin-menu button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
          }

          .onpri-admin-menu button.is-active {
            background: #202223 !important;
            color: #ffffff !important;
          }

          .onpri-admin-section {
            width: calc(100vw - 32px) !important;
            max-width: none !important;
            margin: 0 16px !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) !important;
            overflow: hidden !important;
          }

          .onpri-admin-section-header {
            min-height: 44px !important;
            padding: 0 !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #ffffff !important;
            display: grid !important;
            grid-template-columns: 1fr auto !important;
            align-items: center !important;
          }

          .onpri-admin-section-header > div:first-child {
            padding: 9px 16px !important;
          }

          .onpri-admin-section-title {
            display: none !important;
          }

          .onpri-admin-section-description {
            margin: 0 !important;
            color: #616161 !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .onpri-admin-toolbar {
            height: 44px !important;
            padding: 0 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-left: 1px solid #ebebeb !important;
          }

          .onpri-admin-toolbar-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
          }

          .onpri-admin-toolbar-button:hover {
            background: #dcdcdc !important;
          }

          .onpri-admin-table-wrap {
            width: 100% !important;
            overflow-x: auto !important;
            background: #ffffff !important;
          }

          .onpri-admin-table {
            width: 100% !important;
            min-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 13px !important;
          }

          .onpri-admin-table thead th {
            height: 36px !important;
            padding: 0 12px !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #f7f7f7 !important;
            color: #616161 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            text-align: left !important;
            white-space: nowrap !important;
          }

          .onpri-admin-table tbody td {
            height: 44px !important;
            padding: 6px 12px !important;
            border-bottom: 1px solid #ebebeb !important;
            color: #202223 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .onpri-admin-table tbody tr:last-child td {
            border-bottom: 0 !important;
          }

          .onpri-admin-table tbody tr:hover td {
            background: #f9fafb !important;
          }

          .onpri-admin-table th:nth-child(1),
          .onpri-admin-table td:nth-child(1) {
            width: 110px !important;
          }

          .onpri-admin-table th:nth-child(2),
          .onpri-admin-table td:nth-child(2) {
            width: auto !important;
          }

          .onpri-admin-table th:nth-child(3),
          .onpri-admin-table td:nth-child(3) {
            width: 120px !important;
          }

          .onpri-admin-table th:nth-child(4),
          .onpri-admin-table td:nth-child(4) {
            width: 150px !important;
          }

          .onpri-admin-table th:nth-child(5),
          .onpri-admin-table td:nth-child(5) {
            width: 170px !important;
          }

          .onpri-admin-table th:nth-child(6),
          .onpri-admin-table td:nth-child(6) {
            width: 96px !important;
            text-align: right !important;
          }

          .onpri-admin-table .onpri-product-image,
          .onpri-admin-table .onpri-assigned-image {
            width: 32px !important;
            height: 32px !important;
            object-fit: contain !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }

          .onpri-admin-table .onpri-assigned-images {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            align-items: center !important;
          }

          .onpri-admin-edit-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 1px solid #8c9196 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
          }

          .onpri-admin-edit-button:hover {
            background: #f6f6f7 !important;
          }

          /* Fix embedded app overflow: use app container width, not viewport width */
          .onpri-admin-page,
          .onpri-admin-wrap {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 12px 16px 0 !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .onpri-admin-menu {
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 12px !important;
            padding: 0 !important;
            display: flex !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }

          .onpri-admin-section {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .onpri-admin-table-wrap {
            width: 100% !important;
            overflow-x: auto !important;
            background: #ffffff !important;
          }

          .onpri-admin-table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 13px !important;
          }

          .onpri-admin-table th:nth-child(1),
          .onpri-admin-table td:nth-child(1) {
            width: 9% !important;
          }

          .onpri-admin-table th:nth-child(2),
          .onpri-admin-table td:nth-child(2) {
            width: 34% !important;
          }

          .onpri-admin-table th:nth-child(3),
          .onpri-admin-table td:nth-child(3) {
            width: 12% !important;
          }

          .onpri-admin-table th:nth-child(4),
          .onpri-admin-table td:nth-child(4) {
            width: 15% !important;
          }

          .onpri-admin-table th:nth-child(5),
          .onpri-admin-table td:nth-child(5) {
            width: 18% !important;
          }

          .onpri-admin-table th:nth-child(6),
          .onpri-admin-table td:nth-child(6) {
            width: 12% !important;
            text-align: right !important;
          }

          .onpri-admin-table thead th {
            height: 36px !important;
            padding: 0 12px !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #f7f7f7 !important;
            color: #616161 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            text-align: left !important;
            white-space: nowrap !important;
          }

          .onpri-admin-table thead th:last-child {
            text-align: right !important;
          }

          .onpri-admin-table tbody td {
            height: 44px !important;
            padding: 6px 12px !important;
            border-bottom: 1px solid #ebebeb !important;
            color: #202223 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .onpri-admin-table tbody tr:last-child td {
            border-bottom: 0 !important;
          }

          .onpri-admin-table tbody tr:hover td {
            background: #f9fafb !important;
          }

          .onpri-admin-table .onpri-product-image,
          .onpri-admin-table .onpri-assigned-image {
            width: 32px !important;
            height: 32px !important;
            object-fit: contain !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }

          .onpri-admin-table .onpri-assigned-images {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            align-items: center !important;
            overflow: hidden !important;
          }

          .onpri-admin-edit-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 1px solid #8c9196 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            white-space: nowrap !important;
          }

          .onpri-admin-edit-button:hover {
            background: #f6f6f7 !important;
          }

          /* Final layout fix: match Shopify admin content width without 100vw overflow */
          .onpri-admin-page,
          .onpri-admin-wrap {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 16px !important;
            box-sizing: border-box !important;
          }

          .onpri-admin-menu {
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 12px !important;
            padding: 0 !important;
            display: flex !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }

          .onpri-admin-menu button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            cursor: pointer !important;
          }

          .onpri-admin-menu button.is-active {
            background: #202223 !important;
            color: #ffffff !important;
          }

          .onpri-admin-section {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .onpri-admin-section-header {
            min-height: 44px !important;
            padding: 0 !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #ffffff !important;
            display: grid !important;
            grid-template-columns: 1fr auto !important;
            align-items: center !important;
          }

          .onpri-admin-section-header > div:first-child {
            padding: 9px 16px !important;
          }

          .onpri-admin-section-title {
            display: none !important;
          }

          .onpri-admin-section-description {
            margin: 0 !important;
            color: #616161 !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .onpri-admin-toolbar {
            height: 44px !important;
            padding: 0 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-left: 1px solid #ebebeb !important;
          }

          .onpri-admin-toolbar-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            cursor: pointer !important;
          }

          .onpri-admin-table-wrap {
            width: 100% !important;
            overflow-x: auto !important;
            background: #ffffff !important;
          }

          .onpri-admin-table {
            width: 100% !important;
            min-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 13px !important;
          }

          .onpri-admin-table thead th {
            height: 36px !important;
            padding: 0 12px !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #f7f7f7 !important;
            color: #616161 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            text-align: left !important;
            white-space: nowrap !important;
          }

          .onpri-admin-table tbody td {
            height: 44px !important;
            padding: 6px 12px !important;
            border-bottom: 1px solid #ebebeb !important;
            color: #202223 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .onpri-admin-table tbody tr:hover td {
            background: #f9fafb !important;
          }

          .onpri-admin-table th:nth-child(1),
          .onpri-admin-table td:nth-child(1) {
            width: 10% !important;
          }

          .onpri-admin-table th:nth-child(2),
          .onpri-admin-table td:nth-child(2) {
            width: 36% !important;
          }

          .onpri-admin-table th:nth-child(3),
          .onpri-admin-table td:nth-child(3) {
            width: 12% !important;
          }

          .onpri-admin-table th:nth-child(4),
          .onpri-admin-table td:nth-child(4) {
            width: 16% !important;
          }

          .onpri-admin-table th:nth-child(5),
          .onpri-admin-table td:nth-child(5) {
            width: 16% !important;
          }

          .onpri-admin-table th:nth-child(6),
          .onpri-admin-table td:nth-child(6) {
            width: 10% !important;
            text-align: right !important;
          }

          .onpri-admin-table thead th:last-child {
            text-align: right !important;
          }

          .onpri-admin-table .onpri-product-image,
          .onpri-admin-table .onpri-assigned-image {
            width: 32px !important;
            height: 32px !important;
            object-fit: contain !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }

          .onpri-admin-edit-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 1px solid #8c9196 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            white-space: nowrap !important;
            cursor: pointer !important;
          }

          .onpri-admin-edit-button:hover {
            background: #f6f6f7 !important;
          }

          .onpri-muted-text {
            color: #6d7175;
          }

          /* ONPRI final full-width layout */
          .onpri-customizer-full-page {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 16px;
            box-sizing: border-box;
          }

          .onpri-customizer-full-page .onpri-admin-page,
          .onpri-customizer-full-page .onpri-admin-wrap {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow-x: visible !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu {
            width: 100% !important;
            max-width: none !important;
            margin: 0 0 12px !important;
            padding: 0 !important;
            display: flex !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            cursor: pointer !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu button.is-active {
            background: #202223 !important;
            color: #ffffff !important;
          }

          .onpri-customizer-full-page .onpri-admin-section {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }

          .onpri-customizer-full-page .onpri-admin-section-header {
            min-height: 44px !important;
            padding: 0 !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #ffffff !important;
            display: grid !important;
            grid-template-columns: 1fr auto !important;
            align-items: center !important;
          }

          .onpri-customizer-full-page .onpri-admin-section-header > div:first-child {
            padding: 9px 16px !important;
          }

          .onpri-customizer-full-page .onpri-admin-section-title {
            display: none !important;
          }

          .onpri-customizer-full-page .onpri-admin-section-description {
            margin: 0 !important;
            color: #616161 !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .onpri-customizer-full-page .onpri-admin-toolbar {
            height: 44px !important;
            padding: 0 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-left: 1px solid #ebebeb !important;
          }

          .onpri-customizer-full-page .onpri-admin-toolbar-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: #e3e3e3 !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            cursor: pointer !important;
          }

          .onpri-customizer-full-page .onpri-admin-table-wrap {
            width: 100% !important;
            overflow-x: auto !important;
            background: #ffffff !important;
          }

          .onpri-customizer-full-page .onpri-admin-table {
            width: 100% !important;
            min-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 13px !important;
          }

          .onpri-customizer-full-page .onpri-admin-table thead th {
            height: 36px !important;
            padding: 0 12px !important;
            border-bottom: 1px solid #dcdfe3 !important;
            background: #f7f7f7 !important;
            color: #616161 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            text-align: left !important;
            white-space: nowrap !important;
          }

          .onpri-customizer-full-page .onpri-admin-table tbody td {
            height: 44px !important;
            padding: 6px 12px !important;
            border-bottom: 1px solid #ebebeb !important;
            color: #202223 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .onpri-customizer-full-page .onpri-admin-table tbody tr:hover td {
            background: #f9fafb !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(1),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(1) {
            width: 10% !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(2),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(2) {
            width: 36% !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(3),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(3) {
            width: 12% !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(4),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(4) {
            width: 16% !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(5),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(5) {
            width: 16% !important;
          }

          .onpri-customizer-full-page .onpri-admin-table th:nth-child(6),
          .onpri-customizer-full-page .onpri-admin-table td:nth-child(6) {
            width: 10% !important;
            text-align: right !important;
          }

          .onpri-customizer-full-page .onpri-admin-table thead th:last-child {
            text-align: right !important;
          }

          .onpri-customizer-full-page .onpri-admin-table .onpri-product-image,
          .onpri-customizer-full-page .onpri-admin-table .onpri-assigned-image {
            width: 32px !important;
            height: 32px !important;
            object-fit: contain !important;
            border: 1px solid #dcdfe3 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }

          .onpri-customizer-full-page .onpri-admin-edit-button {
            min-height: 28px !important;
            padding: 0 12px !important;
            border: 1px solid #8c9196 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            white-space: nowrap !important;
            cursor: pointer !important;
          }

          .onpri-customizer-full-page .onpri-admin-edit-button:hover {
            background: #f6f6f7 !important;
          }


          /* ONPRI table header cleanup */
          .onpri-customizer-full-page .onpri-admin-section-header {
            grid-template-columns: 1fr !important;
          }

          .onpri-customizer-full-page .onpri-admin-table thead th {
            height: 36px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            vertical-align: middle !important;
            line-height: 36px !important;
          }

          .onpri-customizer-full-page .onpri-admin-table thead th:last-child {
            text-align: left !important;
          }


          /* ONPRI modal text alignment fix */
          .onpri-customizer-full-page .onpri-edit-modal,
          .onpri-customizer-full-page .onpri-edit-modal * {
            text-align: left;
          }

          .onpri-customizer-full-page .onpri-edit-modal-close {
            text-align: center;
          }

          .onpri-customizer-full-page .onpri-footer-actions {
            justify-content: flex-end;
          }

          .onpri-customizer-full-page .onpri-footer-actions button {
            text-align: center;
          }

          .onpri-customizer-full-page .onpri-status-badge {
            justify-content: center;
          }


          /* ONPRI top menu button style adjustment */
          .onpri-customizer-full-page .onpri-admin-menu {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin: 0 0 14px !important;
            padding: 0 !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu button {
            min-height: 26px !important;
            padding: 0 12px !important;
            border: 1px solid #c9cccf !important;
            border-radius: 999px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            line-height: 24px !important;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) !important;
            cursor: pointer !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu button:hover {
            background: #f6f6f7 !important;
          }

          .onpri-customizer-full-page .onpri-admin-menu button.is-active {
            border-color: #202223 !important;
            background: #202223 !important;
            color: #ffffff !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1px 0 rgba(0, 0, 0, 0.12) !important;
          }


          /* ONPRI actual top tab button style */
          .onpri-customizer-full-page .onpri-customizer-menu {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin: 0 0 14px !important;
            padding: 0 !important;
          }

          .onpri-customizer-full-page .onpri-customizer-menu button {
            min-height: 26px !important;
            padding: 0 12px !important;
            border: 1px solid #c9cccf !important;
            border-radius: 999px !important;
            background: #ffffff !important;
            color: #202223 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            line-height: 24px !important;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05) !important;
            cursor: pointer !important;
          }

          .onpri-customizer-full-page .onpri-customizer-menu button:hover {
            background: #f6f6f7 !important;
          }

          .onpri-customizer-full-page .onpri-customizer-menu button.is-active {
            border-color: #202223 !important;
            background: #202223 !important;
            color: #ffffff !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1px 0 rgba(0, 0, 0, 0.12) !important;
          }
\n        `}
      </style>
      <div className="onpri-customizer-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeSection === item.id ? "is-active" : ""}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeSection === "shopify-products" ? (
        <div className="onpri-admin-section">
          <div className="onpri-admin-section-header">
            <div>
              <h2 className="onpri-admin-section-title">Shopify商品設定</h2>
              <p className="onpri-admin-section-description">
                Shopify商品ごとに、商品詳細で使えるカスタマイズ項目を設定します。
              </p>
            </div>


          </div>

          {shopifyProducts.length === 0 ? (
            <div style={{ padding: "16px" }}>
              <p className="onpri-muted-text">Shopify商品が見つかりませんでした。</p>
            </div>
          ) : (
            <div className="onpri-admin-table-wrap">
              <table className="onpri-admin-table">
                <thead>
                  <tr>
                    <th>ブランド</th>
                    <th>商品名</th>
                    <th>商品画像</th>
                    <th>対応カスタマイズ</th>
                    <th>使用可能な画像</th>
                    <th>編集</th>
                  </tr>
                </thead>
                <tbody>
                  {shopifyProducts.map((product) => {
                    const fallbackCustomizerProductId = `product-${product.handle}`;
                    const customizerProductId =
                      product.customizerProductId || fallbackCustomizerProductId;
                    const assignedImageIds = getAssignedImageIds(customizerProductId);
                    const assignedImages = registeredImages.filter((image) =>
                      assignedImageIds.includes(image.id),
                    );
                    const customizationTypeLabel = getCustomizationTypes(customizerProductId);
                    const defaultCustomizationType =
                      getDefaultCustomizationType(customizerProductId);
                    const isEditing = editingProductId === product.id;

                    return (
                      <tr key={product.id}>
                        <td>{product.brandId || "未設定"}</td>
                        <td>{product.title}</td>
                        <td>
                          {product.featuredImageUrl ? (
                            <img
                              className="onpri-product-image"
                              src={product.featuredImageUrl}
                              alt={`${product.title} 商品画像`}
                            />
                          ) : (
                            "未設定"
                          )}
                        </td>
                        <td>{customizationTypeLabel}</td>
                        <td>
                          {assignedImages.length > 0 ? (
                            <div className="onpri-assigned-images">
                              {assignedImages.map((image) => (
                                <img
                                  key={`${product.id}-assigned-${image.id}`}
                                  className="onpri-assigned-image"
                                  src={image.imageUrl}
                                  alt={`${image.name} サムネイル`}
                                  title={image.name}
                                />
                              ))}
                            </div>
                          ) : (
                            "未設定"
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="onpri-admin-edit-button"
                            onClick={() =>
                              openProductImageEditor(
                                product.id,
                                assignedImageIds,
                                defaultCustomizationType,
                              )
                            }
                          >
                            編集
                          </button>

                          {isEditing ? (
                            <div
                              className="onpri-edit-modal-backdrop"
                              onClick={(event) => {
                                if (event.target === event.currentTarget) {
                                  closeProductImageEditor();
                                }
                              }}
                            >
                              <Form method="post" className="onpri-edit-modal">
                                <input
                                  type="hidden"
                                  name="intent"
                                  value="save-shopify-product-images"
                                />
                                <input type="hidden" name="productId" value={product.id} />
                                <input
                                  type="hidden"
                                  name="productTitle"
                                  value={product.title}
                                />
                                <input
                                  type="hidden"
                                  name="productHandle"
                                  value={product.handle}
                                />
                                <input
                                  type="hidden"
                                  name="productVendor"
                                  value={product.vendor}
                                />
                                <input
                                  type="hidden"
                                  name="productBrandId"
                                  value={product.brandId}
                                />
                                <input
                                  type="hidden"
                                  name="customizerProductId"
                                  value={customizerProductId}
                                />
                                <input
                                  type="hidden"
                                  name="customizationType"
                                  value={editingCustomizationType}
                                />

                                {editingCustomizationType === "registered_image"
                                  ? editingImageIds.map((imageId) => (
                                      <input
                                        key={`${product.id}-selected-${imageId}`}
                                        type="hidden"
                                        name="imageIds"
                                        value={imageId}
                                      />
                                    ))
                                  : null}

                                <div className="onpri-edit-modal-header">
                                  <div>
                                    <h3 className="onpri-modal-title">{product.title}</h3>
                                    <div className="onpri-modal-subtitle">
                                      <span>ブランド</span>
                                      <span className="onpri-brand-badge">
                                        {product.brandId || "未設定"}
                                      </span>
                                      <span>・</span>
                                      <span>商品ID {product.id.split("/").pop()}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="onpri-edit-modal-close"
                                    onClick={closeProductImageEditor}
                                    aria-label="閉じる"
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="onpri-modal-body">
                                  <section>
                                    <h4 className="onpri-modal-section-title">
                                      カスタマイズ種別
                                    </h4>

                                    <div className="onpri-segment">
                                      <button
                                        type="button"
                                        className={
                                          editingCustomizationType === "registered_image"
                                            ? "onpri-segment-button is-active"
                                            : "onpri-segment-button"
                                        }
                                        onClick={() => setEditingCustomizationType("registered_image")}
                                      >
                                        <span className="onpri-customization-card-title">
                                          イラスト印刷
                                        </span>
                                        <span className="onpri-customization-card-description">
                                          登録済みの画像から、この商品で使えるものを選びます
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        className={
                                          editingCustomizationType === "text"
                                            ? "onpri-segment-button is-active"
                                            : "onpri-segment-button"
                                        }
                                        onClick={() => setEditingCustomizationType("text")}
                                      >
                                        <span className="onpri-customization-card-title">
                                          名入れ
                                        </span>
                                        <span className="onpri-customization-card-description">
                                          文字・フォント・配置などを購入者が指定できます
                                        </span>
                                      </button>
                                    </div>
                                  </section>

                                  {editingCustomizationType === "registered_image" ? (
                                    <section>
                                      <div className="onpri-current-images">
                                        <div className="onpri-current-images-header">
                                          <h4 className="onpri-current-images-title">
                                            使用可能な画像
                                            <span className="onpri-count-badge">
                                              {editingImageIds.length} 件
                                            </span>
                                          </h4>
                                          <span className="onpri-upload-note">
                                            この商品で印刷できる画像
                                          </span>
                                        </div>

                                        {editingImageIds.length > 0 ? (
                                          <div className="onpri-current-image-list">
                                            {registeredImages
                                              .filter((image) =>
                                                editingImageIds.includes(image.id),
                                              )
                                              .map((image) => (
                                                <div
                                                  key={`${product.id}-current-${image.id}`}
                                                  className="onpri-current-image-row"
                                                >
                                                  <img
                                                    src={image.imageUrl}
                                                    alt={`${image.name} サムネイル`}
                                                  />

                                                  <div>
                                                    <div className="onpri-current-image-title">
                                                      {image.name}
                                                    </div>
                                                    <div className="onpri-current-image-meta">
                                                      {image.id}
                                                    </div>
                                                  </div>

                                                  <button
                                                    type="button"
                                                    className="onpri-danger-button"
                                                    onClick={() => toggleEditingImageId(image.id)}
                                                  >
                                                    解除
                                                  </button>
                                                </div>
                                              ))}
                                          </div>
                                        ) : (
                                          <p className="onpri-upload-note">
                                            まだ使用可能な画像は設定されていません。
                                          </p>
                                        )}
                                      </div>

                                      <div className="onpri-library-head">
                                        <h4 className="onpri-modal-section-title">
                                          画像ライブラリ
                                          <span className="onpri-count-badge">
                                            全 {registeredImages.length} 件
                                          </span>
                                        </h4>
                                        <span className="onpri-upload-note">
                                          チェックして使用可能に追加
                                        </span>
                                      </div>

                                      <div className="onpri-library-tools">
                                        <input
                                          className="onpri-library-search"
                                          type="search"
                                          value={librarySearchQuery}
                                          onChange={(event) =>
                                            setLibrarySearchQuery(event.currentTarget.value)
                                          }
                                          placeholder="画像名で検索"
                                        />

                                        <button
                                          type="button"
                                          className="onpri-bulk-button"
                                          onClick={() => {
                                            const visibleImageIds = registeredImages
                                              .filter((image) =>
                                                image.name
                                                  .toLowerCase()
                                                  .includes(librarySearchQuery.toLowerCase()),
                                              )
                                              .map((image) => image.id);

                                            setEditingImageIds((currentImageIds) =>
                                              Array.from(
                                                new Set([...currentImageIds, ...visibleImageIds]),
                                              ),
                                            );
                                          }}
                                        >
                                          表示中の画像を追加
                                        </button>
                                      </div>

                                      <div className="onpri-library-list">
                                        {registeredImages
                                          .filter((image) =>
                                            image.name
                                              .toLowerCase()
                                              .includes(librarySearchQuery.toLowerCase()),
                                          )
                                          .map((image) => {
                                            const isSelected = editingImageIds.includes(image.id);

                                            return (
                                              <label
                                                key={`${product.id}-library-${image.id}`}
                                                className={
                                                  isSelected
                                                    ? "onpri-library-row is-selected"
                                                    : "onpri-library-row"
                                                }
                                              >
                                                <input
                                                  type="checkbox"
                                                  className="onpri-library-checkbox"
                                                  checked={isSelected}
                                                  onChange={() => toggleEditingImageId(image.id)}
                                                />

                                                <img
                                                  className="onpri-library-thumb"
                                                  src={image.imageUrl}
                                                  alt={`${image.name} サムネイル`}
                                                />

                                                <div>
                                                  <div className="onpri-library-name">
                                                    {image.name}
                                                  </div>
                                                  <div className="onpri-library-meta">
                                                    {image.id}
                                                  </div>
                                                </div>

                                                <span
                                                  className={
                                                    isSelected
                                                      ? "onpri-status-badge is-selected"
                                                      : "onpri-status-badge is-empty"
                                                  }
                                                >
                                                  {isSelected ? "使用可能" : "未追加"}
                                                </span>
                                              </label>
                                            );
                                          })}
                                      </div>
                                    </section>
                                  ) : (
                                    <section className="onpri-name-placeholder">
                                      <h4 className="onpri-modal-section-title">
                                        名入れ設定
                                      </h4>
                                      <p>
                                        名入れ入力欄、文字数制限、フォント、カラー、配置は次工程で追加します。
                                      </p>
                                    </section>
                                  )}
                                </div>

                                <div className="onpri-edit-modal-footer">
                                  <span className="onpri-footer-note">
                                    {editingCustomizationType === "registered_image"
                                      ? `${editingImageIds.length} 件を使用可能に設定`
                                      : "名入れを使用"}
                                  </span>

                                  <div className="onpri-footer-actions">
                                    <button
                                      type="button"
                                      className="onpri-secondary-button"
                                      onClick={closeProductImageEditor}
                                    >
                                      キャンセル
                                    </button>
                                    <button
                                      type="submit"
                                      className="onpri-primary-button"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              </Form>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {activeSection === "create-image" ? (
        <s-section heading="登録済み画像を追加">
        {actionData?.message ? (
          <s-paragraph>{actionData.message}</s-paragraph>
        ) : null}

        <Form method="post" encType="multipart/form-data">
          <input type="hidden" name="intent" value="create-customizer-image" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label
              className="onpri-upload-box"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={handleImageFilesDrop}
            >
              <strong>画像ファイルをドラッグ＆ドロップ、または選択</strong>
              <input
                name="imageFiles"
                type="file"
                accept="image/*"
                multiple
                required
                onChange={(event) => updateSelectedImageFileNames(event.currentTarget.files)}
              />
              <span className="onpri-upload-note">
                複数画像をまとめて登録できます。名称はファイル名から自動登録されます。
              </span>
              {selectedImageFileNames.length > 0 ? (
                <span className="onpri-upload-note">
                  選択中：{selectedImageFileNames.join("、")}
                </span>
              ) : null}
            </label>

            <button type="submit">登録済み画像をアップロード</button>
          </div>
        </Form>
      </s-section>
      ) : null}

      {activeSection === "images" ? (
        <s-section heading="登録済み画像・入力項目">
        <div className="onpri-admin-table-wrap">
          <table className="onpri-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>種別</th>
                <th>画像URL</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => (
                <tr key={image.id}>
                  <td>{image.id}</td>
                  <td>{image.name}</td>
                  <td>{image.type}</td>
                  <td>{image.imageUrl || "未設定"}</td>
                  <td>{image.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </s-section>
      ) : null}

      {activeSection === "create-product" ? (
        <s-section heading="対象商品を追加">
        <Form method="post">
          <input type="hidden" name="intent" value="create-customizer-product" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label>
              <div>ID</div>
              <input name="id" defaultValue="product-02" placeholder="例: product-02" required />
            </label>

            <label>
              <div>ストア</div>
              <input name="shop" defaultValue="onpri-dev.myshopify.com" placeholder="例: onpri-dev.myshopify.com" required />
            </label>

            <label>
              <div>商品ID</div>
              <input name="productId" placeholder="未設定の場合は空欄でOK" />
            </label>

            <label>
              <div>商品名</div>
              <input name="productTitle" defaultValue="ブランドB カスタムTシャツ" placeholder="例: ブランドB カスタムTシャツ" required />
            </label>

            <label>
              <div>ブランドID</div>
              <input name="brandId" defaultValue="brandb" placeholder="例: brandb" required />
            </label>

            <label>
              <div>状態</div>
              <input name="status" defaultValue="検証対象" required />
            </label>

            <button type="submit">対象商品を保存</button>
          </div>
        </Form>
      </s-section>
      ) : null}

      {activeSection === "products" ? (
        <s-section heading="対象商品">
        <div className="onpri-admin-table-wrap">
          <table className="onpri-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ストア</th>
                <th>商品ID</th>
                <th>商品名</th>
                <th>ブランドID</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.shop}</td>
                  <td>{product.productId || "未設定"}</td>
                  <td>{product.productTitle}</td>
                  <td>{product.brandId}</td>
                  <td>{product.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </s-section>
      ) : null}

      {activeSection === "create-setting" ? (
        <s-section heading="商品別カスタマイズ設定を追加">
        <s-paragraph>
          同じ対象商品IDに対して、複数の画像・入力項目を追加できます。
        </s-paragraph>

        <Form method="post">
          <input type="hidden" name="intent" value="create-customizer-product-setting" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label>
              <div>ID</div>
              <input name="id" defaultValue="setting-product-01-logo-01" placeholder="例: setting-product-01-logo-01" required />
            </label>

            <label>
              <div>設定ID</div>
              <input name="productSettingId" defaultValue="product-01" placeholder="例: product-01" required />
            </label>

            <label>
              <div>対象商品</div>
              <select name="productId" required>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productTitle} / {product.brandId} / {product.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div>画像・入力項目</div>
              <select name="imageId" required>
                {images.map((image) => (
                  <option key={image.id} value={image.id}>
                    {image.name} / {image.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div>表示名</div>
              <input name="label" defaultValue="ONPRIロゴ" placeholder="例: ONPRIロゴ" required />
            </label>

            <label>
              <div>入力タイプ</div>
              <select name="inputType" defaultValue="registered_image" required>
                <option value="registered_image">registered_image</option>
                <option value="text">text</option>
              </select>
            </label>

            <label>
              <div>状態</div>
              <input name="status" defaultValue="検証用" required />
            </label>

            <button type="submit">商品別カスタマイズ設定を保存</button>
          </div>
        </Form>
      </s-section>
      ) : null}

      {activeSection === "settings" ? (
        <s-section heading="商品別カスタマイズ設定">
        <div className="onpri-admin-table-wrap">
          <table className="onpri-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>設定ID</th>
                <th>対象商品ID</th>
                <th>商品名</th>
                <th>ブランドID</th>
                <th>画像・入力項目ID</th>
                <th>画像・入力項目名</th>
                <th>サムネイル</th>
                <th>表示名</th>
                <th>入力タイプ</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => {
                const product = productById.get(setting.productId);
                const image = imageById.get(setting.imageId);

                return (
                  <tr key={setting.id}>
                    <td>{setting.id}</td>
                    <td>{setting.productSettingId}</td>
                    <td>{setting.productId}</td>
                    <td>{product?.productTitle || "未登録"}</td>
                    <td>{product?.brandId || "未登録"}</td>
                    <td>{setting.imageId}</td>
                    <td>{image?.name || "未登録"}</td>
                    <td>
                      {image?.imageUrl ? (
                        <img
                          src={image.imageUrl}
                          alt={`${image.name} サムネイル`}
                          style={{
                            width: "64px",
                            height: "64px",
                            objectFit: "contain",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            background: "#fff",
                          }}
                        />
                      ) : (
                        "未設定"
                      )}
                    </td>
                    <td>{setting.label}</td>
                    <td>{setting.inputType}</td>
                    <td>{setting.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </s-section>
      ) : null}


    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

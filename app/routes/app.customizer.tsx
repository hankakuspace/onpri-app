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
    const customizerProductId = String(formData.get("customizerProductId") ?? "");
    const imageIds = formData.getAll("imageIds").map((imageId) => String(imageId));

    const result = await saveCustomizerProductImageAssignments({
      shop: session.shop,
      productId,
      productTitle,
      productHandle,
      productVendor,
      customizerProductId,
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

  const menuItems = [
    { id: "shopify-products", label: "Shopify商品設定" },
    { id: "create-image", label: "登録済み画像を追加" },
    { id: "images", label: "登録済み画像・入力項目" },
    { id: "settings", label: "商品別カスタマイズ設定" },
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
    <s-page heading="ONPRI Customizer">
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
        `}
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
        <s-section heading="Shopify商品設定">
          <s-paragraph>
            Shopify商品ごとに、商品詳細で選択できる登録画像を設定します。
          </s-paragraph>

          {shopifyProducts.length === 0 ? (
            <s-paragraph>Shopify商品が見つかりませんでした。</s-paragraph>
          ) : (
            <div>
              {shopifyProducts.map((product) => {
                const fallbackCustomizerProductId = `product-${product.handle}`;
                const customizerProductId =
                  product.customizerProductId || fallbackCustomizerProductId;
                const assignedImageIds = getAssignedImageIds(customizerProductId);

                return (
                  <Form
                    key={product.id}
                    method="post"
                    className="onpri-product-card"
                  >
                    <input type="hidden" name="intent" value="save-shopify-product-images" />
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="productTitle" value={product.title} />
                    <input type="hidden" name="productHandle" value={product.handle} />
                    <input type="hidden" name="productVendor" value={product.vendor} />
                    <input
                      type="hidden"
                      name="customizerProductId"
                      value={customizerProductId}
                    />

                    <div className="onpri-product-card-header">
                      {product.featuredImageUrl ? (
                        <img
                          className="onpri-product-card-image"
                          src={product.featuredImageUrl}
                          alt={`${product.title} 商品画像`}
                        />
                      ) : (
                        <div className="onpri-product-card-image" />
                      )}

                      <div>
                        <strong>{product.title}</strong>
                        <div>商品設定ID：{customizerProductId}</div>
                      </div>
                    </div>

                    <div className="onpri-image-check-grid">
                      {registeredImages.map((image) => (
                        <label key={`${product.id}-${image.id}`} className="onpri-image-check">
                          <input
                            type="checkbox"
                            name="imageIds"
                            value={image.id}
                            defaultChecked={assignedImageIds.includes(image.id)}
                          />
                          <img src={image.imageUrl} alt={`${image.name} サムネイル`} />
                          <span>{image.name}</span>
                        </label>
                      ))}
                    </div>

                    <button type="submit">この商品に画像を保存</button>
                  </Form>
                );
              })}
            </div>
          )}
        </s-section>
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


    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

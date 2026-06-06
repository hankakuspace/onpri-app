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
} from "../lib/customizer.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const customizerData = await getCustomizerData();

  return customizerData;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

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
  const { images, products, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeSection, setActiveSection] = useState("create-image");

  const menuItems = [
    { id: "create-image", label: "登録済み画像を追加" },
    { id: "images", label: "登録済み画像・入力項目" },
    { id: "create-product", label: "対象商品を追加" },
    { id: "products", label: "対象商品" },
    { id: "create-setting", label: "商品別カスタマイズ設定を追加" },
    { id: "settings", label: "商品別カスタマイズ設定" },
  ];
  const productById = new Map(products.map((product) => [product.id, product]));
  const imageById = new Map(images.map((image) => [image.id, image]));

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

      {activeSection === "create-image" ? (
        <s-section heading="登録済み画像を追加">
        {actionData?.message ? (
          <s-paragraph>{actionData.message}</s-paragraph>
        ) : null}

        <Form method="post" encType="multipart/form-data">
          <input type="hidden" name="intent" value="create-customizer-image" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label className="onpri-upload-box">
              <strong>画像ファイルをドラッグ＆ドロップ、または選択</strong>
              <input name="imageFiles" type="file" accept="image/*" multiple required />
              <span className="onpri-upload-note">
                複数画像をまとめて登録できます。名称はファイル名から自動登録されます。
              </span>
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

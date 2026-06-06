// app/routes/app.customizer.tsx
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  createCustomizerImage,
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
    const result = await createCustomizerImage({
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      type: String(formData.get("type") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      message: "登録済み画像を保存しました。",
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
  const { images, products, settings, source } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

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
        `}
      </style>
      <s-section heading="検証方針">
        <s-paragraph>
          ONPRI独自カスタマイズ機能の管理画面です。登録済み画像、商品別設定、Canvasプレビュー、注文情報保存を段階的に実装します。
        </s-paragraph>
      </s-section>

      <s-section heading="データ取得状態">
        <s-paragraph>
          {source === "firestore"
            ? "Firestoreからデータを取得しています。"
            : "Firebase接続情報が未設定、またはFirestoreから取得できないため、fallbackデータを表示しています。"}
        </s-paragraph>
      </s-section>

      <s-section heading="登録済み画像を追加">
        {actionData?.message ? (
          <s-paragraph>{actionData.message}</s-paragraph>
        ) : null}

        <Form method="post">
          <input type="hidden" name="intent" value="create-customizer-image" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label>
              <div>ID</div>
              <input name="id" defaultValue="logo-02" placeholder="例: logo-02" required />
            </label>

            <label>
              <div>名称</div>
              <input name="name" defaultValue="ONPRIサンプルロゴ" placeholder="例: ONPRIサンプルロゴ" required />
            </label>

            <label>
              <div>種別</div>
              <input name="type" defaultValue="登録済み画像" placeholder="例: 登録済み画像" required />
            </label>

            <label>
              <div>画像URL</div>
              <input name="imageUrl" placeholder="未設定の場合は空欄でOK" />
            </label>

            <label>
              <div>状態</div>
              <input name="status" defaultValue="検証用" required />
            </label>

            <button type="submit">登録済み画像を保存</button>
          </div>
        </Form>
      </s-section>

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

      <s-section heading="商品別カスタマイズ設定を追加">
        <Form method="post">
          <input type="hidden" name="intent" value="create-customizer-product-setting" />

          <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }}>
            <label>
              <div>ID</div>
              <input name="id" defaultValue="setting-02" placeholder="例: setting-02" required />
            </label>

            <label>
              <div>設定ID</div>
              <input name="productSettingId" defaultValue="product-02" placeholder="例: product-02" required />
            </label>

            <label>
              <div>対象商品ID</div>
              <input name="productId" defaultValue="product-02" placeholder="例: product-02" required />
            </label>

            <label>
              <div>画像ID</div>
              <input name="imageId" defaultValue="logo-02" placeholder="例: logo-02" required />
            </label>

            <label>
              <div>表示名</div>
              <input name="label" defaultValue="ONPRIサンプルロゴ" placeholder="例: ONPRIサンプルロゴ" required />
            </label>

            <label>
              <div>入力タイプ</div>
              <input name="inputType" defaultValue="registered_image" placeholder="例: registered_image" required />
            </label>

            <label>
              <div>状態</div>
              <input name="status" defaultValue="検証用" required />
            </label>

            <button type="submit">商品別カスタマイズ設定を保存</button>
          </div>
        </Form>
      </s-section>

      <s-section heading="商品別カスタマイズ設定">
        <div className="onpri-admin-table-wrap">
          <table className="onpri-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>設定ID</th>
                <th>対象商品ID</th>
                <th>画像ID</th>
                <th>表示名</th>
                <th>入力タイプ</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td>{setting.id}</td>
                  <td>{setting.productSettingId}</td>
                  <td>{setting.productId}</td>
                  <td>{setting.imageId}</td>
                  <td>{setting.label}</td>
                  <td>{setting.inputType}</td>
                  <td>{setting.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </s-section>

      <s-section heading="次の実装予定">
        <ul>
          <s-list-item>登録済み画像の管理</s-list-item>
          <s-list-item>商品別カスタマイズ設定</s-list-item>
          <s-list-item>ストアフロント表示用UI</s-list-item>
          <s-list-item>Canvasプレビュー生成</s-list-item>
          <s-list-item>line item properties への保存</s-list-item>
        </ul>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

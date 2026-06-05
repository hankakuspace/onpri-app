// app/routes/app.customizer.tsx
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { createCustomizerImage, getCustomizerData } from "../lib/customizer.server";
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

  if (intent !== "create-customizer-image") {
    return {
      ok: false,
      message: "未対応の操作です。",
    };
  }

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
};

export default function CustomizerPage() {
  const { images, products, source } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading="ONPRI Customizer">
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
              <input name="id" placeholder="例: logo-02" required />
            </label>

            <label>
              <div>名称</div>
              <input name="name" placeholder="例: ONPRIサンプルロゴ" required />
            </label>

            <label>
              <div>種別</div>
              <input name="type" placeholder="例: 登録済み画像" required />
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
        <s-table>
          <s-table-header-row>
            <s-table-header>ID</s-table-header>
            <s-table-header>名称</s-table-header>
            <s-table-header>種別</s-table-header>
            <s-table-header>画像URL</s-table-header>
            <s-table-header>状態</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {images.map((image) => (
              <s-table-row key={image.id}>
                <s-table-cell>{image.id}</s-table-cell>
                <s-table-cell>{image.name}</s-table-cell>
                <s-table-cell>{image.type}</s-table-cell>
                <s-table-cell>{image.imageUrl || "未設定"}</s-table-cell>
                <s-table-cell>{image.status}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-section heading="対象商品">
        <s-table>
          <s-table-header-row>
            <s-table-header>ID</s-table-header>
            <s-table-header>ストア</s-table-header>
            <s-table-header>商品ID</s-table-header>
            <s-table-header>商品名</s-table-header>
            <s-table-header>ブランドID</s-table-header>
            <s-table-header>状態</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {products.map((product) => (
              <s-table-row key={product.id}>
                <s-table-cell>{product.id}</s-table-cell>
                <s-table-cell>{product.shop}</s-table-cell>
                <s-table-cell>{product.productId || "未設定"}</s-table-cell>
                <s-table-cell>{product.productTitle}</s-table-cell>
                <s-table-cell>{product.brandId}</s-table-cell>
                <s-table-cell>{product.status}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-section heading="次の実装予定">
        <s-list>
          <s-list-item>登録済み画像の管理</s-list-item>
          <s-list-item>商品別カスタマイズ設定</s-list-item>
          <s-list-item>ストアフロント表示用UI</s-list-item>
          <s-list-item>Canvasプレビュー生成</s-list-item>
          <s-list-item>line item properties への保存</s-list-item>
        </s-list>
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

// app/routes/app.customizer.tsx
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { getCustomizerData } from "../lib/customizer.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const customizerData = await getCustomizerData();

  return customizerData;
};

export default function CustomizerPage() {
  const { images, products, source } = useLoaderData<typeof loader>();

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

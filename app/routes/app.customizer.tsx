// app/routes/app.customizer.tsx
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

type CustomizerImage = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type CustomizerProduct = {
  id: string;
  name: string;
  brandId: string;
  status: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const images: CustomizerImage[] = [
    {
      id: "logo-01",
      name: "ONPRIロゴ",
      type: "登録済み画像",
      status: "検証用",
    },
    {
      id: "text-01",
      name: "名入れテキスト",
      type: "テキスト入力",
      status: "検証用",
    },
  ];

  const products: CustomizerProduct[] = [
    {
      id: "product-01",
      name: "ブランドA カスタムTシャツ",
      brandId: "branda",
      status: "検証対象",
    },
  ];

  return {
    images,
    products,
  };
};

export default function CustomizerPage() {
  const { images, products } = useLoaderData<typeof loader>();

  return (
    <s-page heading="ONPRI Customizer">
      <s-section heading="検証方針">
        <s-paragraph>
          ONPRI独自カスタマイズ機能の管理画面です。登録済み画像、商品別設定、Canvasプレビュー、注文情報保存を段階的に実装します。
        </s-paragraph>
      </s-section>

      <s-section heading="登録済み画像・入力項目">
        <s-table>
          <s-table-header-row>
            <s-table-header>ID</s-table-header>
            <s-table-header>名称</s-table-header>
            <s-table-header>種別</s-table-header>
            <s-table-header>状態</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {images.map((image) => (
              <s-table-row key={image.id}>
                <s-table-cell>{image.id}</s-table-cell>
                <s-table-cell>{image.name}</s-table-cell>
                <s-table-cell>{image.type}</s-table-cell>
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
            <s-table-header>商品名</s-table-header>
            <s-table-header>ブランドID</s-table-header>
            <s-table-header>状態</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {products.map((product) => (
              <s-table-row key={product.id}>
                <s-table-cell>{product.id}</s-table-cell>
                <s-table-cell>{product.name}</s-table-cell>
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

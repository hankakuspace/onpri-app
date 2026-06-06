// app/routes/app.orders-export.tsx
import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

type CustomAttribute = {
  key: string;
  value: string;
};

type LineItemNode = {
  name: string;
  sku: string | null;
  quantity: number;
  originalUnitPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  customAttributes: CustomAttribute[];
};

type OrderNode = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  lineItems: {
    edges: Array<{
      node: LineItemNode;
    }>;
  };
};

type OrdersGraphqlResponse = {
  data?: {
    orders: {
      edges: Array<{
        node: OrderNode;
      }>;
    };
  };
  errors?: Array<{
    message: string;
  }>;
};

type CsvRow = {
  orderName: string;
  orderId: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  lineItemName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  currencyCode: string;
  onpriProductSettingId: string;
  onpriProductName: string;
  onpriBrandId: string;
  onpriInternalBrandId: string;
  onpriSettingId: string;
  onpriImageId: string;
  onpriImageName: string;
  onpriImageUrl: string;
  onpriPositionX: string;
  onpriPositionY: string;
  onpriScale: string;
  onpriPreviewImageUrl: string;
};

const CSV_HEADERS: Array<keyof CsvRow> = [
  "orderName",
  "orderId",
  "createdAt",
  "financialStatus",
  "fulfillmentStatus",
  "lineItemName",
  "sku",
  "quantity",
  "unitPrice",
  "currencyCode",
  "onpriProductSettingId",
  "onpriProductName",
  "onpriBrandId",
  "onpriInternalBrandId",
  "onpriSettingId",
  "onpriImageId",
  "onpriImageName",
  "onpriImageUrl",
  "onpriPositionX",
  "onpriPositionY",
  "onpriScale",
  "onpriPreviewImageUrl",
];

const CSV_HEADER_LABELS: Record<keyof CsvRow, string> = {
  orderName: "注文番号",
  orderId: "注文ID",
  createdAt: "注文日時",
  financialStatus: "決済ステータス",
  fulfillmentStatus: "配送ステータス",
  lineItemName: "商品名",
  sku: "SKU",
  quantity: "数量",
  unitPrice: "単価",
  currencyCode: "通貨",
  onpriProductSettingId: "ONPRI商品設定ID",
  onpriProductName: "ONPRI商品名",
  onpriBrandId: "ONPRIブランドID",
  onpriInternalBrandId: "_onpri_brand_id",
  onpriSettingId: "ONPRI設定ID",
  onpriImageId: "ONPRI画像ID",
  onpriImageName: "ONPRI画像名",
  onpriImageUrl: "ONPRI画像URL",
  onpriPositionX: "ONPRI位置X",
  onpriPositionY: "ONPRI位置Y",
  onpriScale: "ONPRI拡大率",
  onpriPreviewImageUrl: "ONPRIプレビュー画像URL",
};

function getCustomAttribute(
  attributes: CustomAttribute[],
  key: string,
): string {
  return attributes.find((attribute) => attribute.key === key)?.value || "";
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function createCsv(rows: CsvRow[]): string {
  const headerRow = CSV_HEADERS.map((key) =>
    escapeCsvValue(CSV_HEADER_LABELS[key]),
  ).join(",");

  const dataRows = rows.map((row) =>
    CSV_HEADERS.map((key) => escapeCsvValue(row[key])).join(","),
  );

  return [headerRow, ...dataRows].join("\n");
}

function createRows(orders: OrderNode[]): CsvRow[] {
  return orders.flatMap((order) =>
    order.lineItems.edges.map(({ node: lineItem }) => {
      const unitPrice = lineItem.originalUnitPriceSet?.shopMoney.amount || "";
      const currencyCode =
        lineItem.originalUnitPriceSet?.shopMoney.currencyCode || "";

      return {
        orderName: order.name,
        orderId: order.id,
        createdAt: order.createdAt,
        financialStatus: order.displayFinancialStatus || "",
        fulfillmentStatus: order.displayFulfillmentStatus || "",
        lineItemName: lineItem.name,
        sku: lineItem.sku || "",
        quantity: lineItem.quantity,
        unitPrice,
        currencyCode,
        onpriProductSettingId: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI商品設定ID",
        ),
        onpriProductName: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI商品名",
        ),
        onpriBrandId: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRIブランドID",
        ),
        onpriInternalBrandId: getCustomAttribute(
          lineItem.customAttributes,
          "_onpri_brand_id",
        ),
        onpriSettingId: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI設定ID",
        ),
        onpriImageId: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI画像ID",
        ),
        onpriImageName: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI画像名",
        ),
        onpriImageUrl: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI画像URL",
        ),
        onpriPositionX: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI位置X",
        ),
        onpriPositionY: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI位置Y",
        ),
        onpriScale: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRI拡大率",
        ),
        onpriPreviewImageUrl: getCustomAttribute(
          lineItem.customAttributes,
          "ONPRIプレビュー画像URL",
        ),
      };
    }),
  );
}

async function getOrderRows(request: Request): Promise<CsvRow[]> {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query OnpriOrdersExport {
        orders(first: 50, reverse: true, sortKey: CREATED_AT) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              lineItems(first: 50) {
                edges {
                  node {
                    name
                    sku
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    customAttributes {
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
  );

  const responseJson = (await response.json()) as OrdersGraphqlResponse;

  if (responseJson.errors?.length) {
    throw new Error(responseJson.errors.map((error) => error.message).join(", "));
  }

  const orders = responseJson.data?.orders.edges.map(({ node }) => node) || [];

  return createRows(orders);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const rows = await getOrderRows(request);

  if (url.searchParams.get("download") === "1") {
    const csv = createCsv(rows);
    const fileName = `onpri-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const onpriRows = rows.filter(
    (row) =>
      row.onpriProductSettingId ||
      row.onpriBrandId ||
      row.onpriPreviewImageUrl,
  );

  return {
    rows,
    onpriRows,
  };
};

export default function OrdersExportPage() {
  const { rows, onpriRows } = useLoaderData<typeof loader>();

  return (
    <s-page heading="ONPRI 注文CSV出力">
      <s-section>
        <s-card>
          <s-stack gap="base">
            <s-heading>CSV出力</s-heading>
            <s-paragraph>
              Shopify注文のline item propertiesからONPRI項目を取得してCSV出力します。
            </s-paragraph>
            <s-paragraph>
              取得対象は直近50件の注文です。ONPRI項目が入っている明細のみ、下部に確認用として表示しています。
            </s-paragraph>
            <s-button href="/app/orders-export?download=1" variant="primary">
              CSVをダウンロード
            </s-button>
          </s-stack>
        </s-card>
      </s-section>

      <s-section>
        <s-card>
          <s-stack gap="base">
            <s-heading>取得状況</s-heading>
            <s-paragraph>取得した注文明細数：{rows.length}件</s-paragraph>
            <s-paragraph>ONPRI項目あり：{onpriRows.length}件</s-paragraph>
          </s-stack>
        </s-card>
      </s-section>

      <s-section>
        <s-card>
          <s-stack gap="base">
            <s-heading>ONPRI項目ありの注文明細</s-heading>
            {onpriRows.length === 0 ? (
              <s-paragraph>
                ONPRI項目が入っている注文明細は見つかりませんでした。
              </s-paragraph>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>注文番号</th>
                    <th>商品名</th>
                    <th>ONPRIブランドID</th>
                    <th>ONPRI画像名</th>
                    <th>ONPRIプレビュー画像URL</th>
                  </tr>
                </thead>
                <tbody>
                  {onpriRows.map((row, index) => (
                    <tr key={`${row.orderId}-${row.lineItemName}-${index}`}>
                      <td>{row.orderName}</td>
                      <td>{row.lineItemName}</td>
                      <td>{row.onpriBrandId}</td>
                      <td>{row.onpriImageName}</td>
                      <td>
                        {row.onpriPreviewImageUrl ? (
                          <Link
                            to={row.onpriPreviewImageUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            画像を開く
                          </Link>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </s-stack>
        </s-card>
      </s-section>
    </s-page>
  );
}

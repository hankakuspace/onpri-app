// app/lib/customizer.server.ts
import { randomUUID } from "node:crypto";
import type { Firestore, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { getFirebaseDb, getFirebaseStorageBucket } from "./firebase.server";

export type CustomizerImage = {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: string;
};

export type CustomizerProduct = {
  id: string;
  shop: string;
  productId: string;
  productTitle: string;
  brandId: string;
  status: string;
};

export type CustomizerProductSetting = {
  id: string;
  productSettingId: string;
  productId: string;
  imageId: string;
  label: string;
  inputType: string;
  status: string;
};

const fallbackImages: CustomizerImage[] = [
  {
    id: "logo-01",
    name: "ONPRIロゴ",
    type: "登録済み画像",
    imageUrl: "",
    status: "検証用",
  },
  {
    id: "text-01",
    name: "名入れテキスト",
    type: "テキスト入力",
    imageUrl: "",
    status: "検証用",
  },
];

const fallbackProducts: CustomizerProduct[] = [
  {
    id: "product-01",
    shop: "onpri-dev.myshopify.com",
    productId: "",
    productTitle: "ブランドA カスタムTシャツ",
    brandId: "branda",
    status: "検証対象",
  },
];

const fallbackSettings: CustomizerProductSetting[] = [
  {
    id: "setting-01",
    productSettingId: "product-01",
    productId: "product-01",
    imageId: "logo-01",
    label: "ONPRIロゴ",
    inputType: "registered_image",
    status: "検証用",
  },
];

export type CustomizerDataSource = "firestore" | "fallback";

export type CustomizerDataResult = {
  images: CustomizerImage[];
  products: CustomizerProduct[];
  settings: CustomizerProductSetting[];
  source: CustomizerDataSource;
};

export type CreateCustomizerImageInput = {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  status: string;
};

export type CreateCustomizerImageUploadInput = {
  file: File;
};

export type CreateCustomizerProductInput = {
  id: string;
  shop: string;
  productId: string;
  productTitle: string;
  brandId: string;
  status: string;
};

export type CreateCustomizerProductSettingInput = {
  id: string;
  productSettingId: string;
  productId: string;
  imageId: string;
  label: string;
  inputType: string;
  status: string;
};

export type SaveCustomizerProductImageAssignmentsInput = {
  shop: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  productVendor: string;
  productBrandId: string;
  customizerProductId: string;
  customizationType: string;
  imageIds: string[];
};

export type SaveCustomizerProductImageAssignmentsResult =
  | { ok: true; customizerProductId: string }
  | { ok: false; message: string };

function normalizeCustomizerId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSettingId(productId: string, imageId: string): string {
  return normalizeCustomizerId(`setting-${productId}-${imageId}`);
}


export type StorefrontCustomizerSetting = {
  id: string;
  imageId: string;
  label: string;
  inputType: string;
  status: string;
  image: CustomizerImage | null;
};

export type StorefrontCustomizerConfig = {
  product: CustomizerProduct | null;
  settings: StorefrontCustomizerSetting[];
  source: CustomizerDataSource;
};

// Only the authenticated session may supply this shop; never use a form value.
export function isValidCustomizerShop(shop: unknown): shop is string {
  return typeof shop === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(shop);
}

function isDocumentId(id: string): boolean {
  return !!id && id !== "." && id !== ".." && !id.includes("/") &&
    Buffer.byteLength(id, "utf8") <= 1500;
}

async function requireOwnedProduct(
  transaction: Transaction,
  db: Firestore,
  productId: string,
  shop: string,
) {
  if (!isDocumentId(productId)) throw new Error("Invalid parent product");
  const product = await transaction.get(db.collection("customizer_products").doc(productId));
  if (!product.exists || product.data()?.shop !== shop) {
    throw new Error("Product ownership could not be verified");
  }
  return product;
}

// Keep createdAt descending / document ID descending and the existing 50-row limit.
// Sorting after an equality query avoids requiring a new composite index.
function recentDocuments(docs: QueryDocumentSnapshot[]): QueryDocumentSnapshot[] {
  return docs.filter((doc) => doc.data().createdAt !== undefined).sort((a, b) => {
    const left = a.data().createdAt;
    const right = b.data().createdAt;
    const byId = Buffer.compare(Buffer.from(b.id), Buffer.from(a.id));
    if (left === null || right === null) {
      return left === right ? byId : left === null ? 1 : -1;
    }
    const seconds = (value: typeof left) => value instanceof Date
      ? Math.floor(value.getTime() / 1000) : Number(value.seconds ?? 0);
    const nanos = (value: typeof left) => value instanceof Date
      ? (value.getTime() % 1000) * 1000000 : Number(value.nanoseconds ?? 0);
    return seconds(right) - seconds(left) || nanos(right) - nanos(left) ||
      byId;
  }).slice(0, 50);
}

export async function getCustomizerImages(): Promise<CustomizerImage[]> {
  const db = getFirebaseDb();

  if (!db) {
    return fallbackImages;
  }

  try {
    const snapshot = await db
      .collection("customizer_images")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    if (snapshot.empty) {
      return fallbackImages;
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: String(data.name ?? ""),
        type: String(data.type ?? ""),
        imageUrl: String(data.imageUrl ?? ""),
        status: String(data.status ?? ""),
      };
    });
  } catch {
    console.error("Failed to fetch customizer_images from Firestore:");
    return fallbackImages;
  }
}

function mapCustomizerProducts(docs: QueryDocumentSnapshot[]): CustomizerProduct[] {
  return recentDocuments(docs).map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      shop: String(data.shop ?? ""),
      productId: String(data.productId ?? ""),
      productTitle: String(data.productTitle ?? ""),
      brandId: String(data.brandId ?? ""),
      status: String(data.status ?? ""),
    };
  });
}

export async function getCustomizerProducts(shop: string): Promise<CustomizerProduct[]> {
  if (!isValidCustomizerShop(shop)) throw new Error("Invalid authenticated shop");
  const db = getFirebaseDb();

  if (!db) {
    return fallbackProducts.filter((product) => product.shop === shop);
  }

  try {
    const snapshot = await db
      .collection("customizer_products")
      .where("shop", "==", shop)
      .get();

    if (snapshot.empty) {
      return fallbackProducts.filter((product) => product.shop === shop);
    }

    return mapCustomizerProducts(snapshot.docs);
  } catch {
    console.error("Failed to fetch customizer_products from Firestore:");
    return fallbackProducts.filter((product) => product.shop === shop);
  }
}


async function getCustomizerLists(shop: string): Promise<Pick<CustomizerDataResult, "products" | "settings">> {
  if (!isValidCustomizerShop(shop)) throw new Error("Invalid authenticated shop");
  const db = getFirebaseDb();
  let products = fallbackProducts.filter((product) => product.shop === shop);
  const fallback = fallbackSettings.filter((setting) =>
    fallbackProducts.some((product) => product.id === setting.productId && product.shop === shop));

  if (!db) {
    return { products, settings: fallback };
  }

  try {
    // Read parents and settings from one consistent snapshot, including parents
    // outside the product list's display limit. Images remain shared.
    const docs = await db.runTransaction(async (transaction) => {
      const parents = await transaction.get(db.collection("customizer_products").where("shop", "==", shop));
      if (!parents.empty) products = mapCustomizerProducts(parents.docs);
      const settings = await Promise.all(parents.docs.map((parent) =>
        transaction.get(db.collection("customizer_product_settings").where("productId", "==", parent.id))));
      return settings.flatMap((snapshot) => snapshot.docs);
    }, { readOnly: true });

    if (docs.length === 0) {
      return { products, settings: fallback };
    }

    const settings = recentDocuments(docs).map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        productSettingId: String(data.productSettingId ?? ""),
        productId: String(data.productId ?? ""),
        imageId: String(data.imageId ?? ""),
        label: String(data.label ?? ""),
        inputType: String(data.inputType ?? ""),
        status: String(data.status ?? ""),
      };
    });
    return { products, settings };
  } catch {
    console.error("Failed to fetch customizer_product_settings from Firestore:");
    return { products, settings: fallback };
  }
}

export async function getCustomizerSettings(shop: string): Promise<CustomizerProductSetting[]> {
  return (await getCustomizerLists(shop)).settings;
}

export async function getCustomizerData(shop: string): Promise<CustomizerDataResult> {
  if (!isValidCustomizerShop(shop)) throw new Error("Invalid authenticated shop");
  const db = getFirebaseDb();

  if (!db) {
    return {
      images: fallbackImages,
      products: fallbackProducts.filter((product) => product.shop === shop),
      settings: fallbackSettings.filter((setting) =>
        fallbackProducts.some((product) => product.id === setting.productId && product.shop === shop)),
      source: "fallback",
    };
  }

  const [images, { products, settings }] = await Promise.all([
    getCustomizerImages(),
    getCustomizerLists(shop),
  ]);

  return {
    images,
    products,
    settings,
    source: "firestore",
  };
}

export async function createCustomizerImageUpload(
  input: CreateCustomizerImageUploadInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getFirebaseDb();
  const bucket = getFirebaseStorageBucket();

  if (!db || !bucket) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const file = input.file;
  const originalFileName = file.name.trim();
  const fallbackName = originalFileName.replace(/\.[^/.]+$/, "");
  const name = fallbackName;

  if (!file || file.size === 0) {
    return {
      ok: false,
      message: "画像ファイルを選択してください。",
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message: "画像ファイルのみアップロードできます。",
    };
  }

  if (!name) {
    return {
      ok: false,
      message: "名称を入力してください。",
    };
  }

  try {
    const extension = originalFileName.includes(".")
      ? originalFileName.split(".").pop()
      : "png";
    const id = `image-${Date.now()}`;
    const token = randomUUID();
    const filePath = `customizer-images/${id}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storageFile = bucket.file(filePath);

    await storageFile.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const imageUrl =
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}` +
      `/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;

    await db.collection("customizer_images").doc(id).set({
      name,
      type: "登録済み画像",
      imageUrl,
      status: "有効",
      originalFileName,
      filePath,
      updatedAt: new Date(),
      createdAt: new Date(),
    });

    return { ok: true };
  } catch {
    console.error("Failed to upload customizer_image to Firebase Storage:");

    return {
      ok: false,
      message: "画像アップロードに失敗しました。",
    };
  }
}

export async function createCustomizerImage(
  input: CreateCustomizerImageInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const id = input.id.trim();
  const name = input.name.trim();
  const type = input.type.trim();
  const imageUrl = input.imageUrl.trim();
  const status = input.status.trim();

  if (!id || !name || !type || !status) {
    return {
      ok: false,
      message: "ID、名称、種別、状態は必須です。",
    };
  }

  try {
    await db.collection("customizer_images").doc(id).set(
      {
        name,
        type,
        imageUrl,
        status,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true },
    );

    return { ok: true };
  } catch {
    console.error("Failed to create customizer_image in Firestore:");

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function createCustomizerProduct(
  input: CreateCustomizerProductInput,
  authenticatedShop: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const id = input.id.trim();
  const shop = authenticatedShop;
  const productId = input.productId.trim();
  const productTitle = input.productTitle.trim();
  const brandId = input.brandId.trim();
  const status = input.status.trim();

  if (!isDocumentId(id) || !isValidCustomizerShop(shop) || input.shop !== shop || !productTitle || !brandId || !status) {
    return {
      ok: false,
      message: "ID、ストア、商品名、ブランドID、状態は必須です。",
    };
  }

  try {
    await db.runTransaction(async (transaction) => {
      const ref = db.collection("customizer_products").doc(id);
      const existing = await transaction.get(ref);
      if (existing.exists && existing.data()?.shop !== shop) {
        throw new Error("Product ownership could not be verified");
      }
      if (!existing.exists) {
        const settings = await transaction.get(db.collection("customizer_product_settings")
          .where("productId", "==", id));
        if (!settings.empty) throw new Error("Setting ownership could not be verified");
      }
      transaction.set(ref,
        {
          shop,
          productId,
          productTitle,
          brandId,
          status,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true },
      );
    });

    return { ok: true };
  } catch {
    console.error("Failed to create customizer_product in Firestore:");

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function createCustomizerProductSetting(
  input: CreateCustomizerProductSettingInput,
  shop: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const id = input.id.trim();
  const productSettingId = input.productSettingId.trim();
  const productId = input.productId.trim();
  const imageId = input.imageId.trim();
  const label = input.label.trim();
  const inputType = input.inputType.trim();
  const status = input.status.trim();

  if (!isDocumentId(id) || !isDocumentId(productId) || !isValidCustomizerShop(shop) || !productSettingId || !imageId || !label || !inputType || !status) {
    return {
      ok: false,
      message: "ID、設定ID、対象商品ID、画像ID、表示名、入力タイプ、状態は必須です。",
    };
  }

  try {
    await db.runTransaction(async (transaction) => {
      const ref = db.collection("customizer_product_settings").doc(id);
      const existing = await transaction.get(ref);
      await requireOwnedProduct(transaction, db, productId, shop);
      if (existing.exists) {
        await requireOwnedProduct(transaction, db, String(existing.data()?.productId ?? ""), shop);
      }
      transaction.set(ref,
        {
          productSettingId,
          productId,
          imageId,
          label,
          inputType,
          status,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true },
      );
    });

    return { ok: true };
  } catch {
    console.error("Failed to create customizer_product_setting in Firestore:");

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function saveCustomizerProductImageAssignments(
  input: SaveCustomizerProductImageAssignmentsInput,
  authenticatedShop: string,
): Promise<SaveCustomizerProductImageAssignmentsResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const shop = authenticatedShop;
  const shopifyProductId = input.productId.trim();
  const productTitle = input.productTitle.trim();
  const productHandle = input.productHandle.trim();
  const productVendor = input.productVendor.trim();
  const productBrandId = input.productBrandId.trim();
  const customizerProductId =
    normalizeCustomizerId(input.customizerProductId) ||
    normalizeCustomizerId(`product-${productHandle}`) ||
    normalizeCustomizerId(`product-${shopifyProductId.split("/").pop() ?? ""}`);
  const customizationType = input.customizationType.trim() || "registered_image";
  const imageIds = Array.from(new Set(input.imageIds.map((imageId) => imageId.trim()).filter(Boolean)));

  if (!isValidCustomizerShop(shop) || input.shop !== shop || !shopifyProductId || !productTitle || !isDocumentId(customizerProductId) || imageIds.some((id) => !isDocumentId(id))) {
    return {
      ok: false,
      message: "商品情報が不足しています。",
    };
  }

  try {
    await db.runTransaction(async (transaction) => {
      const productRef = db.collection("customizer_products").doc(customizerProductId);
      const existingProductDoc = await transaction.get(productRef);
      const existingProductData = existingProductDoc.data() ?? {};
      if (existingProductDoc.exists && existingProductData.shop !== shop) {
        throw new Error("Product ownership could not be verified");
      }

      const existingSettings = await transaction.get(db.collection("customizer_product_settings")
        .where("productId", "==", customizerProductId));
      // Orphan settings cannot be claimed by creating a new parent with the same ID.
      if (!existingProductDoc.exists && !existingSettings.empty) {
        throw new Error("Setting ownership could not be verified");
      }
      const assignments = customizationType === "text"
        ? [{ imageId: "text-01", label: "名入れ", inputType: "text" }]
        : await Promise.all(imageIds.map(async (imageId) => {
            const image = await transaction.get(db.collection("customizer_images").doc(imageId));
            return { imageId, label: String(image.data()?.name ?? imageId), inputType: "registered_image" };
          }));

      // Distinct image IDs can normalize to the same setting ID. Reject the
      // entire request before writes rather than letting the last assignment win.
      const plannedIds = new Set<string>();
      for (const assignment of assignments) {
        const settingId = createSettingId(customizerProductId, assignment.imageId);
        if (plannedIds.has(settingId)) throw new Error("Setting ID collision");
        plannedIds.add(settingId);
      }

      // Ownership alone is insufficient: an existing ID must describe exactly
      // this parent and image. Missing identifiers must never be inferred.
      for (const assignment of assignments) {
        const ref = db.collection("customizer_product_settings")
          .doc(createSettingId(customizerProductId, assignment.imageId));
        const existing = await transaction.get(ref);
        if (existing.exists) {
          const data = existing.data();
          if (data?.productId !== customizerProductId || data.imageId !== assignment.imageId) {
            throw new Error("Setting ID collision or unknown assignment");
          }
          await requireOwnedProduct(transaction, db, data.productId, shop);
        }
      }

      const brandId = productBrandId || String(existingProductData.brandId ?? "").trim() ||
        normalizeCustomizerId(productVendor) || normalizeCustomizerId(productHandle) || "default";
      transaction.set(productRef, {
        shop,
        productId: shopifyProductId,
        productTitle,
        productHandle,
        brandId,
        status: "有効",
        updatedAt: new Date(),
        createdAt: existingProductData.createdAt ?? new Date(),
      }, { merge: true });

      existingSettings.docs.forEach((doc) => {
        const inputType = String(doc.data().inputType ?? "");
        if (inputType === "registered_image" || inputType === "text") transaction.delete(doc.ref);
      });
      for (const assignment of assignments) {
        transaction.set(db.collection("customizer_product_settings")
          .doc(createSettingId(customizerProductId, assignment.imageId)), {
          productSettingId: customizerProductId,
          productId: customizerProductId,
          imageId: assignment.imageId,
          label: assignment.label,
          inputType: assignment.inputType,
          status: "有効",
          updatedAt: new Date(),
          createdAt: new Date(),
        }, { merge: true });
      }
    });

    return {
      ok: true,
      customizerProductId,
    };
  } catch {
    console.error("Failed to save customizer product image assignments:");

    return {
      ok: false,
      message: "商品への画像紐づけ保存に失敗しました。",
    };
  }
}

export async function getStorefrontCustomizerConfig(
  productId: string,
): Promise<StorefrontCustomizerConfig> {
  const targetProductId = productId.trim();

  if (!targetProductId) {
    return {
      product: null,
      settings: [],
      source: "fallback",
    };
  }

  const db = getFirebaseDb();

  if (!db) {
    const product =
      fallbackProducts.find(
        (item) => item.id === targetProductId || item.productId === targetProductId,
      ) ?? null;

    const settings = fallbackSettings
      .filter((setting) => setting.productId === targetProductId)
      .map((setting) => ({
        id: setting.id,
        imageId: setting.imageId,
        label: setting.label,
        inputType: setting.inputType,
        status: setting.status,
        image:
          fallbackImages.find((image) => image.id === setting.imageId) ?? null,
      }));

    return {
      product,
      settings,
      source: "fallback",
    };
  }

  try {
    const productDoc = await db
      .collection("customizer_products")
      .doc(targetProductId)
      .get();

    const product = productDoc.exists
      ? (() => {
          const data = productDoc.data() ?? {};

          return {
            id: productDoc.id,
            shop: String(data.shop ?? ""),
            productId: String(data.productId ?? ""),
            productTitle: String(data.productTitle ?? ""),
            brandId: String(data.brandId ?? ""),
            status: String(data.status ?? ""),
          };
        })()
      : null;

    const settingsSnapshot = await db
      .collection("customizer_product_settings")
      .where("productId", "==", targetProductId)
      .limit(50)
      .get();

    const settings = await Promise.all(
      settingsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const imageId = String(data.imageId ?? "");

        const imageDoc = imageId
          ? await db.collection("customizer_images").doc(imageId).get()
          : null;

        const image = imageDoc?.exists
          ? (() => {
              const imageData = imageDoc.data() ?? {};

              return {
                id: imageDoc.id,
                name: String(imageData.name ?? ""),
                type: String(imageData.type ?? ""),
                imageUrl: String(imageData.imageUrl ?? ""),
                status: String(imageData.status ?? ""),
              };
            })()
          : null;

        return {
          id: doc.id,
          imageId,
          label: String(data.label ?? ""),
          inputType: String(data.inputType ?? ""),
          status: String(data.status ?? ""),
          image,
        };
      }),
    );

    return {
      product,
      settings,
      source: "firestore",
    };
  } catch {
    console.error("Failed to fetch storefront customizer config:");

    return {
      product: null,
      settings: [],
      source: "fallback",
    };
  }
}

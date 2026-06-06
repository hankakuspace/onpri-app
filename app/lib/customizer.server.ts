// app/lib/customizer.server.ts
import { randomUUID } from "node:crypto";
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
  customizerProductId: string;
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
  } catch (error) {
    console.error("Failed to fetch customizer_images from Firestore:", error);
    return fallbackImages;
  }
}

export async function getCustomizerProducts(): Promise<CustomizerProduct[]> {
  const db = getFirebaseDb();

  if (!db) {
    return fallbackProducts;
  }

  try {
    const snapshot = await db
      .collection("customizer_products")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    if (snapshot.empty) {
      return fallbackProducts;
    }

    return snapshot.docs.map((doc) => {
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
  } catch (error) {
    console.error("Failed to fetch customizer_products from Firestore:", error);
    return fallbackProducts;
  }
}


export async function getCustomizerSettings(): Promise<CustomizerProductSetting[]> {
  const db = getFirebaseDb();

  if (!db) {
    return fallbackSettings;
  }

  try {
    const snapshot = await db
      .collection("customizer_product_settings")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    if (snapshot.empty) {
      return fallbackSettings;
    }

    return snapshot.docs.map((doc) => {
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
  } catch (error) {
    console.error("Failed to fetch customizer_product_settings from Firestore:", error);
    return fallbackSettings;
  }
}

export async function getCustomizerData(): Promise<CustomizerDataResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      images: fallbackImages,
      products: fallbackProducts,
      settings: fallbackSettings,
      source: "fallback",
    };
  }

  const [images, products, settings] = await Promise.all([
    getCustomizerImages(),
    getCustomizerProducts(),
    getCustomizerSettings(),
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
  } catch (error) {
    console.error("Failed to upload customizer_image to Firebase Storage:", error);

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
  } catch (error) {
    console.error("Failed to create customizer_image in Firestore:", error);

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function createCustomizerProduct(
  input: CreateCustomizerProductInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const id = input.id.trim();
  const shop = input.shop.trim();
  const productId = input.productId.trim();
  const productTitle = input.productTitle.trim();
  const brandId = input.brandId.trim();
  const status = input.status.trim();

  if (!id || !shop || !productTitle || !brandId || !status) {
    return {
      ok: false,
      message: "ID、ストア、商品名、ブランドID、状態は必須です。",
    };
  }

  try {
    await db.collection("customizer_products").doc(id).set(
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

    return { ok: true };
  } catch (error) {
    console.error("Failed to create customizer_product in Firestore:", error);

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function createCustomizerProductSetting(
  input: CreateCustomizerProductSettingInput,
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

  if (!id || !productSettingId || !productId || !imageId || !label || !inputType || !status) {
    return {
      ok: false,
      message: "ID、設定ID、対象商品ID、画像ID、表示名、入力タイプ、状態は必須です。",
    };
  }

  try {
    await db.collection("customizer_product_settings").doc(id).set(
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

    return { ok: true };
  } catch (error) {
    console.error("Failed to create customizer_product_setting in Firestore:", error);

    return {
      ok: false,
      message: "Firestoreへの登録に失敗しました。",
    };
  }
}

export async function saveCustomizerProductImageAssignments(
  input: SaveCustomizerProductImageAssignmentsInput,
): Promise<SaveCustomizerProductImageAssignmentsResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      ok: false,
      message: "Firebase接続情報が未設定のため、登録できません。",
    };
  }

  const shop = input.shop.trim();
  const shopifyProductId = input.productId.trim();
  const productTitle = input.productTitle.trim();
  const productHandle = input.productHandle.trim();
  const productVendor = input.productVendor.trim();
  const customizerProductId =
    normalizeCustomizerId(input.customizerProductId) ||
    normalizeCustomizerId(`product-${productHandle}`) ||
    normalizeCustomizerId(`product-${shopifyProductId.split("/").pop() ?? ""}`);
  const imageIds = Array.from(new Set(input.imageIds.map((imageId) => imageId.trim()).filter(Boolean)));

  if (!shop || !shopifyProductId || !productTitle || !customizerProductId) {
    return {
      ok: false,
      message: "商品情報が不足しています。",
    };
  }

  try {
    const existingProductDoc = await db
      .collection("customizer_products")
      .doc(customizerProductId)
      .get();

    const existingProductData = existingProductDoc.exists
      ? existingProductDoc.data() ?? {}
      : {};

    const brandId =
      String(existingProductData.brandId ?? "").trim() ||
      normalizeCustomizerId(productVendor) ||
      normalizeCustomizerId(productHandle) ||
      "default";

    await db.collection("customizer_products").doc(customizerProductId).set(
      {
        shop,
        productId: shopifyProductId,
        productTitle,
        productHandle,
        brandId,
        status: "有効",
        updatedAt: new Date(),
        createdAt: existingProductData.createdAt ?? new Date(),
      },
      { merge: true },
    );

    const existingSettingsSnapshot = await db
      .collection("customizer_product_settings")
      .where("productId", "==", customizerProductId)
      .where("inputType", "==", "registered_image")
      .get();

    const batch = db.batch();

    existingSettingsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    for (const imageId of imageIds) {
      const imageDoc = await db.collection("customizer_images").doc(imageId).get();
      const imageData = imageDoc.exists ? imageDoc.data() ?? {} : {};
      const label = String(imageData.name ?? imageId);
      const settingId = createSettingId(customizerProductId, imageId);

      batch.set(
        db.collection("customizer_product_settings").doc(settingId),
        {
          productSettingId: customizerProductId,
          productId: customizerProductId,
          imageId,
          label,
          inputType: "registered_image",
          status: "有効",
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true },
      );
    }

    await batch.commit();

    return {
      ok: true,
      customizerProductId,
    };
  } catch (error) {
    console.error("Failed to save customizer product image assignments:", error);

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
  } catch (error) {
    console.error("Failed to fetch storefront customizer config:", error);

    return {
      product: null,
      settings: [],
      source: "fallback",
    };
  }
}

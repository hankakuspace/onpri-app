// app/lib/customizer.server.ts
import { getFirebaseDb } from "./firebase.server";

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

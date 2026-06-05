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

export type CustomizerDataSource = "firestore" | "fallback";

export type CustomizerDataResult = {
  images: CustomizerImage[];
  products: CustomizerProduct[];
  source: CustomizerDataSource;
};

export type CreateCustomizerImageInput = {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
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

export async function getCustomizerData(): Promise<CustomizerDataResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      images: fallbackImages,
      products: fallbackProducts,
      source: "fallback",
    };
  }

  const [images, products] = await Promise.all([
    getCustomizerImages(),
    getCustomizerProducts(),
  ]);

  return {
    images,
    products,
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

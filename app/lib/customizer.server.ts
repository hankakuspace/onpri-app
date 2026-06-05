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

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

function parseNumberLoose(v) {
  // Acepta: "300,000.00" "300000" "$ 300.000,00" etc
  const raw = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!raw) return 0;

  // Si tiene coma y punto, asumimos coma miles y punto decimal (o viceversa)
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;

  if (hasComma && hasDot) {
    // Si el último separador es coma => decimal coma (AR: 1.234.567,89)
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      // decimal punto (US: 300,000.00)
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // puede ser decimal coma (AR: 1.234,56)
    normalized = raw.replace(",", ".");
  } else {
    // solo punto o nada: ok
    normalized = raw;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

const firebaseConfig = {
  apiKey: "AIzaSyDYkZ-g_v9ACg_s_ytSZJlEeihagVlW9zc",
  authDomain: "bdian-5de88.firebaseapp.com",
  projectId: "bdian-5de88",
  storageBucket: "bdian-5de88.firebasestorage.app",
  messagingSenderId: "534438943952",
  appId: "1:534438943952:web:a88ff9628a3175be5b12d5",
  measurementId: "G-TZKY77Q7DZ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const BUSINESS_ID = import.meta.env.VITE_FIREBASE_BUSINESS_ID || "";

function getField(doc, candidates) {
  for (const key of candidates) {
    if (doc[key] !== undefined && doc[key] !== null) {
      return doc[key];
    }
  }
  return "";
}

export async function fetchProductsFromFirebase() {
  if (!BUSINESS_ID) {
    throw new Error(
      "Falta VITE_FIREBASE_BUSINESS_ID en .env (ej: businesses/{businessId}/products)."
    );
  }

  const snapshot = await getDocs(collection(db, "businesses", BUSINESS_ID, "products"));

  return snapshot.docs
    .map((item, idx) => {
      const raw = item.data();
      const nombre = String(
        getField(raw, ["Producto", "producto", "nombre", "Nombre", "title", "titulo", "título"])
      ).trim();
      if (!nombre) return null;

      const stock = parseNumberLoose(getField(raw, ["Stock", "stock"]));
      const precio = parseNumberLoose(
        getField(raw, ["Precio Minorista", "precioMinorista", "precio", "Precio", "price"])
      );
      const categoria = String(
        getField(raw, ["Categoria", "categoría", "categoria", "Categoría", "category"]) || "Sin categoría"
      ).trim();
      const imagen = String(getField(raw, ["ImagenURL", "imagenURL", "imagen", "imageUrl"]) || "").trim();
      const descripcion = String(
        getField(raw, ["Descripcion", "descripción", "descripcion", "description"])
      ).trim();

      return {
        id: item.id || `${nombre}-${idx}`.replace(/\s+/g, "-").toLowerCase(),
        nombre,
        stock,
        precio,
        categoria,
        imagen,
        descripcion,
      };
    })
    .filter(Boolean);
}
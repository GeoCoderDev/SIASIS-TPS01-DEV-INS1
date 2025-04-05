// src/core/database/connectors/postgres.ts
import { Pool } from "pg";
import dotenv from "dotenv";
import {
  PG_CONNECTION_TIMEOUT,
  PG_IDLE_TIMEOUT,
  PG_MAX_CONNECTIONS,
} from "../../../constants/NEON_POSTGRES_CONFIG";

dotenv.config();

// Crear un pool de conexiones configurado para Neon (plan gratuito)
const pool = new Pool({
  connectionString: process.env.RDP02_INS1_DATABASE_URL,
  max: parseInt(PG_MAX_CONNECTIONS || "3", 10), // Muy conservador para el plan gratuito
  idleTimeoutMillis: parseInt(PG_IDLE_TIMEOUT || "10000", 10),
  connectionTimeoutMillis: parseInt(PG_CONNECTION_TIMEOUT || "5000", 10),
  // Parámetros específicos para mejorar rendimiento en Neon
  ssl: true,
});

// Cache simple para reducir consultas repetitivas
const queryCache = new Map();
const CACHE_TTL = 60000; // 1 minuto en milisegundos

// Función para ejecutar consultas con caché opcional
export async function query(
  text: string,
  params?: any[],
  useCache: boolean = false
) {
  try {
    // Intentar usar caché si está habilitado
    if (useCache) {
      const cacheKey = `${text}-${JSON.stringify(params || [])}`;
      const cachedItem = queryCache.get(cacheKey);

      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
        console.log("Cache hit:", cacheKey);
        return cachedItem.result;
      }
    }

    // Si no hay caché o está desactualizado, ejecutar la consulta
    const start = Date.now();
    const client = await pool.connect();

    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;

      console.log("Query ejecutada", {
        text: text.substring(0, 80) + (text.length > 80 ? "..." : ""),
        duration,
        filas: res.rowCount,
      });

      // Guardar en caché si está habilitado
      if (useCache) {
        const cacheKey = `${text}-${JSON.stringify(params || [])}`;
        queryCache.set(cacheKey, {
          timestamp: Date.now(),
          result: res,
        });
      }

      return res;
    } finally {
      // Siempre liberar el cliente al terminar
      client.release();
    }
  } catch (error) {
    console.error("Error en consulta SQL:", error);
    throw error;
  }
}

// Función para cerrar el pool (útil al finalizar el script)
export async function closePool() {
  await pool.end();
}

// Limpiar caché periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}, CACHE_TTL);

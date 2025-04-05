// src/core/database/queries/eventos/verificarDiaEvento.ts
import { query } from "../../connectors/postgres";

export async function verificarDiaEvento(fecha: Date): Promise<boolean> {
  const fechaStr = fecha.toISOString().split("T")[0]; // Formato YYYY-MM-DD

  const sql = `
    SELECT COUNT(*) as count
    FROM "T_Eventos"
    WHERE "Fecha_Inicio" <= $1 AND "Fecha_Conclusion" >= $1
  `;

  const result = await query(sql, [fechaStr]);

  return result.rows[0].count > 0;
}

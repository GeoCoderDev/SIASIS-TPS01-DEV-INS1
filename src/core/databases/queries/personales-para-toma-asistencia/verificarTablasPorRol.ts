import { query } from "../../connectors/postgres";

export async function verificarTablasPorRol(): Promise<Map<string, boolean>> {
  const tablasNecesarias = [
    "T_Control_Entrada_Mensual_Auxiliar",
    "T_Control_Salida_Mensual_Auxiliar",
    "T_Control_Entrada_Mensual_Profesores_Primaria",
    "T_Control_Salida_Mensual_Profesores_Primaria",
    "T_Control_Entrada_Mensual_Profesores_Secundaria",
    "T_Control_Salida_Mensual_Profesores_Secundaria",
    "T_Control_Entrada_Mensual_Personal_Administrativo",
    "T_Control_Salida_Mensual_Personal_Administrativo",
  ];

  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY($1)
  `;

  const result = await query(sql, [
    tablasNecesarias.map((t) => t.toLowerCase()),
  ]);

  const tablasExistentes = new Map<string, boolean>();

  // Inicializar todas como no existentes
  tablasNecesarias.forEach((tabla) => {
    tablasExistentes.set(tabla.toLowerCase(), false);
  });

  // Marcar las que existen
  result.rows.forEach((row: any) => {
    tablasExistentes.set(row.table_name, true);
  });

  return tablasExistentes;
}

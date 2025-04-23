import { query } from "../../connectors/postgres";

export async function verificarTablasPorRol(): Promise<Map<string, boolean>> {
  // Lista de todas las posibles tablas de control de asistencia
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

  // Verificar en información del esquema qué tablas existen
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;

  try {
    const result = await query(sql);

    // Inicializar map con todas las tablas como inexistentes
    const tablasExistentes = new Map<string, boolean>();
    tablasNecesarias.forEach((tabla) => {
      tablasExistentes.set(tabla, false);
    });

    // Convertir nombres de tablas a minúsculas para comparación
    const tablasNecesariasLower = tablasNecesarias.map((t) => t.toLowerCase());

    // Marcar las tablas que realmente existen
    result.rows.forEach((row: any) => {
      const tableNameLower = row.table_name.toLowerCase();

      // Buscar el índice en el array de nombres en minúsculas
      const index = tablasNecesariasLower.indexOf(tableNameLower);

      if (index >= 0) {
        // Usar el nombre original para mantener mayúsculas/minúsculas
        tablasExistentes.set(tablasNecesarias[index], true);
      }
    });

    // Hacer log de las tablas existentes para depuración
    const tablasEncontradas = Array.from(tablasExistentes.entries())
      .filter(([_, existe]) => existe)
      .map(([nombre]) => nombre);

    console.log(
      `Tablas de control de asistencia encontradas (${
        tablasEncontradas.length
      }): ${tablasEncontradas.join(", ") || "Ninguna"}`
    );

    return tablasExistentes;
  } catch (error) {
    console.error("Error al verificar tablas de control de asistencia:", error);
    // En caso de error, retornar todas como no existentes
    const tablasExistentes = new Map<string, boolean>();
    tablasNecesarias.forEach((tabla) => {
      tablasExistentes.set(tabla, false);
    });
    return tablasExistentes;
  }
}

import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import { query } from "../../connectors/postgres";

interface PersonalInactivo {
  dni: string;
  rol: RolesSistema;
  tablaMensualEntrada: string;
  tablaMensualSalida: string;
  campoId: string;
  campoDNI: string;
}

export async function obtenerPersonalInactivoParaRegistroAutomatico(): Promise<
  PersonalInactivo[]
> {
  // Crear una lista con todos los registros de personal inactivo
  const personalInactivo: PersonalInactivo[] = [];

  // Verificar qué tablas existen antes de ejecutar las consultas
  const tablasExistentes = await verificarTablasExistentes([
    "T_Auxiliares",
    "T_Profesores_Primaria",
    "T_Profesores_Secundaria",
    "T_Personal_Administrativo",
  ]);

  // 1. Auxiliares inactivos (si la tabla existe)
  if (tablasExistentes.includes("T_Auxiliares")) {
    try {
      const sqlAuxiliares = `
        SELECT "DNI_Auxiliar" as dni
        FROM "T_Auxiliares"
        WHERE "Estado" = false
      `;

      const auxiliaresInactivos = await query(sqlAuxiliares);
      auxiliaresInactivos.rows.forEach((row: any) => {
        personalInactivo.push({
          dni: row.dni,
          rol: RolesSistema.Auxiliar,
          tablaMensualEntrada: "t_Control_Entrada_Mensual_Auxiliar",
          tablaMensualSalida: "t_Control_Salida_Mensual_Auxiliar",
          campoId: "Id_C_E_M_P_Auxiliar",
          campoDNI: "DNI_Auxiliar",
        });
      });
    } catch (error) {
      console.warn("Error al obtener auxiliares inactivos:", error);
    }
  }

  // 2. Profesores de primaria inactivos (si la tabla existe)
  if (tablasExistentes.includes("T_Profesores_Primaria")) {
    try {
      const sqlProfesoresPrimaria = `
        SELECT "DNI_Profesor_Primaria" as dni
        FROM "T_Profesores_Primaria"
        WHERE "Estado" = false
      `;

      const profesoresPrimariaInactivos = await query(sqlProfesoresPrimaria);
      profesoresPrimariaInactivos.rows.forEach((row: any) => {
        personalInactivo.push({
          dni: row.dni,
          rol: RolesSistema.ProfesorPrimaria,
          tablaMensualEntrada: "t_Control_Entrada_Mensual_Profesores_Primaria",
          tablaMensualSalida: "t_Control_Salida_Mensual_Profesores_Primaria",
          campoId: "Id_C_E_M_P_Profesores_Primaria",
          campoDNI: "DNI_Profesor_Primaria",
        });
      });
    } catch (error) {
      console.warn("Error al obtener profesores de primaria inactivos:", error);
    }
  }

  // 3. Profesores de secundaria inactivos (si la tabla existe)
  if (tablasExistentes.includes("T_Profesores_Secundaria")) {
    try {
      const sqlProfesoresSecundaria = `
        SELECT "DNI_Profesor_Secundaria" as dni
        FROM "T_Profesores_Secundaria"
        WHERE "Estado" = false
      `;

      const profesoresSecundariaInactivos = await query(
        sqlProfesoresSecundaria
      );
      profesoresSecundariaInactivos.rows.forEach((row: any) => {
        personalInactivo.push({
          dni: row.dni,
          rol: RolesSistema.ProfesorSecundaria,
          tablaMensualEntrada:
            "t_Control_Entrada_Mensual_Profesores_Secundaria",
          tablaMensualSalida: "t_Control_Salida_Mensual_Profesores_Secundaria",
          campoId: "Id_C_E_M_P_Profesores_Secundaria",
          campoDNI: "DNI_Profesor_Secundaria",
        });
      });
    } catch (error) {
      console.warn(
        "Error al obtener profesores de secundaria inactivos:",
        error
      );
    }
  }

  // 4. Personal administrativo inactivo (si la tabla existe)
  if (tablasExistentes.includes("T_Personal_Administrativo")) {
    try {
      const sqlPersonalAdministrativo = `
        SELECT "DNI_Personal_Administrativo" as dni
        FROM "T_Personal_Administrativo"
        WHERE "Estado" = false
      `;

      const personalAdministrativoInactivo = await query(
        sqlPersonalAdministrativo
      );
      personalAdministrativoInactivo.rows.forEach((row: any) => {
        personalInactivo.push({
          dni: row.dni,
          rol: RolesSistema.PersonalAdministrativo,
          tablaMensualEntrada:
            "t_Control_Entrada_Mensual_Personal_Administrativo",
          tablaMensualSalida:
            "t_Control_Salida_Mensual_Personal_Administrativo",
          campoId: "Id_C_E_M_P_Administrativo",
          campoDNI: "DNI_Personal_Administrativo",
        });
      });
    } catch (error) {
      console.warn("Error al obtener personal administrativo inactivo:", error);
    }
  }

  return personalInactivo;
}

// Función para verificar qué tablas existen en la base de datos
async function verificarTablasExistentes(tablas: string[]): Promise<string[]> {
  const tablasExistentes: string[] = [];

  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY($1)
  `;

  try {
    const result = await query(sql, [tablas]);
    result.rows.forEach((row: any) => {
      tablasExistentes.push(row.table_name);
    });
  } catch (error) {
    console.warn("Error al verificar tablas existentes:", error);
  }

  return tablasExistentes;
}

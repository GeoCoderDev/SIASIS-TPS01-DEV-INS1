import { NOMBRE_ARCHIVO_CON_DATOS_ASISTENCIA_DIARIOS } from "../../../../../constants/NOMBRE_ARCHIVOS_SISTEMA";
import { query } from "../../../connectors/postgres";

/**
 * Busca el archivo de datos de asistencia en la base de datos
 * @returns Información del archivo si existe, null si no existe
 */
export async function buscarArchivoDatosAsistenciaDiariosEnBD() {
  const sql = `
    SELECT * FROM "T_Archivos_Respaldo_Google_Drive"
    WHERE "Nombre_Archivo" = $1
  `;

  const result = await query(sql, [
    NOMBRE_ARCHIVO_CON_DATOS_ASISTENCIA_DIARIOS,
  ]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  return null;
}

/**
 * Registra o actualiza la información del archivo en la base de datos
 * @param googleDriveId ID del archivo en Google Drive
 * @param archivoExistente Información del archivo existente (si existe)
 * @returns El resultado de la operación en la base de datos
 */
export async function registrarArchivoDatosAsistenciaDiariosEnBD(
  googleDriveId: string,
  archivoExistente: any = null
) {
  let sql;
  let params;

  const descripcion = `Archivo con datos de asistencia diaria. Actualizado el ${new Date().toLocaleString(
    "es-PE",
    { timeZone: "America/Lima" }
  )}`;

  if (archivoExistente) {
    // Actualizar registro existente
    sql = `
      UPDATE "T_Archivos_Respaldo_Google_Drive"
      SET "Google_Drive_Id" = $1, 
          "Descripcion" = $2,
          "Ultima_Modificacion" = CURRENT_TIMESTAMP
      WHERE "Id_Archivo_Respaldo" = $3
      RETURNING *
    `;
    params = [googleDriveId, descripcion, archivoExistente.Id_Archivo_Respaldo];
  } else {
    // Crear nuevo registro
    sql = `
      INSERT INTO "T_Archivos_Respaldo_Google_Drive" 
      ("Nombre_Archivo", "Google_Drive_Id", "Descripcion")
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    params = [
      NOMBRE_ARCHIVO_CON_DATOS_ASISTENCIA_DIARIOS,
      googleDriveId,
      descripcion,
    ];
  }

  const result = await query(sql, params);
  return result.rows[0];
}

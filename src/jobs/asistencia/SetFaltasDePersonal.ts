import { obtenerFechasActuales } from "../../core/utils/dates/obtenerFechasActuales";
import { closePool } from "../../core/databases/connectors/postgres";
import {
  obtenerPersonalActivoDesdeJSON,
  obtenerUltimoArchivoAsistencia,
} from "../../core/databases/queries/archivos-respaldo/obtenerDatosArchivoAsistenciaDiarios";
import { descargarArchivoDatosAsistenciaDesdeGoogleDrive } from "../../core/external/google/drive/descargarArchivoDatosAsistencia";
import { verificarYRegistrarAsistenciasIncompletas } from "../../core/databases/queries/personales-para-toma-asistencia/verificarYRegistrarAsistenciasIncompletas";
import { bloquearRoles } from "../../core/databases/queries/bloqueo-roles/bloquearRoles";
import { desbloquearRoles } from "../../core/databases/queries/bloqueo-roles/desbloquearRoles";
import { RolesSistema } from "../../interfaces/shared/RolesSistema";

async function main() {
  try {
    console.log("Iniciando verificación de asistencias incompletas...");

    // Bloquear todos los roles al inicio
    await bloquearRoles([
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
      RolesSistema.PersonalAdministrativo,
    ]);

    try {
      // Obtener fecha actual en Perú
      const { fechaLocalPeru } = obtenerFechasActuales();

      // 1. Obtener el ID del último archivo de asistencia
      const googleDriveId = await obtenerUltimoArchivoAsistencia();
      console.log(
        `ID del último archivo de asistencia encontrado: ${googleDriveId}`
      );

      // 2. Descargar el archivo de asistencia
      const datosAsistencia =
        await descargarArchivoDatosAsistenciaDesdeGoogleDrive(googleDriveId);
      console.log("Datos de asistencia descargados correctamente");

      // 3. Extraer lista de personal activo del archivo
      const personalActivo = await obtenerPersonalActivoDesdeJSON(
        datosAsistencia
      );
      console.log(`Personal activo encontrado: ${personalActivo.length}`);

      // 4. Verificar y registrar asistencias incompletas
      const resultado = await verificarYRegistrarAsistenciasIncompletas(
        personalActivo,
        fechaLocalPeru
      );

      // 5. Mostrar resultados
      console.log("=== Resultados de registro de asistencias incompletas ===");
      console.log(`Total personal activo procesado: ${personalActivo.length}`);
      console.log(
        `Registros de entrada creados: ${resultado.registrosEntradaCreados}`
      );
      console.log(
        `Registros de salida creados: ${resultado.registrosSalidaCreados}`
      );

      // Detallar personal sin registro de entrada
      console.log("\nPersonal sin registro de entrada:");
      resultado.personalSinRegistroEntrada.forEach((persona) => {
        console.log(
          `- ${persona.nombreCompleto} (${persona.dni}) - ${persona.rol}`
        );
      });

      // Detallar personal sin registro de salida
      console.log("\nPersonal sin registro de salida:");
      resultado.personalSinRegistroSalida.forEach((persona) => {
        console.log(
          `- ${persona.nombreCompleto} (${persona.dni}) - ${persona.rol}`
        );
      });

      console.log("\nProceso completado exitosamente.");
    } finally {
      // Desbloquear todos los roles sin importar lo que suceda
      await desbloquearRoles([
        RolesSistema.Directivo,
        RolesSistema.ProfesorPrimaria,
        RolesSistema.Auxiliar,
        RolesSistema.ProfesorSecundaria,
        RolesSistema.Tutor,
        RolesSistema.Responsable,
        RolesSistema.PersonalAdministrativo,
      ]);
    }
  } catch (error) {
    console.error(
      "Error en el proceso de verificación de asistencias incompletas:",
      error
    );
    process.exit(1);
  } finally {
    await closePool();
    console.log("Conexiones cerradas. Finalizando proceso...");
    process.exit(0);
  }
}

main();
main();

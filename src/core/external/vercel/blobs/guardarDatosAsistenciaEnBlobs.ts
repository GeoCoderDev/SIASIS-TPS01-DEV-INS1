// src/core/external/vercel/blobs/guardarDatosAsistenciaEnBlobs.ts
import { put } from "@vercel/blob";
import { DatosAsistenciaHoyIE20935 } from "../../../../interfaces/shared/Asistencia/DatosAsistenciaHoyIE20935";

export async function guardarDatosAsistenciaEnBlobs(
  datos: DatosAsistenciaHoyIE20935
) {
  const resultados = [];
  const errores = [];

  try {
    // Configuración para cada blob
    const blobConfigs = [
      {
        nombre: "INS1",
        tokenEnv: "VERCEL_BLOB_INS1_READ_WRITE_TOKEN",
      },
      // POR EL MOMENTO SOLO SE HABILITAN 1 BLOB, EL RESTO SE DEJARÁN COMENTADOS
      // ,
      // {
      //   nombre: "INS2",
      //   tokenEnv: "VERCEL_BLOB_INS2_READ_WRITE_TOKEN",
      // },
      // {
      //   nombre: "INS3",
      //   tokenEnv: "VERCEL_BLOB_INS3_READ_WRITE_TOKEN",
      // },
      // {
      //   nombre: "INS4",
      //   tokenEnv: "VERCEL_BLOB_INS4_READ_WRITE_TOKEN",
      // },
      // {
      //   nombre: "INS5",
      //   tokenEnv: "VERCEL_BLOB_INS5_READ_WRITE_TOKEN",
      // },
    ];

    // Contenido JSON que se guardará
    const contenidoJSON = JSON.stringify(datos);

    // Guardar en cada blob
    for (const config of blobConfigs) {
      try {
        // Verificar que existe el token de entorno
        const token = process.env[config.tokenEnv];
        if (!token) {
          console.warn(
            `Token no encontrado para ${config.nombre}: ${config.tokenEnv}`
          );
          errores.push({
            nombre: config.nombre,
            error: `Token no configurado (${config.tokenEnv})`,
          });
          continue;
        }

        // Guardar en el blob
        const blob = await put(
          "datos-asistencia-hoy-ie20935.json",
          contenidoJSON,
          {
            access: "public",
            addRandomSuffix: false,
            token: token,
          }
        );

        console.log(`Datos guardados en Blob ${config.nombre}: ${blob.url}`);
        resultados.push({ nombre: config.nombre, url: blob.url });
      } catch (error) {
        console.error(`Error al guardar en Blob ${config.nombre}:`, error);
        errores.push({
          nombre: config.nombre,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Mostrar resumen de operación
    console.log(`=== Resumen de guardado en blobs ===`);
    console.log(`- Éxitos: ${resultados.length}`);
    console.log(`- Errores: ${errores.length}`);

    // Si no se guardó en ninguno, lanzar error
    if (resultados.length === 0) {
      throw new Error(
        `No se pudo guardar los datos en ningún blob. Errores: ${JSON.stringify(
          errores
        )}`
      );
    }

    return {
      resultados,
      errores,
      totalExitosos: resultados.length,
      totalErrores: errores.length,
    };
  } catch (error) {
    console.error("Error al guardar datos en Vercel Blobs:", error);
    throw error;
  }
}

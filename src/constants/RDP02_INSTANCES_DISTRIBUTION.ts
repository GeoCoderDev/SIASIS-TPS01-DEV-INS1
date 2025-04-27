import { RDP02 } from "../interfaces/shared/RDP02Instancias";

export const DIRECTIVO_INSTANCES = [RDP02.INS1];
export const AUXILIAR_INSTANCES = [RDP02.INS1];
export const PERSONAL_ADMIN_INSTANCES = [RDP02.INS1];

export const PROFESOR_SECUNDARIA_INSTANCES = [RDP02.INS2];
export const TUTOR_INSTANCES = [RDP02.INS2];

export const PROFESOR_PRIMARIA_INSTANCES = [RDP02.INS3];

// Mapa que relaciona cada instancia con su URL de conexión
export const RDP02_INSTANCES_DATABASE_URL_MAP: Map<RDP02, string | undefined> =
  new Map([
    [RDP02.INS1, process.env.RDP02_INS1_DATABASE_URL],
    [RDP02.INS2, process.env.RDP02_INS2_DATABASE_URL],
    [RDP02.INS3, process.env.RDP02_INS3_DATABASE_URL],
    // Aquí se pueden agregar más instancias fácilmente en el futuro
  ]);

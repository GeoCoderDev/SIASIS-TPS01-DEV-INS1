import { ActoresSistema } from "./ActoresSistema";
import { ModoRegistro } from "./ModoRegistroPersonal";
import { RolesSistema } from "./RolesSistema";

export interface RegistrarAsistenciaIndividualRequestBody {
  DNI: string;
  Actor: ActoresSistema | RolesSistema;
  ModoRegistro: ModoRegistro;
  FechaHoraEsperada: string;
}

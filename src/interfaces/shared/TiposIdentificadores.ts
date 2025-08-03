export enum TiposIdentificadores {
    DNI=1,
    CE=2,

}



export const TiposIdentificadoresTextos: Record<TiposIdentificadores, string> = {
    [TiposIdentificadores.DNI]: "DNI",
    [TiposIdentificadores.CE]: "CE",
}
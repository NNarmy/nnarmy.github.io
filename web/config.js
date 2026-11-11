// Configuracion de la red. Cambiar al desplegar.
window.CONFIG = {
  contrato: "0x8c6ACA8E53BaA96627DFF40552B5f328dCA8F230",
  rpc: "https://mainnet.base.org",
  chainId: 8453,                  // 8453 = Base (real), 84532 = Base Sepolia (pruebas)
  patrocinador: "https://movimiento-patrocinador.onrender.com", // servidor que paga el gas de los nuevos (Render)
  comunidad: "0x5f3D0d7FE55A8557688a255DfB5E8717e3f6b251",                 // contrato de anuncios y votaciones (vacío = desactivado)
  bondad: "0xBFa670CAcE5217391cb8772AD2F181c5b2a1Aef6",                 // contador de bondad (vacío = desactivado)
  avisos: "movimiento-sn-670dc48abd", // tema de ntfy.sh donde llegan los avisos
  explorador: "https://basescan.org",
};

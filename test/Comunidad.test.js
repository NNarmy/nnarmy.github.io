const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Comunidad", () => {
  let m, c, guardian, ian, a, otro, relayer;
  async function voto(signer, votacion, numero, opcion) {
    const net = await ethers.provider.getNetwork();
    const domain = { name: "Movimiento Comunidad", version: "1", chainId: net.chainId, verifyingContract: await c.getAddress() };
    const types = { Voto: [{ name: "votacion", type: "uint256" }, { name: "numero", type: "uint256" }, { name: "opcion", type: "uint256" }] };
    return signer.signTypedData(domain, types, { votacion, numero, opcion });
  }
  beforeEach(async () => {
    [guardian, ian, a, otro, relayer] = await ethers.getSigners();
    m = await (await ethers.getContractFactory("Movimiento")).deploy(guardian.address, 1314, ethers.ZeroAddress);
    await m.registrarFundador(ian.address, 1313);
    await m.registrarFundador(a.address, 7);
    c = await (await ethers.getContractFactory("Comunidad")).deploy(await m.getAddress());
  });

  it("solo el guardian del registro publica anuncios, y lo sigue cuando cambia", async () => {
    await c.publicar("Hola a todos");
    expect(await c.totalAnuncios()).to.equal(1);
    const [texto, , oculto] = await c.anuncio(0);
    expect(texto).to.equal("Hola a todos"); expect(oculto).to.equal(false);
    await expect(c.connect(ian).publicar("falso")).to.be.revertedWithCustomError(c, "SoloGuardian");
    await c.ocultar(0, true); expect((await c.anuncio(0))[2]).to.equal(true);
    await m.transferOwnership(otro.address);
    await expect(c.publicar("ya no")).to.be.revertedWithCustomError(c, "SoloGuardian");
    await c.connect(otro).publicar("nuevo guardian");
    await expect(c.publicar("")).to.be.reverted;
  });

  it("cada numero vota una vez con su firma, el gas lo paga otro", async () => {
    const cierre = (await time.latest()) + 86400;
    await c.crearVotacion("¿Nos reunimos el sábado?", ["Sí", "No"], cierre);
    await c.connect(relayer).votar(0, 1313, 0, await voto(ian, 0, 1313, 0));
    await c.connect(relayer).votar(0, 7, 1, await voto(a, 0, 7, 1));
    const [, opciones, , votos] = await c.votacion(0);
    expect(opciones).to.deep.equal(["Sí", "No"]); expect(votos).to.deep.equal([1n, 1n]);
    await expect(c.votar(0, 1313, 1, await voto(ian, 0, 1313, 1))).to.be.revertedWithCustomError(c, "YaVoto");
    await expect(c.votar(0, 1313, 0, await voto(otro, 0, 1313, 0))).to.be.reverted; // ya voto (orden de checks)
    await expect(c.votar(0, 7, 5, await voto(a, 0, 7, 5))).to.be.revertedWithCustomError(c, "OpcionInvalida");
  });

  it("rechaza firmas ajenas, votaciones cerradas y opciones mal formadas", async () => {
    const cierre = (await time.latest()) + 3600;
    await c.crearVotacion("Pregunta", ["A", "B", "C"], cierre);
    await expect(c.votar(0, 1313, 0, await voto(otro, 0, 1313, 0))).to.be.revertedWithCustomError(c, "FirmaInvalida");
    await time.increase(3601);
    await expect(c.votar(0, 1313, 0, await voto(ian, 0, 1313, 0))).to.be.revertedWithCustomError(c, "VotacionCerrada");
    await expect(c.crearVotacion("P", ["solo una"], cierre + 9999)).to.be.revertedWithCustomError(c, "OpcionesInvalidas");
    await expect(c.crearVotacion("P", ["a", "b"], 1)).to.be.revertedWithCustomError(c, "CierreInvalido");
    await expect(c.connect(ian).crearVotacion("P", ["a", "b"], cierre + 9999)).to.be.revertedWithCustomError(c, "SoloGuardian");
  });
});

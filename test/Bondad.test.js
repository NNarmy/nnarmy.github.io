const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Bondad", () => {
  let m, b, ian, a, otro;
  async function firma(signer, numero, dia) {
    const net = await ethers.provider.getNetwork();
    return signer.signTypedData({ name: "Movimiento Bondad", version: "1", chainId: net.chainId, verifyingContract: await b.getAddress() },
      { Acto: [{ name: "numero", type: "uint256" }, { name: "dia", type: "uint256" }] }, { numero, dia });
  }
  beforeEach(async () => {
    const [g]= await ethers.getSigners(); [, ian, a, otro] = await ethers.getSigners();
    m = await (await ethers.getContractFactory("Movimiento")).deploy(g.address, 1314, ethers.ZeroAddress);
    await m.registrarFundador(ian.address, 1313); await m.registrarFundador(a.address, 7);
    b = await (await ethers.getContractFactory("Bondad")).deploy(await m.getAddress());
  });
  it("suma un acto por numero y por dia, con la firma del dueno", async () => {
    const hoy = await b.hoy();
    await b.connect(otro).marcar(1313, hoy, await firma(ian, 1313, hoy));
    await b.marcar(7, hoy, await firma(a, 7, hoy));
    expect(await b.total()).to.equal(2); expect(await b.delDia(hoy)).to.equal(2);
    expect(await b.yaMarco(1313, hoy)).to.equal(true);
    await expect(b.marcar(1313, hoy, await firma(ian, 1313, hoy))).to.be.revertedWithCustomError(b, "YaMarcoHoy");
    await time.increase(86400);
    const manana = await b.hoy();
    await b.marcar(1313, manana, await firma(ian, 1313, manana));
    expect(await b.total()).to.equal(3);
  });
  it("rechaza firmas ajenas y dias fuera de rango", async () => {
    const hoy = await b.hoy();
    await expect(b.marcar(1313, hoy, await firma(otro, 1313, hoy))).to.be.revertedWithCustomError(b, "FirmaInvalida");
    await expect(b.marcar(1313, hoy + 1n, await firma(ian, 1313, hoy + 1n))).to.be.revertedWithCustomError(b, "DiaInvalido");
    await expect(b.marcar(1313, hoy - 2n, await firma(ian, 1313, hoy - 2n))).to.be.revertedWithCustomError(b, "DiaInvalido");
    await b.marcar(1313, hoy - 1n, await firma(ian, 1313, hoy - 1n)); // ayer vale
    await b.marcar(1313, hoy, await firma(ian, 1313, hoy));           // y hoy tambien
    await expect(b.marcar(1313, hoy - 1n, await firma(ian, 1313, hoy - 1n))).to.be.revertedWithCustomError(b, "YaMarcoHoy");
  });
});

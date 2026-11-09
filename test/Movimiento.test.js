const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function firmar(c, signer, invitador, nonce, vence) {
  const net = await ethers.provider.getNetwork();
  const domain = { name: "Movimiento", version: "1", chainId: net.chainId, verifyingContract: await c.getAddress() };
  const types = { Invitacion: [{ name: "invitador", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "vence", type: "uint256" }] };
  const inv = { invitador, nonce, vence };
  return [inv, await signer.signTypedData(domain, types, inv)];
}

describe("Movimiento", () => {
  let c, guardian, ian, a, b, x, relayer, vence;
  beforeEach(async () => {
    [guardian, ian, a, b, x, relayer] = await ethers.getSigners();
    c = await (await ethers.getContractFactory("Movimiento")).deploy(guardian.address, 1314, ethers.ZeroAddress);
    await c.registrarFundador(ian.address, 1313);
    vence = (await time.latest()) + 86400;
  });

  it("registra fundadores con su numero", async () => {
    expect(await c.ownerOf(1313)).to.equal(ian.address);
    expect(await c.totalMiembros()).to.equal(1);
    expect(await c.locked(1313)).to.equal(true);
    await expect(c.registrarFundador(a.address, 1313)).to.be.revertedWithCustomError(c, "NumeroOcupado");
    await expect(c.connect(ian).registrarFundador(a.address, 7)).to.be.reverted;
  });

  it("un miembro invita y el nuevo recibe el siguiente numero, con gas pagado por otro", async () => {
    const [inv, sig] = await firmar(c, ian, 1313, 42, vence);
    await expect(c.connect(relayer).unirse(inv, sig, a.address)).to.emit(c, "Ingreso").withArgs(1314);
    expect(await c.ownerOf(1314)).to.equal(a.address);
    const [inv2, sig2] = await firmar(c, a, 1314, 1, vence);
    await c.unirse(inv2, sig2, b.address);
    expect(await c.ownerOf(1315)).to.equal(b.address);
    expect(await c.numeros(0, 10)).to.deep.equal([1313n, 1314n, 1315n]);
  });

  it("salta numeros que ya registro el guardian", async () => {
    await c.registrarFundador(x.address, 1314);
    const [inv, sig] = await firmar(c, ian, 1313, 1, vence);
    await c.unirse(inv, sig, a.address);
    expect(await c.ownerOf(1315)).to.equal(a.address);
  });

  it("rechaza invitaciones usadas, vencidas o de no miembros", async () => {
    const [inv, sig] = await firmar(c, ian, 1313, 1, vence);
    await c.unirse(inv, sig, a.address);
    await expect(c.unirse(inv, sig, b.address)).to.be.revertedWithCustomError(c, "InvitacionUsada");
    const [inv2, sig2] = await firmar(c, x, 1313, 2, vence); // x no es el 1313
    await expect(c.unirse(inv2, sig2, b.address)).to.be.revertedWithCustomError(c, "FirmaInvalida");
    const [inv3, sig3] = await firmar(c, ian, 1313, 3, (await time.latest()) - 1);
    await expect(c.unirse(inv3, sig3, b.address)).to.be.revertedWithCustomError(c, "InvitacionVencida");
  });

  it("una billetera solo puede tener un numero", async () => {
    const [inv, sig] = await firmar(c, ian, 1313, 1, vence);
    await expect(c.unirse(inv, sig, ian.address)).to.be.revertedWithCustomError(c, "YaEsMiembro");
  });

  it("el badge no se puede transferir ni aprobar", async () => {
    await expect(c.connect(ian).transferFrom(ian.address, a.address, 1313)).to.be.revertedWithCustomError(c, "Intransferible");
    await expect(c.connect(ian).approve(a.address, 1313)).to.be.revertedWithCustomError(c, "Intransferible");
    await expect(c.connect(ian).setApprovalForAll(a.address, true)).to.be.revertedWithCustomError(c, "Intransferible");
  });

  it("recuperar un numero tarda 48 horas y el dueno puede cancelarlo", async () => {
    await c.proponerRecuperacion(1313, b.address);
    await expect(c.ejecutarRecuperacion(1313)).to.be.revertedWithCustomError(c, "AunNo");
    await c.connect(ian).cancelarRecuperacion(1313);
    await time.increase(48 * 3600);
    await expect(c.ejecutarRecuperacion(1313)).to.be.revertedWithCustomError(c, "SinRecuperacion");
    await c.proponerRecuperacion(1313, b.address);
    await time.increase(48 * 3600);
    await c.connect(x).ejecutarRecuperacion(1313);
    expect(await c.ownerOf(1313)).to.equal(b.address);
    expect(await c.numeroDe(b.address)).to.equal(1313);
    expect(await c.numeroDe(ian.address)).to.equal(0);
    expect(await c.totalMiembros()).to.equal(1);
    await expect(c.connect(ian).proponerRecuperacion(1313, ian.address)).to.be.reverted;
    await expect(c.connect(x).cancelarRecuperacion(1313)).to.be.revertedWithCustomError(c, "NoAutorizado");
  });

  it("el freno de emergencia detiene las invitaciones", async () => {
    await c.pausar(true);
    const [inv, sig] = await firmar(c, ian, 1313, 1, vence);
    await expect(c.unirse(inv, sig, a.address)).to.be.revertedWithCustomError(c, "Pausado");
    await c.pausar(false);
    await c.unirse(inv, sig, a.address);
  });

  it("un miembro no puede invitar mas del limite diario", async () => {
    await c.cambiarLimiteDiario(2);
    const w = Array.from({ length: 3 }, () => ethers.Wallet.createRandom().address);
    for (let i = 0; i < 2; i++) { const [inv, sig] = await firmar(c, ian, 1313, i, vence); await c.unirse(inv, sig, w[i]); }
    const [inv, sig] = await firmar(c, ian, 1313, 9, vence);
    await expect(c.unirse(inv, sig, w[2])).to.be.revertedWithCustomError(c, "LimiteDiario");
    await time.increase(86400);
    const [inv2, sig2] = await firmar(c, ian, 1313, 10, vence + 86400);
    await c.unirse(inv2, sig2, w[2]);
  });

  it("un contrato de reemplazo importa a todos con sus mismos numeros", async () => {
    const [inv, sig] = await firmar(c, ian, 1313, 1, vence);
    await c.unirse(inv, sig, a.address);
    const nums = [...(await c.numeros(0, 100))];
    const cuentas = await Promise.all(nums.map((n) => c.ownerOf(n)));
    const nuevo = await (await ethers.getContractFactory("Movimiento")).deploy(guardian.address, 1315, await c.getAddress());
    await nuevo.importar(cuentas, nums);
    expect(await nuevo.ownerOf(1313)).to.equal(ian.address);
    expect(await nuevo.ownerOf(1314)).to.equal(a.address);
    expect(await nuevo.totalMiembros()).to.equal(2);
    expect(await nuevo.contratoAnterior()).to.equal(await c.getAddress());
  });

  it("genera la imagen del badge en la cadena", async () => {
    const uri = await c.tokenURI(1313);
    const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
    expect(json.name).to.equal("#1313");
  });
});

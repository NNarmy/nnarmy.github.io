// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title Registro del movimiento sin nombre
/// @notice Cada miembro es un numero. El badge no se puede vender ni transferir.
///         No se guarda ningun dato personal: solo numero -> direccion anonima.
contract Movimiento is ERC721, EIP712, Ownable {
    using Strings for uint256;

    /// ERC-5192 (soulbound minimo)
    event Locked(uint256 tokenId);

    /// Se emite cuando alguien recibe su numero. No incluye quien lo invito.
    event Ingreso(uint256 indexed numero);

    bytes32 private constant INVITE_TYPEHASH =
        keccak256("Invitacion(uint256 invitador,uint256 nonce,uint256 vence)");

    struct Invitacion {
        uint256 invitador; // numero del miembro que invita
        uint256 nonce;     // aleatorio, de un solo uso
        uint256 vence;     // timestamp de vencimiento
    }

    error Intransferible();
    error NumeroOcupado(uint256 numero);
    error YaEsMiembro(address cuenta);
    error InvitacionUsada();
    error InvitacionVencida();
    error FirmaInvalida();
    error NumeroInvalido();

    uint256 public siguienteNumero;     // proximo numero a probar para nuevos miembros
    uint256 private _total;
    uint256[] private _numeros;          // todos los numeros existentes, en orden de ingreso
    mapping(bytes32 => bool) public invitacionUsada;
    /// Numero de cada billetera (0 si no es miembro)
    mapping(address => uint256) public numeroDe;

    constructor(address guardian, uint256 primerNumero)
        ERC721("Movimiento sin nombre", "MSN")
        EIP712("Movimiento", "1")
        Ownable(guardian)
    {
        if (primerNumero == 0) revert NumeroInvalido();
        siguienteNumero = primerNumero;
    }

    // ---------- Ingreso por invitacion ----------

    /// @notice Reclama el siguiente numero libre con una invitacion firmada por un miembro.
    ///         Cualquiera puede enviar la transaccion (por ejemplo un patrocinador que paga el gas).
    function unirse(Invitacion calldata inv, bytes calldata firma, address nuevo) external returns (uint256 numero) {
        if (block.timestamp > inv.vence) revert InvitacionVencida();
        bytes32 digest = hashInvitacion(inv);
        if (invitacionUsada[digest]) revert InvitacionUsada();
        address firmante = ECDSA.recover(digest, firma);
        if (_ownerOf(inv.invitador) != firmante || firmante == address(0)) revert FirmaInvalida();
        invitacionUsada[digest] = true;

        numero = _siguienteLibre();
        _registrar(nuevo, numero);
        siguienteNumero = numero + 1;
    }

    function hashInvitacion(Invitacion calldata inv) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INVITE_TYPEHASH, inv.invitador, inv.nonce, inv.vence)));
    }

    // ---------- Guardian ----------

    /// @notice Registra a un miembro que ya tenia numero antes del registro (por ejemplo el 1313).
    function registrarFundador(address cuenta, uint256 numero) external onlyOwner {
        if (numero == 0) revert NumeroInvalido();
        _registrar(cuenta, numero);
    }

    /// @notice Si alguien pierde su billetera, el guardian mueve su numero a una nueva. Nunca duplica.
    function recuperar(uint256 numero, address nuevaCuenta) external onlyOwner {
        if (balanceOf(nuevaCuenta) != 0) revert YaEsMiembro(nuevaCuenta);
        _update(nuevaCuenta, numero, address(0)); // revierte si el numero no existe
    }

    // ---------- Lectura publica ----------

    function totalMiembros() external view returns (uint256) { return _total; }
    function existe(uint256 numero) public view returns (bool) { return _ownerOf(numero) != address(0); }
    function numeros(uint256 desde, uint256 cantidad) external view returns (uint256[] memory lista) {
        uint256 n = _numeros.length;
        if (desde >= n) return new uint256[](0);
        uint256 hasta = desde + cantidad > n ? n : desde + cantidad;
        lista = new uint256[](hasta - desde);
        for (uint256 i = desde; i < hasta; i++) lista[i - desde] = _numeros[i];
    }
    /// ERC-5192: todos los badges estan bloqueados.
    function locked(uint256 numero) external view returns (bool) { _requireOwned(numero); return true; }

    function tokenURI(uint256 numero) public view override returns (string memory) {
        _requireOwned(numero);
        string memory n = numero.toString();
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#0d0d12"/>',
            '<circle cx="200" cy="200" r="150" fill="none" stroke="#d9c58b" stroke-width="2"/>',
            '<text x="200" y="225" font-family="Georgia,serif" font-size="84" fill="#f2ead3" text-anchor="middle">', n, '</text>',
            '</svg>'
        );
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"#', n, '","description":"Miembro del movimiento sin nombre. Intransferible.",',
                '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
            )))
        );
    }

    function supportsInterface(bytes4 id) public view override returns (bool) {
        return id == 0xb45a3c0e || super.supportsInterface(id); // ERC-5192
    }

    // ---------- Internos ----------

    function _siguienteLibre() private view returns (uint256 n) {
        n = siguienteNumero;
        while (_ownerOf(n) != address(0)) n++;
    }

    function _registrar(address cuenta, uint256 numero) private {
        if (existe(numero)) revert NumeroOcupado(numero);
        if (balanceOf(cuenta) != 0) revert YaEsMiembro(cuenta);
        _mint(cuenta, numero);
        _numeros.push(numero);
        _total++;
        emit Locked(numero);
        emit Ingreso(numero);
    }

    /// Bloquea toda transferencia. Solo se permite crear (mint) o la recuperacion del guardian.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && !(auth == address(0) && msg.sender == owner())) {
            revert Intransferible();
        }
        if (from != address(0)) delete numeroDe[from];
        if (to != address(0)) numeroDe[to] = tokenId;
        return super._update(to, tokenId, auth);
    }

    // Aprobaciones no tienen sentido en un badge intransferible.
    function approve(address, uint256) public pure override { revert Intransferible(); }
    function setApprovalForAll(address, bool) public pure override { revert Intransferible(); }
}

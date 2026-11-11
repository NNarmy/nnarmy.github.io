// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IRegistro {
    function ownerOf(uint256 numero) external view returns (address);
}

/// @title Contador de bondad del Movimiento sin nombre
/// @notice Cada miembro puede marcar, una vez al día, que hizo un acto de bondad.
///         No se guarda qué hizo ni a quién: solo suma al contador del movimiento. Es de honor.
contract Bondad is EIP712 {
    IRegistro public immutable registro;

    uint256 public total;
    mapping(uint256 => uint256) public delDia;        // dia (dias desde 1970) => actos
    mapping(uint256 => uint256) public ultimoDia;      // numero => ultimo dia marcado (+1, 0 = nunca)

    bytes32 public constant ACTO_TYPEHASH = keccak256("Acto(uint256 numero,uint256 dia)");

    event Acto(uint256 indexed dia, uint256 total);

    error DiaInvalido();
    error YaMarcoHoy();
    error FirmaInvalida();

    constructor(address registro_) EIP712("Movimiento Bondad", "1") {
        registro = IRegistro(registro_);
    }

    function hoy() public view returns (uint256) { return block.timestamp / 1 days; }

    /// @notice Cualquiera puede enviarlo (el patrocinador paga el gas); cuenta la firma del dueño del número.
    ///         Se acepta el día de hoy o el de ayer, por las diferencias de hora entre países.
    function marcar(uint256 numero, uint256 dia, bytes calldata firma) external {
        uint256 h = hoy();
        if (dia != h && dia + 1 != h) revert DiaInvalido();
        if (ultimoDia[numero] >= dia + 1) revert YaMarcoHoy();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(ACTO_TYPEHASH, numero, dia)));
        address firmante = ECDSA.recover(digest, firma);
        if (firmante == address(0) || firmante != registro.ownerOf(numero)) revert FirmaInvalida();
        ultimoDia[numero] = dia + 1;
        delDia[dia] += 1;
        total += 1;
        emit Acto(dia, total);
    }

    function yaMarco(uint256 numero, uint256 dia) external view returns (bool) { return ultimoDia[numero] >= dia + 1; }
}

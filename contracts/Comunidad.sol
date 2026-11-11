// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IMovimiento {
    function owner() external view returns (address);
    function ownerOf(uint256 numero) external view returns (address);
}

/// @title Comunidad del Movimiento sin nombre
/// @notice Tablón de anuncios del guardián y votaciones de una sola voz por número.
///         El guardián es siempre el mismo que el del registro (si el registro cambia de guardián, aquí también).
///         Un voto queda asociado a un número, nunca a una persona.
contract Comunidad is EIP712 {
    IMovimiento public immutable movimiento;

    struct Anuncio { string texto; uint64 fecha; bool oculto; }
    struct Votacion { string pregunta; string[] opciones; uint64 cierre; uint256[] votos; }

    Anuncio[] private _anuncios;
    Votacion[] private _votaciones;
    mapping(uint256 => mapping(uint256 => bool)) public yaVoto; // votacion => numero => voto

    bytes32 public constant VOTO_TYPEHASH = keccak256("Voto(uint256 votacion,uint256 numero,uint256 opcion)");

    event Anunciado(uint256 indexed id);
    event VotacionCreada(uint256 indexed id, uint64 cierre);
    event Votado(uint256 indexed votacion, uint256 indexed numero);

    error SoloGuardian();
    error OpcionesInvalidas();
    error CierreInvalido();
    error VotacionCerrada();
    error OpcionInvalida();
    error YaVoto();
    error FirmaInvalida();
    error TextoInvalido();

    constructor(address registro) EIP712("Movimiento Comunidad", "1") {
        movimiento = IMovimiento(registro);
    }

    modifier soloGuardian() {
        if (msg.sender != movimiento.owner()) revert SoloGuardian();
        _;
    }

    // ---------- Anuncios ----------

    function publicar(string calldata texto) external soloGuardian returns (uint256 id) {
        if (bytes(texto).length == 0 || bytes(texto).length > 2000) revert TextoInvalido();
        id = _anuncios.length;
        _anuncios.push(Anuncio(texto, uint64(block.timestamp), false));
        emit Anunciado(id);
    }

    function ocultar(uint256 id, bool oculto) external soloGuardian {
        _anuncios[id].oculto = oculto;
    }

    function totalAnuncios() external view returns (uint256) { return _anuncios.length; }

    function anuncio(uint256 id) external view returns (string memory texto, uint64 fecha, bool oculto) {
        Anuncio storage a = _anuncios[id];
        return (a.texto, a.fecha, a.oculto);
    }

    // ---------- Votaciones ----------

    function crearVotacion(string calldata pregunta, string[] calldata opciones, uint64 cierre)
        external soloGuardian returns (uint256 id)
    {
        if (opciones.length < 2 || opciones.length > 8) revert OpcionesInvalidas();
        if (bytes(pregunta).length == 0 || bytes(pregunta).length > 500) revert TextoInvalido();
        if (cierre <= block.timestamp || cierre > block.timestamp + 365 days) revert CierreInvalido();
        id = _votaciones.length;
        Votacion storage v = _votaciones.push();
        v.pregunta = pregunta;
        v.cierre = cierre;
        for (uint256 i = 0; i < opciones.length; i++) {
            if (bytes(opciones[i]).length == 0 || bytes(opciones[i]).length > 120) revert TextoInvalido();
            v.opciones.push(opciones[i]);
            v.votos.push(0);
        }
        emit VotacionCreada(id, cierre);
    }

    /// @notice Cualquiera puede enviar el voto (por ejemplo el patrocinador que paga el gas);
    ///         lo que cuenta es la firma de la llave dueña del número.
    function votar(uint256 votacion, uint256 numero, uint256 opcion, bytes calldata firma) external {
        Votacion storage v = _votaciones[votacion];
        if (block.timestamp >= v.cierre) revert VotacionCerrada();
        if (opcion >= v.opciones.length) revert OpcionInvalida();
        if (yaVoto[votacion][numero]) revert YaVoto();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(VOTO_TYPEHASH, votacion, numero, opcion)));
        address firmante = ECDSA.recover(digest, firma);
        if (firmante == address(0) || firmante != movimiento.ownerOf(numero)) revert FirmaInvalida();
        yaVoto[votacion][numero] = true;
        v.votos[opcion] += 1;
        emit Votado(votacion, numero);
    }

    function totalVotaciones() external view returns (uint256) { return _votaciones.length; }

    function votacion(uint256 id)
        external view returns (string memory pregunta, string[] memory opciones, uint64 cierre, uint256[] memory votos)
    {
        Votacion storage v = _votaciones[id];
        return (v.pregunta, v.opciones, v.cierre, v.votos);
    }
}

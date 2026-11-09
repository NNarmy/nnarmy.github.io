# Movimiento sin nombre: registro en la cadena

Aquí no hay nombres, hay números. Cada miembro tiene un badge con su número que no se puede vender ni transferir.
No hay token, no hay venta y no hay dinero de por medio.

## Qué hay aquí

| Parte | Archivo | Qué hace |
|---|---|---|
| Contrato | `contracts/Movimiento.sol` | Registro de números (badge intransferible ERC-721 + ERC-5192) |
| Pruebas | `test/Movimiento.test.js` | 11 pruebas: invitar, unirse, no transferir, recuperar, pausar, migrar, etc. |
| Página | `web/` | Somos, Mi número, Invitar (QR), Mostrar mi badge (QR que cambia), Comprobación |
| Patrocinador | `relayer.js` | Pequeño servidor que paga el gas de los que se unen |
| Despliegue | `scripts/deploy.js` | Publica el contrato y registra al fundador |
| Respaldo | `scripts/exportar.js`, `scripts/migrar.js` | Copia del registro y contrato de reemplazo |

## Cómo funciona

1. **Invitar:** el miembro abre "Invitar" y su teléfono firma una invitación de un solo uso, válida 7 días, que aparece como QR. No le cuesta nada.
2. **Unirse:** la persona nueva escanea el QR con la cámara. La página crea una llave anónima en su teléfono y el patrocinador registra el siguiente número libre. No se piden datos personales.
3. **Verificar:** el miembro abre "Mostrar mi badge" y aparece un QR que cambia cada 20 segundos. Quien escanea ve "Verificado: esta persona es el #N", y una foto vieja no sirve.
4. **Somos:** cualquiera ve cuántos miembros hay y qué números existen.
5. **Guardián:** puede registrar números antiguos (fundadores) y mover un número a una llave nueva si alguien pierde el teléfono. Nunca puede duplicar un número.

## Protección

- **Recuperación con espera:** mover un número a otra llave tarda 48 horas, y el dueño actual o el guardián pueden cancelarlo. Nadie roba un número en silencio.
- **Freno de emergencia:** el guardián puede pausar las invitaciones (`pausar(true)`).
- **Límite diario:** cada miembro puede hacer entrar como máximo 5 personas por día (ajustable). Una llave robada no puede llenar el registro.
- **Patrocinador con poco saldo:** la llave que paga el gas solo debe tener lo justo.
- **Llaves:** la llave de despliegue vive solo en el secreto `PRIVATE_KEY` de GitHub y el guardián es la billetera principal de ian. La llave de pruebas antigua (`0x1fe5…c1f8`) quedó en el historial y está abandonada: nunca mandarle fondos.
- **Pendiente:** guardián en una billetera multifirma (por ejemplo 2 de 3).

## Reconstrucción

1. **Copia:** `CONTRATO=0x... npx hardhat run scripts/exportar.js --network baseSepolia` guarda número → llave en `respaldo/`.
2. **Contrato de reemplazo:** `COPIA=respaldo/registro-N.json GUARDIAN=0x... npx hardhat run scripts/migrar.js --network baseSepolia` publica un contrato nuevo con todos los miembros y sus mismos números. El nuevo guarda la dirección del anterior en `contratoAnterior`.
3. **Página:** no guarda nada importante. Se puede copiar a cualquier hosting y solo hay que cambiar `web/config.js`.

Los nuevos empiezan en el 1314. El 1313 se registra como fundador.

## Sobre el anonimato (para ser honestos)

- En la cadena solo queda número → dirección. Nada más.
- La transacción de ingreso contiene la firma del que invitó, así que alguien con conocimientos técnicos podría reconstruir quién invitó a quién. La página no lo muestra, pero ocultarlo del todo requeriría pruebas de conocimiento cero, que es mucho más complejo.
- La llave vive en el navegador del teléfono. Si se borran los datos del navegador sin haber guardado las 12 palabras, el guardián puede reasignar el número.

## Probar en tu computador

```bash
npm install --legacy-peer-deps
npx hardhat test
```

## Publicar (red de pruebas Base Sepolia primero)

1. Crea una billetera para el despliegue y consigue ETH de prueba en un faucet de Base Sepolia.
2. Despliega:
   ```bash
   PRIVATE_KEY=0x... GUARDIAN=0xTuDireccion FUNDADOR=0xDireccionDeTuTelefono \
     npx hardhat run scripts/deploy.js --network baseSepolia
   ```
   La dirección de tu teléfono la ves en "Mi número" → "Crear una llave".
3. Pon la dirección del contrato en `web/config.js`.
4. Corre el patrocinador (en Render, Railway o cualquier servidor con Node):
   ```bash
   PRIVATE_KEY=0x... CONTRATO=0x... RPC_URL=https://sepolia.base.org node relayer.js
   ```
   y pon su URL en `web/config.js` → `patrocinador`.
5. Publica la carpeta `web/` en cualquier hosting estático (GitHub Pages, Netlify, Cloudflare Pages). Tiene que ser https para que el QR abra bien en los teléfonos.

Para la red real se usa `--network base` y `chainId: 8453`. Cada ingreso cuesta una fracción de centavo.

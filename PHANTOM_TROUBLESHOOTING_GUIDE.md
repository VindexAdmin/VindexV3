# Guía de Resolución: Phantom Wallet No Se Conecta al Bridge

## Síntomas Comunes
- El bridge no detecta tu wallet de Phantom
- Error al intentar conectar Phantom
- La conexión falla sin mensaje claro
- Phantom está instalado pero no funciona

## Pasos de Diagnóstico

### 1. Verificar Instalación de Phantom
1. **Abre Chrome/Firefox** y ve a extensiones
2. **Busca "Phantom"** en la lista de extensiones
3. **Verifica que esté habilitada** y actualizada
4. **Reinicia el navegador** después de instalar/habilitar

### 2. Verificar Configuración de Red
1. **Abre Phantom Wallet**
2. **Ve a Configuración → Red**
3. **Asegúrate de estar en "Mainnet"** (no Devnet o Testnet)
4. **El bridge está configurado para Mainnet**

### 3. Verificar Permisos del Sitio
1. **Abre Phantom Wallet**
2. **Ve a Configuración → Sitios Conectados**
3. **Verifica si localhost:3005 aparece en la lista**
4. **Si aparece con permisos denegados, elimínalo y reconecta**

### 4. Debug Paso a Paso

#### En el Bridge (http://localhost:3005/bridge):
1. **Abre DevTools** (F12)
2. **Ve a la pestaña Console**
3. **Intenta conectar Phantom**
4. **Revisa los logs en la consola**

#### Logs Esperados (Conexión Exitosa):
```
Phantom detection debug: {...}
WalletConnector: Attempting Phantom connection...
=== PHANTOM WALLET DIAGNOSIS ===
1. Installation Check:
  - Phantom wallet detected: true
2. Wallet Status:
  - isConnected: true/false
  - publicKey: [dirección] o null
3. Available Methods:
  - connect: function
WalletConnector: Phantom connection successful
```

#### Logs de Error Común:
```
Phantom wallet not detected
Phantom wallet not found
Failed to connect to Phantom wallet
User rejected the request
```

### 5. Soluciones por Tipo de Error

#### Error: "Phantom wallet not found"
**Solución:**
1. Instala Phantom desde https://phantom.app/
2. Reinicia el navegador
3. Verifica que la extensión esté habilitada

#### Error: "User rejected the request"
**Solución:**
1. Intenta conectar de nuevo
2. **Acepta** la solicitud de conexión en Phantom
3. Asegúrate de desbloquear Phantom primero

#### Error: "Failed to connect"
**Solución:**
1. Desconecta cualquier otra wallet (MetaMask, etc.)
2. Recarga la página del bridge
3. Verifica la configuración de red en Phantom

#### Error: "Network mismatch"
**Solución:**
1. Cambia Phantom a **Mainnet**
2. Recarga el bridge
3. Intenta conectar de nuevo

### 6. Script de Debug Manual

Ejecuta esto en la consola del navegador:
```javascript
// Verificar Phantom
console.log('Phantom available:', !!window.phantom);
console.log('Phantom Solana:', !!window.phantom?.solana);
console.log('Is Phantom:', window.phantom?.solana?.isPhantom);

// Intentar conexión manual
if (window.phantom?.solana) {
  window.phantom.solana.connect()
    .then(result => console.log('Manual connection success:', result))
    .catch(error => console.log('Manual connection failed:', error));
}
```

### 7. Configuración Recomendada de Phantom

#### Red:
- **Mainnet** (no Devnet/Testnet)

#### Configuración de Seguridad:
- **Auto-approve**: Deshabilitado (más seguro)
- **Mostrar balances**: Habilitado
- **Notificaciones**: Habilitado

#### Sitios de Confianza:
- Agrega `localhost:3005` a sitios de confianza

### 8. Alternativas Si Phantom No Funciona

1. **Usa diferentes navegador** (Chrome, Firefox, Edge)
2. **Desinstala y reinstala** Phantom
3. **Verifica otras wallets** instaladas que puedan interferir
4. **Intenta en modo incógnito** para eliminar conflictos

### 9. Información Técnica

#### Configuración del Bridge:
- **Red Solana**: Mainnet (`https://api.mainnet-beta.solana.com`)
- **Protocolo**: Solana Web3.js
- **API**: Phantom Wallet Provider

#### Métodos de Detección:
1. `window.phantom.solana` (preferido)
2. `window.solana` (fallback)
3. Verificación de `isPhantom: true`

### 10. Contacto de Soporte

Si ninguna solución funciona:
1. **Copia los logs de la consola**
2. **Incluye tu configuración de Phantom**
3. **Menciona tu navegador y versión**
4. **Reporta el problema con detalles específicos**

El debugging está habilitado, así que revisa la consola del navegador para información detallada sobre lo que está pasando durante la conexión.

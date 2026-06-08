# Sistema de Múltiples Cajas - Implementación

## ✅ Cambios Completados

### 1. Base de Datos Actualizada
- ✓ Agregada columna `nombre_caja` VARCHAR(100) a tabla `caja`
- ✓ Agregada columna `tipo_caja` ENUM('libreria', 'personal') a tabla `caja`
- ✓ Tabla `gastos` ya existe y funciona correctamente

### 2. Modelos Actualizados

#### CajaModel.php
- ✓ `mdlMostrarCajaActiva()` ahora acepta parámetro `$tipoCaja` opcional
- ✓ Nuevo método `mdlMostrarTodasCajasActivas()` para listar todas las cajas abiertas
- ✓ `mdlAbrirCaja()` ahora guarda `nombre_caja` y `tipo_caja`

#### CajaController.php
- ✓ `ctrObtenerCajaActiva()` acepta parámetro `$tipoCaja` opcional
- ✓ Nuevo método `ctrObtenerTodasCajasActivas()`
- ✓ `ctrAbrirCaja()` ahora maneja el tipo de caja y nombre automáticamente

## 📋 Cambios Pendientes

### 3. Vista de Caja (views/modules/caja.php)
- ✓ Mostrar selector de tipo de caja al abrir
- ✓ Mostrar ambas cajas si están abiertas simultáneamente
- ✓ Permitir gestionar cada caja independientemente en ventana separada

### 4. Vista de POS (views/modules/pos.php)
- ✓ Selector de caja automático basado en tipo de producto
- ✓ Validar que la caja seleccionada esté abierta
- ✓ Guardar `id_caja` correcto en cada venta

### 5. Vista de Reportes (views/modules/reportes.php)
Necesita actualizarse para:
- [ ] Agregar filtro por tipo de caja
- [ ] Mostrar ventas de Caja Librería
- [ ] Mostrar ventas de Caja Personal
- [ ] Mostrar ventas totales (ambas cajas)

## 🔧 Instrucciones de Uso

### Abrir Cajas
1. Ir a módulo "Caja"
2. Seleccionar tipo: "Caja Librería" o "Caja Personal"
3. Ingresar monto inicial
4. Click en "Abrir Caja"

### Realizar Ventas
1. En POS, seleccionar la caja activa
2. Agregar productos al carrito
3. Procesar venta normalmente
4. La venta se registrará en la caja seleccionada

### Ver Reportes
1. Ir a módulo "Reportes"
2. Seleccionar filtro de caja:
   - "Todas" (por defecto)
   - "Caja Librería"
   - "Caja Personal"
3. Ver estadísticas filtradas

### Cerrar Cajas
1. Cada caja se cierra independientemente
2. El cierre muestra:
   - Monto inicial
   - Total vendido
   - Gastos
   - Dinero final esperado

## 📊 Estructura de Datos

### Tabla: caja
```sql
- id (INT)
- fecha_apertura (DATE)
- hora_apertura (TIME)
- monto_inicial (DECIMAL)
- nombre_caja (VARCHAR) -- "Caja Librería" o "Caja Personal"
- tipo_caja (ENUM) -- 'libreria' o 'personal'
- estado (VARCHAR) -- 'Abierta' o 'Cerrada'
- total_efectivo (DECIMAL)
- total_yape (DECIMAL)
- total_transferencia (DECIMAL)
- total_tarjeta (DECIMAL)
- total_gastos (DECIMAL)
- diferencia (DECIMAL)
```

### Tabla: ventas
```sql
- id (INT)
- id_caja (INT) -- Referencia a la caja donde se realizó la venta
- id_cliente (INT)
- id_vendedor (INT)
- fecha (DATETIME)
- total (DECIMAL)
- metodo_pago (VARCHAR)
- estado (VARCHAR)
```

## 🎯 Próximos Pasos

1. **Actualizar vista de Caja** para mostrar selector de tipo
2. **Actualizar POS** para seleccionar caja antes de vender
3. **Actualizar Reportes** para filtrar por caja
4. **Probar flujo completo**:
   - Abrir ambas cajas
   - Realizar ventas en cada una
   - Ver reportes separados
   - Cerrar ambas cajas

## 💡 Notas Importantes

- Las dos cajas pueden estar abiertas simultáneamente
- Cada venta se asocia a UNA caja específica
- Los reportes pueden mostrar datos de una caja o ambas
- El cierre de caja es independiente para cada una
- Los gastos se registran por caja


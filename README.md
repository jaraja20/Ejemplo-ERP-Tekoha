# Ñandutí ERP · Demostración

Sistema ERP de ejemplo (distribuidora ficticia) con datos precargados. Se ejecuta por completo en el navegador, sin servidor ni base de datos.

**Modo demostración:** se puede probar todo, pero **nada se guarda**. Al recargar la página vuelve al estado original, y cada visitante trabaja con su propia copia, así que nadie modifica lo que ve otra persona.

## Usuarios de prueba
| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@nanduti.com.py | admin123 |
| Ventas | ventas@nanduti.com.py | ventas123 |
| Contabilidad | contabilidad@nanduti.com.py | conta123 |
| Compras | compras@nanduti.com.py | compras123 |
| Depósito | deposito@nanduti.com.py | deposito123 |
| RRHH | rrhh@nanduti.com.py | rrhh123 |

## Desarrollo
```bash
npm install
npm run dev        # http://localhost:5180
npm run build
```

Para trabajar guardando los cambios en el navegador: `VITE_PERSISTIR=true npm run dev`.

## Vercel
Framework: Vite. Build: `npm run build`. Salida: `dist`. El archivo `vercel.json` ya redirige las rutas internas a la app.

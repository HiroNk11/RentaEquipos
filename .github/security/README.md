# Controles de secretos

El workflow usa Gitleaks 8.30.1 con SHA-256 verificado, historial completo,
permisos de lectura y salidas redactadas. No ejecuta scripts de la aplicacion
ni publica informes con valores de credenciales.

Las dos excepciones son fingerprints exactos de campos sessionKey de proveedores
de configuracion protegida de IIS en un commit historico compartido. Se revisaron
como configuracion local, no tokens externos confirmados. No se exceptuan rutas,
reglas ni futuros commits. Estos archivos no deben volver a versionarse.

Las alertas requieren revision humana. Si aparece una credencial real, revocarla
y coordinar la remediacion; no agregarla a la lista de excepciones para aprobar CI.

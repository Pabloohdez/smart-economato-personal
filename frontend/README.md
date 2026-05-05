# Smart Economato – Frontend (React)

Frontend del proyecto **Smart Economato** hecho con **React + Vite + TypeScript**.

---

## Cómo ejecutarlo

1. Actualizar el repositorio

```
git pull
```

2. Entrar en la carpeta del frontend

```
cd frontend
```

3. Instalar dependencias (solo la primera vez)

```
npm install
```

4. Crear el archivo `.env` si no existe

Copiar el archivo de ejemplo:

```
.env.example
```

y crear un archivo `.env`:

- **Con Docker:** `VITE_API_URL=/api` (el compose ya construye con esto).
- **En local (npm run dev):** `VITE_API_URL=http://localhost:3000/api`.

5. Ejecutar el proyecto

```
npm run dev
```

6. Abrir en el navegador

```
http://localhost:5173
```

---

## Notas

* Asegurarse de que el **backend NestJS** esté ejecutándose en el puerto 3000 (o Docker con el servicio `api`).
* Si es la primera vez que se descarga el proyecto hay que ejecutar `npm install`.
* Si hay cambios en dependencias puede ser necesario volver a ejecutar `npm install`.

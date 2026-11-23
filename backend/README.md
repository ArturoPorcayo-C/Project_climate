# Backend de Clima MX

Código de las Lambdas y scripts de base de datos del sistema. **Este código es una copia versionada**:
lo que realmente se ejecuta es lo desplegado en AWS (Lambda), y los cambios aquí no se suben solos.
Para desplegar, copia el contenido de `lambda_function.py` en la consola de Lambda y pulsa **Deploy**.

```
Frontend (React) → API Gateway (HTTP API, autorizador Lambda) → Lambdas → RDS MySQL / DynamoDB
```

## Lambdas

Todas: Python 3.12, rol `LabRole`. Capa `pymysql` solo en las que hablan con MySQL.

| Lambda | Qué hace | Capa | VPC | Timeout |
|---|---|---|---|---|
| `auth-clima` | Autorizador: valida el token `Bearer` | — | No | 5 s |
| `crud-calendario` | CRUD de `semanas` y `dias` (RDS `clima-mysql`) | `pymysql` | Sí (`lambda-rds`) | 15 s |
| `crud-catalogo` | CRUD de `UBICACIONES` y `USUARIOS` (RDS `db-clima-mysql`) | `pymysql` | Sí (`lambda-rds`) | 15 s |
| `validar-referencias` | Comprueba que existan ubicación, usuario y semana en MySQL | `pymysql` | Sí (`lambda-rds`) | 15 s |
| `crud-mediciones` | CRUD de `mediciones_clima` (DynamoDB) | — | **No** | 30 s |
| `crud-predicciones` | CRUD de `predicciones_generadas` (DynamoDB) | — | **No** | 30 s |
| `generar-prediccion` | Calcula y guarda una predicción a partir de las mediciones | — | **No** | 30 s |

Las Lambdas de DynamoDB no van en la VPC: allí perderían acceso a DynamoDB y a la API de Lambda.

## Variables de entorno

No guardes valores reales en este repositorio.

| Lambda | Variables |
|---|---|
| `auth-clima` | `API_TOKEN` |
| `crud-calendario` | `DB_HOST` (endpoint de `clima-mysql`), `DB_USER`, `DB_PASSWORD`, `DB_NAME=clima_db` |
| `crud-catalogo` | `DB_HOST` (endpoint de `db-clima-mysql`), `DB_USER`, `DB_PASSWORD`, `DB_NAME=db_clima_proyecto` |
| `validar-referencias` | `CAL_HOST`, `CAL_USER`, `CAL_PASSWORD`, `CAL_DB=clima_db`, `CAT_HOST`, `CAT_USER`, `CAT_PASSWORD`, `CAT_DB=db_clima_proyecto` |
| `crud-mediciones` | `TABLE_NAME=mediciones_clima`, `PK_NAME=id_ubicacion`, `SK_NAME=timestamp`, `CAMPOS=temperatura,humedad,presion_atmosferica,velocidad_viento,precipitacion`, `VALIDADOR_NAME=validar-referencias` |
| `crud-predicciones` | `TABLE_NAME=predicciones_generadas`, `PK_NAME=id_ubicacion`, `SK_NAME=id_semana_objetivo`, `CAMPOS=temp_promedio_predicha,probabilidad_lluvia,algoritmo_utilizado,fecha_generacion,id_usuario`, `VALIDADOR_NAME=validar-referencias` |
| `generar-prediccion` | `MEDICIONES_TABLE=mediciones_clima`, `PREDICCIONES_TABLE=predicciones_generadas`, `VALIDADOR_NAME=validar-referencias` |

## Capa `pymysql`

Desde CloudShell:

```bash
mkdir -p python
pip install pymysql -t python
zip -r pymysql-layer.zip python
aws lambda publish-layer-version --layer-name pymysql \
  --zip-file fileb://pymysql-layer.zip --compatible-runtimes python3.12 --region us-east-1
```

## Rutas del API

Todas las rutas `ANY`/`POST` llevan el autorizador `auth-token`. Cada una tiene una ruta `OPTIONS`
gemela **sin autorizador** (preflight de CORS); las Lambdas responden `204` a `OPTIONS` sin tocar la base.

| Ruta | Lambda |
|---|---|
| `ANY /calendario/{recurso}` y `/calendario/{recurso}/{id}` | `crud-calendario` |
| `ANY /catalogo/{recurso}` y `/catalogo/{recurso}/{id}` | `crud-catalogo` |
| `ANY /mediciones`, `/mediciones/{id_ubicacion}`, `/mediciones/{id_ubicacion}/{sk}` | `crud-mediciones` |
| `ANY /predicciones`, `/predicciones/{id_ubicacion}`, `/predicciones/{id_ubicacion}/{sk}` | `crud-predicciones` |
| `POST /generar-prediccion` | `generar-prediccion` |

Recursos: `semanas`, `dias` (calendario) y `ubicaciones`, `usuarios` (catálogo).
En DynamoDB el `#` de la clave `2026#44` se envía como `%23` en la URL.

## Bases de datos

- **MySQL:** `database/mysql-calendario.sql` y `database/mysql-catalogo.sql`.
- **DynamoDB** (capacidad bajo demanda):

| Tabla | Clave de partición | Clave de ordenación |
|---|---|---|
| `mediciones_clima` | `id_ubicacion` (Número) | `timestamp` (Cadena, `AAAA-MM-DDTHH:MM`) |
| `predicciones_generadas` | `id_ubicacion` (Número) | `id_semana_objetivo` (Cadena, `AAAA#semana`) |

## Notas

- Las instancias RDS del Learner Lab se detienen al terminar la sesión: iníciala y espera a **Disponible** antes de probar.
- Los nombres `UBICACIONES` y `USUARIOS` van en mayúsculas porque MySQL en Linux distingue mayúsculas en tablas.
- El grupo de seguridad `lambda-rds` es el único origen permitido hacia el puerto 3306 de las instancias (más tu IP, si usas Workbench).

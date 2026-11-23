import json
import os
import pymysql

TABLAS = {
    "ubicaciones": {
        "tabla": "UBICACIONES",
        "pk": "id_ubicacion",
        "campos": ["ciudad", "estado", "latitud", "longitud"],
    },
    "usuarios": {
        "tabla": "USUARIOS",
        "pk": "id_usuario",
        "campos": ["nombre", "correo", "rol"],
    },
}


def conectar():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
        autocommit=True,
    )


def respuesta(codigo, cuerpo):
    return {
        "statusCode": codigo,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(cuerpo, default=str),
    }


def lambda_handler(event, context):
    metodo = event["requestContext"]["http"]["method"]

    if metodo == "OPTIONS":
        return {"statusCode": 204}

    params = event.get("pathParameters") or {}
    recurso = params.get("recurso")
    id_ = params.get("id")

    if recurso not in TABLAS:
        return respuesta(404, {"error": "Recurso no encontrado"})

    if id_ is not None and not id_.isdigit():
        return respuesta(400, {"error": "El id debe ser numérico"})

    cfg = TABLAS[recurso]
    tabla, pk, campos = cfg["tabla"], cfg["pk"], cfg["campos"]

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return respuesta(400, {"error": "JSON inválido"})

    conn = None
    try:
        conn = conectar()
        with conn.cursor() as cur:
            # LISTAR
            if metodo == "GET" and id_ is None:
                cur.execute(f"SELECT * FROM {tabla} LIMIT 200")
                return respuesta(200, cur.fetchall())

            # OBTENER UNO
            if metodo == "GET":
                cur.execute(f"SELECT * FROM {tabla} WHERE {pk}=%s", (id_,))
                fila = cur.fetchone()
                if not fila:
                    return respuesta(404, {"error": "No encontrado"})
                return respuesta(200, fila)

            # CREAR
            if metodo == "POST" and id_ is None:
                faltan = [c for c in campos if c not in body]
                if faltan:
                    return respuesta(400, {"error": f"Faltan campos: {faltan}"})
                cols = ", ".join(campos)
                marcas = ", ".join(["%s"] * len(campos))
                cur.execute(
                    f"INSERT INTO {tabla} ({cols}) VALUES ({marcas})",
                    [body[c] for c in campos],
                )
                return respuesta(201, {"mensaje": "Creado", pk: cur.lastrowid})

            # ACTUALIZAR
            if metodo == "PUT" and id_ is not None:
                a_cambiar = [c for c in campos if c in body]
                if not a_cambiar:
                    return respuesta(400, {"error": "Nada que actualizar"})
                sets = ", ".join(f"{c}=%s" for c in a_cambiar)
                cur.execute(
                    f"UPDATE {tabla} SET {sets} WHERE {pk}=%s",
                    [body[c] for c in a_cambiar] + [id_],
                )
                if cur.rowcount == 0:
                    return respuesta(404, {"error": "No encontrado o sin cambios"})
                return respuesta(200, {"mensaje": "Actualizado"})

            # ELIMINAR
            if metodo == "DELETE" and id_ is not None:
                cur.execute(f"DELETE FROM {tabla} WHERE {pk}=%s", (id_,))
                if cur.rowcount == 0:
                    return respuesta(404, {"error": "No encontrado"})
                return respuesta(200, {"mensaje": "Eliminado"})

        return respuesta(405, {"error": "Método no permitido"})

    except pymysql.err.IntegrityError:
        return respuesta(409, {"error": "Violación de integridad (duplicado o referencia inexistente)"})
    except Exception as e:
        print(f"ERROR: {e}")  # solo visible en CloudWatch
        return respuesta(500, {"error": "Error interno"})
    finally:
        if conn:
            conn.close()

import os
import pymysql

# tipo -> (prefijo de variables, consulta)
CONSULTAS = {
    "ubicacion": ("CAT", "SELECT 1 FROM UBICACIONES WHERE id_ubicacion=%s LIMIT 1"),
    "usuario":   ("CAT", "SELECT 1 FROM USUARIOS WHERE id_usuario=%s LIMIT 1"),
    "semana":    ("CAL", "SELECT 1 FROM semanas WHERE anio=%s AND numero_semana=%s LIMIT 1"),
}


def conectar(prefijo):
    return pymysql.connect(
        host=os.environ[f"{prefijo}_HOST"],
        user=os.environ[f"{prefijo}_USER"],
        password=os.environ[f"{prefijo}_PASSWORD"],
        database=os.environ[f"{prefijo}_DB"],
        connect_timeout=5,
    )


def lambda_handler(event, context):
    tipo = event.get("tipo")
    valores = event.get("valores")

    if tipo not in CONSULTAS or not isinstance(valores, list):
        return {"existe": False, "error": "solicitud inválida"}

    prefijo, sql = CONSULTAS[tipo]
    conn = None
    try:
        conn = conectar(prefijo)
        with conn.cursor() as cur:
            cur.execute(sql, valores)
            return {"existe": cur.fetchone() is not None}
    except Exception as e:
        print(f"ERROR validador ({tipo}): {e}")
        return {"existe": False, "error": "fallo al consultar"}
    finally:
        if conn:
            conn.close()

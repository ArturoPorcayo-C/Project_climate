import json
import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

dynamo = boto3.resource("dynamodb")
T_MED = dynamo.Table(os.environ["MEDICIONES_TABLE"])
T_PRED = dynamo.Table(os.environ["PREDICCIONES_TABLE"])
lam = boto3.client("lambda")
VALIDADOR = os.environ["VALIDADOR_NAME"]

SEMANAS_HISTORIAL = 12      # semanas previas que se consultan
MIN_SEMANAS = 2             # mínimo para predecir
MIN_SEMANAS_REGRESION = 4   # desde aquí se usa regresión lineal
MARGEN = 5                  # °C permitidos fuera del rango observado


def respuesta(codigo, cuerpo):
    return {
        "statusCode": codigo,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(cuerpo, default=str),
    }


def existe(tipo, *valores):
    r = lam.invoke(
        FunctionName=VALIDADOR,
        Payload=json.dumps({"tipo": tipo, "valores": list(valores)}),
    )
    if r.get("FunctionError"):
        raise RuntimeError("validador falló")
    data = json.loads(r["Payload"].read())
    if data.get("error"):
        raise RuntimeError("validador no disponible")
    return data["existe"]


def leer_mediciones(id_ubicacion, desde, hasta):
    """Todas las mediciones del rango (pagina de 1 MB en 1 MB)."""
    items, clave = [], None
    while True:
        args = {
            "KeyConditionExpression": Key("id_ubicacion").eq(id_ubicacion)
            & Key("timestamp").between(desde, hasta)
        }
        if clave:
            args["ExclusiveStartKey"] = clave
        r = T_MED.query(**args)
        items += r["Items"]
        clave = r.get("LastEvaluatedKey")
        if not clave:
            return items


def resumir(items):
    """Temperaturas por semana (clave: lunes) y días con/sin lluvia."""
    semanas, dias = {}, {}
    for m in items:
        try:
            f = datetime.strptime(str(m["timestamp"])[:10], "%Y-%m-%d").date()
        except ValueError:
            continue
        lunes = f - timedelta(days=f.weekday())
        if "temperatura" in m:
            semanas.setdefault(lunes, []).append(float(m["temperatura"]))
        if "precipitacion" in m:
            dias[f] = dias.get(f, False) or float(m["precipitacion"]) > 0
    return semanas, dias


def regresion_en_cero(xs, ys):
    """Mínimos cuadrados y = a + b·x; devuelve a (el valor en x = 0)."""
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return my
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return my - b * mx


def lambda_handler(event, context):
    metodo = event["requestContext"]["http"]["method"]

    if metodo == "OPTIONS":
        return {"statusCode": 204}
    if metodo != "POST":
        return respuesta(405, {"error": "Método no permitido"})

    try:
        body = json.loads(event.get("body") or "{}")
        id_ub = int(body["id_ubicacion"])
        anio = int(body["anio"])
        semana = int(body["semana"])
        id_us = int(body["id_usuario"])
        objetivo = date.fromisocalendar(anio, semana, 1)  # lunes de esa semana
    except (KeyError, TypeError, ValueError):
        return respuesta(
            400, {"error": "Se requieren id_ubicacion, anio, semana (válida) e id_usuario"}
        )

    try:
        if not existe("ubicacion", id_ub):
            return respuesta(422, {"error": "La ubicación no existe"})
        if not existe("usuario", id_us):
            return respuesta(422, {"error": "El usuario no existe"})
        if not existe("semana", anio, semana):
            return respuesta(422, {"error": "La semana no existe en el catálogo"})

        desde = (objetivo - timedelta(weeks=SEMANAS_HISTORIAL)).isoformat()
        semanas, dias = resumir(leer_mediciones(id_ub, desde, objetivo.isoformat()))

        if len(semanas) < MIN_SEMANAS:
            return respuesta(422, {
                "error": f"Hacen falta mediciones de al menos {MIN_SEMANAS} semanas "
                         f"distintas en las {SEMANAS_HISTORIAL} previas (hay {len(semanas)})"
            })
        if not dias:
            return respuesta(422, {"error": "Las mediciones no incluyen precipitación"})

        ordenadas = sorted(semanas.items())
        ys = [sum(v) / len(v) for _, v in ordenadas]
        if len(ys) >= MIN_SEMANAS_REGRESION:
            xs = [(lunes - objetivo).days // 7 for lunes, _ in ordenadas]
            pred = regresion_en_cero(xs, ys)
            pred = min(max(pred, min(ys) - MARGEN), max(ys) + MARGEN)
            algoritmo = "regresion_lineal"
        else:
            pred = sum(ys) / len(ys)
            algoritmo = "promedio_semanal"

        pred = round(pred, 1)
        prob = round(sum(dias.values()) / len(dias), 2)

        T_PRED.put_item(Item={
            "id_ubicacion": id_ub,
            "id_semana_objetivo": f"{anio}#{semana}",
            "temp_promedio_predicha": Decimal(str(pred)),
            "probabilidad_lluvia": Decimal(str(prob)),
            "algoritmo_utilizado": algoritmo,
            "fecha_generacion": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
            "id_usuario": id_us,
        })
        return respuesta(201, {
            "mensaje": "Predicción generada",
            "id_semana_objetivo": f"{anio}#{semana}",
            "temp_promedio_predicha": pred,
            "probabilidad_lluvia": prob,
            "algoritmo_utilizado": algoritmo,
            "semanas_usadas": len(ys),
        })

    except RuntimeError as e:
        print(f"ERROR: {e}")
        return respuesta(503, {"error": "Servicio de validación no disponible"})
    except Exception as e:
        print(f"ERROR: {e}")
        return respuesta(500, {"error": "Error interno"})

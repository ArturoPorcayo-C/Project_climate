import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

tabla = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
lam = boto3.client("lambda")
PK = os.environ["PK_NAME"]
SK = os.environ["SK_NAME"]
CAMPOS = set(os.environ["CAMPOS"].split(","))
VALIDADOR = os.environ["VALIDADOR_NAME"]


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


def validar_referencias(item):
    """Devuelve un mensaje de error, o None si todo existe."""
    if not existe("ubicacion", item[PK]):
        return "La ubicación no existe"
    return None


def convertir(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError


def respuesta(codigo, cuerpo):
    return {
        "statusCode": codigo,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(cuerpo, default=convertir),
    }


def lambda_handler(event, context):
    metodo = event["requestContext"]["http"]["method"]

    if metodo == "OPTIONS":
        return {"statusCode": 204}

    p = event.get("pathParameters") or {}
    q = event.get("queryStringParameters") or {}
    pk_val = p.get("id_ubicacion")
    sk_val = p.get("sk")

    try:
        body = json.loads(event.get("body") or "{}", parse_float=Decimal)
    except json.JSONDecodeError:
        return respuesta(400, {"error": "JSON inválido"})

    try:
        # CREAR
        if metodo == "POST" and pk_val is None:
            if PK not in body or SK not in body:
                return respuesta(400, {"error": f"Faltan {PK} y/o {SK}"})
            item = {k: v for k, v in body.items() if k in CAMPOS}
            item[PK] = int(body[PK])
            item[SK] = str(body[SK])

            error = validar_referencias(item)
            if error:
                return respuesta(422, {"error": error})

            tabla.put_item(Item=item)
            return respuesta(201, {"mensaje": "Creado"})

        if pk_val is None:
            return respuesta(405, {"error": "Método no permitido"})
        pk_val = int(pk_val)

        # LISTAR por ubicación (con rango opcional)
        if metodo == "GET" and sk_val is None:
            cond = Key(PK).eq(pk_val)
            desde, hasta = q.get("desde"), q.get("hasta")
            if desde and hasta:
                cond &= Key(SK).between(desde, hasta)
            elif desde:
                cond &= Key(SK).gte(desde)
            elif hasta:
                cond &= Key(SK).lte(hasta)
            res = tabla.query(KeyConditionExpression=cond, Limit=100)
            return respuesta(200, res["Items"])

        # OBTENER UNO
        if metodo == "GET":
            res = tabla.get_item(Key={PK: pk_val, SK: sk_val})
            if "Item" not in res:
                return respuesta(404, {"error": "No encontrado"})
            return respuesta(200, res["Item"])

        # ACTUALIZAR
        if metodo == "PUT" and sk_val is not None:
            cambios = {k: v for k, v in body.items() if k in CAMPOS}
            if not cambios:
                return respuesta(400, {"error": "Nada que actualizar"})
            nombres = {f"#c{i}": k for i, k in enumerate(cambios)}
            valores = {f":v{i}": v for i, v in enumerate(cambios.values())}
            expr = "SET " + ", ".join(f"#c{i} = :v{i}" for i in range(len(cambios)))
            tabla.update_item(
                Key={PK: pk_val, SK: sk_val},
                UpdateExpression=expr,
                ExpressionAttributeNames={**nombres, "#pk": PK},
                ExpressionAttributeValues=valores,
                ConditionExpression="attribute_exists(#pk)",
            )
            return respuesta(200, {"mensaje": "Actualizado"})

        # ELIMINAR
        if metodo == "DELETE" and sk_val is not None:
            tabla.delete_item(Key={PK: pk_val, SK: sk_val})
            return respuesta(200, {"mensaje": "Eliminado"})

        return respuesta(405, {"error": "Método no permitido"})

    except ValueError:
        return respuesta(400, {"error": "Parámetros inválidos"})
    except RuntimeError as e:
        print(f"ERROR: {e}")
        return respuesta(503, {"error": "Servicio de validación no disponible"})
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return respuesta(404, {"error": "No encontrado"})
        print(f"ERROR: {e}")
        return respuesta(500, {"error": "Error interno"})
    except Exception as e:
        print(f"ERROR: {e}")
        return respuesta(500, {"error": "Error interno"})

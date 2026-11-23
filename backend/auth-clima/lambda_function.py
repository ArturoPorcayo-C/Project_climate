import hmac
import os

API_TOKEN = os.environ["API_TOKEN"]


def lambda_handler(event, context):
    header = (event.get("headers") or {}).get("authorization", "")

    # Formato esperado: "Bearer <token>"
    partes = header.split(" ", 1)
    token = partes[1] if len(partes) == 2 and partes[0] == "Bearer" else ""

    autorizado = hmac.compare_digest(token.encode(), API_TOKEN.encode())

    return {"isAuthorized": autorizado}

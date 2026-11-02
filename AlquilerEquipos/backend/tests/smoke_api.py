import json
import os
import sys
import urllib.error
import urllib.request

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5272"

def request(path, method="GET", payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    if os.environ.get("ALQUILER_TEST_TOKEN"):
        req.add_header("Authorization", "Bearer " + os.environ["ALQUILER_TEST_TOKEN"])
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

status, body = request("/swagger/v1/swagger.json")
assert status == 200, (status, body)
paths = json.loads(body)["paths"]
expected = {"/api/equipos": {"get", "post"},
            "/api/equipos/{id}": {"get", "put", "delete"},
            "/api/equipos/{id}/estado": {"patch"},
            "/api/equipos/disponibles": {"get"},
            "/api/reservas": {"get", "post"},
            "/api/reservas/{id}": {"get"},
            "/api/reservas/{id}/cancelar": {"patch"},
            "/api/reservas/{id}/activar": {"patch"},
            "/api/reservas/{id}/devolver": {"patch"},
            "/api/clientes": {"get", "post"},
            "/api/clientes/{id}": {"get", "put", "delete"},
            "/api/session": {"get"}}
assert set(paths) == set(expected), paths
for path, verbs in expected.items():
    assert verbs.issubset(paths[path]), path
assert request("/swagger/index.html")[0] == 200
assert request("/api/equipos", "POST", {})[0] == 400
assert request("/api/equipos/1/estado", "PATCH", {})[0] == 400
assert request("/api/equipos/1/estado", "PATCH", {"estado": "Vendido"})[0] == 400
assert request("/api/equipos/1/estado", "PATCH", {"estado": 99})[0] == 400
for old in ("Productos", "Pedidos", "MovimientosStock"):
    assert request("/api/" + old)[0] == 404
assert request("/api/equipos/disponibles")[0] == 400
assert request("/api/equipos/disponibles?fechaInicio=2030-01-10&fechaFin=2030-01-09")[0] == 400
assert request("/api/reservas", "POST", {})[0] == 400
assert request("/api/reservas", "POST", {
    "equipoId": 1, "clienteId": 1, "fechaInicio": "2030-01-10",
    "fechaFinEsperada": "2030-01-09", "costoTotal": 100})[0] == 400
print("OK: Swagger, equipos y reservas, entradas invalidas y retiro de rutas antiguas.")

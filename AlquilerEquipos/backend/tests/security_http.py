"""Starts an isolated API process and checks authentication without a SQL server."""
import argparse
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--dotnet", default="dotnet")
parser.add_argument("--configuration", default="Debug")
args = parser.parse_args()
api = Path(__file__).resolve().parents[1] / "AlquilerEquipos.API"
dll = api / "bin" / args.configuration / "net10.0" / "AlquilerEquipos.API.dll"
key = secrets.token_urlsafe(64)

def encoded(data):
    return base64.urlsafe_b64encode(json.dumps(data, separators=(",", ":")).encode()).rstrip(b"=")

def token(role="Administrador", **changes):
    claims = {"sub": "automated-test", "role": role, "iss": "tests",
              "aud": "alquiler-tests", "exp": int(time.time()) + 300}
    claims.update(changes)
    body = encoded({"alg": "HS256", "typ": "JWT"}) + b"." + encoded(claims)
    signature = base64.urlsafe_b64encode(hmac.new(key.encode(), body, hashlib.sha256).digest()).rstrip(b"=")
    return (body + b"." + signature).decode()

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
base = f"http://127.0.0.1:{port}"
env = {name: value for name, value in os.environ.items()
       if not name.casefold().startswith(("authentication__", "reverseproxy__", "cors__", "connectionstrings__", "windowslocal__", "web__", "kestrel__"))}
env.update({
    "ASPNETCORE_ENVIRONMENT": "Development",
    "DOTNET_ENVIRONMENT": "Development",
    "Authentication__AllowAnonymousDevelopment": "false",
    "Authentication__Issuer": "tests",
    "Authentication__Audience": "alquiler-tests",
    "Authentication__SigningKey": key,
    "Authentication__Authority": "",
    "Authentication__RoleClaimType": "role",
    "ConnectionStrings__AlquilerEquipos": "Server=127.0.0.1,1;Database=Unavailable;User Id=test;Password=not-a-real-credential;Connect Timeout=1;Encrypt=True;TrustServerCertificate=False",
    "Logging__LogLevel__Default": "Critical",
})

def request(path, bearer=None, method="GET", payload=None, timeout=8, extra_headers=None):
    headers = {"Content-Type": "application/json"}
    if bearer:
        headers["Authorization"] = "Bearer " + bearer
    headers.update(extra_headers or {})
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()

count = 0
def check(condition, name):
    global count
    if not condition:
        raise AssertionError(name)
    count += 1

process = subprocess.Popen([args.dotnet, str(dll), "--urls", base], cwd=api, env=env,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("API exited before readiness")
        try:
            if request("/health/live", timeout=0.5)[0] == 200:
                break
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.1)
    else:
        raise RuntimeError("API did not start")
    admin = token()
    check(request("/api/equipos")[0] == 401, "No token must return 401")
    check(request("/api/reservas")[0] == 401, "Reservations require token")
    check(request("/api/clientes")[0] == 401, "Clients require token")
    check(request("/api/equipos", token(sub=""), "POST", {})[0] == 403, "Empty subject rejected")
    for invalid in (token(exp=int(time.time()) - 120), token(iss="other"),
                    token(aud="other"), token(nbf=int(time.time()) + 120), "invalid.jwt"):
        check(request("/api/equipos", invalid)[0] == 401, "Invalid JWT rejected")
    signed = admin.split(".")
    signed[2] = ("A" if signed[2][0] != "A" else "B") + signed[2][1:]
    check(request("/api/equipos", ".".join(signed))[0] == 401, "Tampered signature")
    check(request("/api/equipos", token("Consulta"), "POST", {})[0] == 403, "Read-only cannot write")
    check(request("/api/equipos/1", token("Operador"), "DELETE")[0] == 403, "Operator cannot delete")
    check(request("/api/equipos", token("Unknown"), "POST", {})[0] == 403, "Unknown role rejected")
    status, headers, body = request("/api/equipos", admin, "POST", {})
    check(status == 400, "Valid JWT reaches input validation")
    check(headers.get("X-Content-Type-Options") == "nosniff", "Security header")
    check(headers.get("Cache-Control") == "no-store", "No caching business data")
    check(not headers.get("Server"), "No server banner")
    check(request("/api/equipos/disponibles", token("Consulta"))[0] == 400, "Read-only can query")
    status, headers, body = request(
        "/api/equipos/disponibles?fechaInicio=2030-01-10&fechaFin=2030-01-09", admin,
        extra_headers={"Accept": "application/xml"})
    check(status == 400 and "traceId" in json.loads(body), "Controlled error for unsupported Accept header")
    check(request("/api/equipos?pagina=0", admin)[0] == 400, "Invalid page rejected")
    check(request("/api/reservas?tamanioPagina=1000", admin)[0] == 400, "Oversized page rejected")
    check(request("/api/reservas?estado=99", admin)[0] == 400, "Invalid state filter rejected")
    check(request("/api/clientes", token("Consulta"), "POST", {})[0] == 403, "Read-only cannot create clients")
    check(request("/api/clientes/1", token("Operador"), "DELETE")[0] == 403, "Operator cannot delete client")
    check(request("/api/clientes", admin, "POST", {
        "nombre": "Test", "apellido": "Test", "email": "invalid"})[0] == 400, "Client email validation")
    check(request("/api/equipos", token(["Consulta", "Operador"]), "POST", {})[0] == 400,
        "Multiple role claims accepted")
    check(request("/api/reservas/1/activar", token("Consulta"), "PATCH")[0] == 403, "Delivery requires write role")
    check(request("/api/reservas/1/devolver", token("Consulta"), "PATCH", {})[0] == 403, "Return requires write role")
    check(request("/api/reservas", admin, "POST", {
        "equipoId": 1, "clienteId": 1, "fechaInicio": "2030-01-10T10:00:00Z",
        "fechaFinEsperada": "2030-01-10T12:00:00Z", "costoTotal": 1.001})[0] == 400,
        "Fractional cents rejected before database")
    check(request("/api/equipos", admin, "POST", {
        "nombre": "x" * 70000, "marca": "test", "numeroSerie": "oversized"})[0] == 413,
        "Oversized request rejected")
    status, headers, body = request("/api/equipos", admin)
    problem = json.loads(body)
    check(status in (500, 503), "Unavailable DB returns controlled error")
    check("traceId" in problem and "Unavailable" not in body.decode()
          and "SqlException" not in body.decode(), "No internal error details")
    check(request("/health/ready")[0] == 401, "Readiness protected")
    check(request("/health/ready", admin)[0] == 503, "Unavailable database not ready")
    status, headers, body = request("/swagger/v1/swagger.json")
    swagger = json.loads(body)
    check(status == 200 and "Bearer" in swagger["components"]["securitySchemes"], "Swagger describes JWT")
    parameter_names = {item["name"].lower() for item in swagger["paths"]["/api/equipos"]["get"]["parameters"]}
    check(parameter_names == {"pagina", "tamaniopagina"}, "Only pagination inputs documented")
    _, allowed_headers, _ = request("/api/equipos", method="OPTIONS", extra_headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    check(allowed_headers.get("Access-Control-Allow-Origin") == "http://localhost:5173", "Allowed CORS origin")
    _, denied_headers, _ = request("/api/equipos", method="OPTIONS", extra_headers={
        "Origin": "https://untrusted.example.invalid", "Access-Control-Request-Method": "GET"})
    check(not denied_headers.get("Access-Control-Allow-Origin"), "Unknown CORS origin denied")
    subprocess.run([sys.executable, str(Path(__file__).with_name("smoke_api.py")), base],
                   env=os.environ | {"ALQUILER_TEST_TOKEN": admin}, check=True)
    limited = False
    for attempt in range(125):
        status, headers, body = request("/api/equipos?pagina=0", admin)
        if status == 429:
            limited = headers.get("Retry-After") is not None
            break
    check(limited, "Rate limit returns 429 and Retry-After")
    check(request("/health/live")[0] == 200, "Liveness remains available under business rate limiting")
finally:
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()

for name, overrides, expected_error in (
    ("Production cannot enable anonymous access", {"ASPNETCORE_ENVIRONMENT": "Production",
        "Authentication__AllowAnonymousDevelopment": "true"}, "acceso anonimo"),
    ("Production requires OIDC authority", {"ASPNETCORE_ENVIRONMENT": "Production"}, "Authority HTTPS"),
    ("Weak development signing key rejected", {"Authentication__SigningKey": "short"}, "64 bytes"),
    ("Windows mode rejected in Production", {"ASPNETCORE_ENVIRONMENT": "Production", "Authentication__Mode": "WindowsLocal"}, "WindowsLocal"),
    ("Windows local privileged port rejected", {"Authentication__Mode": "WindowsLocal", "WindowsLocal__Port": "80"}, "puerto local valido"),
    ("Windows local cannot add network endpoints", {"Authentication__Mode": "WindowsLocal", "Kestrel__Endpoints__Other__Url": "http://0.0.0.0:9999"}, "endpoints Kestrel"),
    *((
        ("Windows mode cannot bypass auth", {"Authentication__Mode": "WindowsLocal", "Authentication__AllowAnonymousDevelopment": "true"}, "bypass anonimo"),
        ("Windows mode requires explicit accounts", {"Authentication__Mode": "WindowsLocal"}, "cuentas Windows explicitas"),
        ("Windows mode rejects unknown roles", {"Authentication__Mode": "WindowsLocal", "WindowsLocal__Users__0__Name": "PC\\Test", "WindowsLocal__Users__0__Role": "Owner"}, "roles validos"),
        ("Windows mode cannot trust a proxy", {"Authentication__Mode": "WindowsLocal", "ReverseProxy__KnownProxies__0": "127.0.0.1"}, "proxy"),
    ) if os.name == "nt" else ()),
):
    invalid_env = env | overrides
    invalid_env["DOTNET_ENVIRONMENT"] = invalid_env["ASPNETCORE_ENVIRONMENT"]
    invalid_process = subprocess.Popen([args.dotnet, str(dll), "--urls", base], cwd=api, env=invalid_env,
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        output, error = invalid_process.communicate(timeout=4)
    except subprocess.TimeoutExpired:
        # Windows error reporting can delay exit after an unhandled startup exception.
        invalid_process.kill()
        output, error = invalid_process.communicate()
    check(invalid_process.returncode != 0 and expected_error in (output + error).decode(errors="replace"), name)

for trust_proxy in (False, True):
    production_env = env | {
        "ASPNETCORE_ENVIRONMENT": "Production",
        "DOTNET_ENVIRONMENT": "Production",
        "Authentication__Authority": "https://identity.example.invalid",
        "AllowedHosts": "localhost;127.0.0.1;api.example.invalid"
    }
    if trust_proxy:
        production_env["ReverseProxy__KnownProxies__0"] = "127.0.0.1"
    process = subprocess.Popen([args.dotnet, str(dll), "--urls", base], cwd=api, env=production_env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Production API exited before readiness")
            try:
                if request("/health/live", timeout=0.5)[0] == 200:
                    break
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.1)
        else:
            raise RuntimeError("Production API did not start")
        check(request("/api/equipos")[0] == 400, "Production rejects plain HTTP")
        check(request("/health/live", admin, timeout=1)[0] == 200,
            "Liveness does not validate JWT against production identity metadata")
        forwarded = {"X-Forwarded-Proto": "https", "Host": "api.example.invalid"}
        status, headers, _ = request("/api/equipos", extra_headers=forwarded)
        check(status == (401 if trust_proxy else 400), "Only explicit proxy can assert HTTPS")
        if trust_proxy:
            check(bool(headers.get("Strict-Transport-Security")), "HSTS behind trusted proxy")
            check(request("/swagger/v1/swagger.json", extra_headers=forwarded)[0] != 200,
                "Swagger disabled in production")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
print(f"OK: {count} HTTP authentication, authorization, errors and infrastructure checks.")

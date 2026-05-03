#!/bin/bash
# Test Suite para Flight Tracker API

API_URL="${API_URL:-https://flight-tracker-deploy.vercel.app/api/lookupFlight}"
FIREBASE_ID_TOKEN="${FIREBASE_ID_TOKEN:-}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

failures=0

print_test() {
    echo -e "${BLUE}===${NC} $1 ${BLUE}==="
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    failures=$((failures + 1))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

status_code() {
    tail -n 1
}

body_without_status() {
    sed '$d'
}

auth_header=()
if [ -n "$FIREBASE_ID_TOKEN" ]; then
    auth_header=(-H "Authorization: Bearer $FIREBASE_ID_TOKEN")
fi

print_test "Test 1: Sin autenticacion"
response=$(curl -s -w "\n%{http_code}" "$API_URL?flightNumber=AR1388")
status=$(echo "$response" | status_code)
body=$(echo "$response" | body_without_status)
error=$(echo "$body" | jq -r '.error' 2>/dev/null)
if [ "$status" = "401" ] && [ "$error" = "unauthenticated" ]; then
    print_success "La API bloquea requests sin token"
else
    print_error "Esperado 401 unauthenticated; recibido status=$status body=$body"
fi
echo ""

print_test "Test 2: Token invalido"
response=$(curl -s -w "\n%{http_code}" "$API_URL?flightNumber=AR1388" -H "Authorization: Bearer invalid_token")
status=$(echo "$response" | status_code)
body=$(echo "$response" | body_without_status)
error=$(echo "$body" | jq -r '.error' 2>/dev/null)
if [ "$status" = "401" ] && [ "$error" = "unauthenticated" ]; then
    print_success "La API rechaza tokens invalidos"
else
    print_error "Esperado 401 unauthenticated; recibido status=$status body=$body"
fi
echo ""

print_test "Test 3: CORS desde origen permitido"
headers=$(curl -s -i -X OPTIONS "$API_URL?flightNumber=AR1388" -H "Origin: https://lele32.github.io" | grep -i "access-control-allow-origin")
if echo "$headers" | grep -q "https://lele32.github.io"; then
    print_success "CORS permite el dominio productivo esperado"
    echo "$headers"
else
    print_error "No se encontro Access-Control-Allow-Origin para origen permitido"
fi
echo ""

print_test "Test 4: CORS desde origen no permitido"
response=$(curl -s -w "\n%{http_code}" "$API_URL?flightNumber=AR1388" -H "Origin: https://malicious.example" -H "Authorization: Bearer invalid_token")
status=$(echo "$response" | status_code)
body=$(echo "$response" | body_without_status)
error=$(echo "$body" | jq -r '.error' 2>/dev/null)
if [ "$status" = "403" ] && [ "$error" = "origin-not-allowed" ]; then
    print_success "La API bloquea origenes no autorizados"
else
    print_error "Esperado 403 origin-not-allowed; recibido status=$status body=$body"
fi
echo ""

print_test "Test 5: Metodo POST no permitido"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL?flightNumber=AR1388")
status=$(echo "$response" | status_code)
body=$(echo "$response" | body_without_status)
error=$(echo "$body" | jq -r '.error' 2>/dev/null)
if [ "$status" = "405" ] && [ "$error" = "method-not-allowed" ]; then
    print_success "Metodo POST correctamente bloqueado"
else
    print_error "Esperado 405 method-not-allowed; recibido status=$status body=$body"
fi
echo ""

print_test "Test 6: Security headers"
security_headers=$(curl -s -i "$API_URL?flightNumber=AR1388" | grep -Ei "(x-content-type-options|x-frame-options|x-xss-protection)")
if [ -n "$security_headers" ]; then
    print_success "Security headers presentes"
    echo "$security_headers"
else
    print_error "Security headers no encontrados"
fi
echo ""

if [ -z "$FIREBASE_ID_TOKEN" ]; then
    print_warning "FIREBASE_ID_TOKEN no esta definido; se omiten pruebas autenticadas."
else
    print_test "Test 7: Validacion de entrada invalida con token valido"
    response=$(curl -s -w "\n%{http_code}" "$API_URL?flightNumber=INVALID***" "${auth_header[@]}")
    status=$(echo "$response" | status_code)
    body=$(echo "$response" | body_without_status)
    error=$(echo "$body" | jq -r '.error' 2>/dev/null)
    if [ "$status" = "400" ] && [ "$error" != "null" ]; then
        print_success "Validacion funcionando: $error"
    else
        print_error "Esperado 400 con error de validacion; recibido status=$status body=$body"
    fi
    echo ""

    print_test "Test 8: Lookup autenticado"
    response=$(curl -s -w "\n%{http_code}" "$API_URL?flightNumber=AR1388" "${auth_header[@]}")
    status=$(echo "$response" | status_code)
    body=$(echo "$response" | body_without_status)
    found=$(echo "$body" | jq -r '.found' 2>/dev/null)
    if [ "$status" = "200" ] && { [ "$found" = "true" ] || [ "$found" = "false" ]; }; then
        print_success "Lookup autenticado responde con contrato esperado"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "Respuesta inesperada para lookup autenticado: status=$status body=$body"
    fi
    echo ""

    print_test "Test 9: Rate limiting headers autenticados"
    headers=$(curl -s -i "$API_URL?flightNumber=TEST123" "${auth_header[@]}" | grep -i "x-ratelimit")
    if [ -n "$headers" ]; then
        print_success "Headers de rate limiting presentes"
        echo "$headers"
    else
        print_error "Headers de rate limiting no encontrados"
    fi
    echo ""
fi

print_test "Resumen de Tests"
echo -e "${BLUE}API Endpoint:${NC} $API_URL"
if [ "$failures" -eq 0 ]; then
    echo -e "${GREEN}Todas las pruebas ejecutadas pasaron.${NC}"
    exit 0
fi

echo -e "${RED}$failures prueba(s) fallaron.${NC}"
exit 1

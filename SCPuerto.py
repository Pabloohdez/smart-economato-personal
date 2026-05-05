import serial
import re
import time

PORT = "COM1"
BAUD = 9600

STX = b"\x02"
ETX = b"\x03"

def extraer_tramas(buf: bytes):
    """Devuelve (lista_tramas, resto_buf). Trama = bytes entre STX..ETX o hasta \n/\r."""
    tramas = []

    while True:
        # 1) Si hay STX, intentamos STX..ETX
        i = buf.find(STX)
        if i != -1:
            buf = buf[i+1:]  # quitamos STX
            j = buf.find(ETX)
            if j == -1:
                return tramas, STX + buf  # aún incompleta (volvemos a poner STX para no perder referencia)
            tramas.append(buf[:j])
            buf = buf[j+1:]
            continue

        # 2) Si no hay STX, intentamos por fin de línea
        j = buf.find(b"\n")
        if j != -1:
            tramas.append(buf[:j])
            buf = buf[j+1:]
            continue

        # 3) También puede terminar en \r sin \n
        j = buf.find(b"\r")
        if j != -1:
            tramas.append(buf[:j])
            buf = buf[j+1:]
            continue

        return tramas, buf

def parse_peso(trama_texto: str):
    # Busca el número más “completo” dentro de la trama
    nums = re.findall(r"[-+]?\d+(?:\.\d+)?", trama_texto)
    if not nums:
        return None
    return nums[-1]  # normalmente el peso viene al final

with serial.Serial(PORT, BAUD, timeout=0.2) as ser:
    print("Leyendo datos desde", ser.name)
    buf = b""
    ultimo = None

    while True:
        chunk = ser.read(ser.in_waiting or 1)
        if chunk:
            buf += chunk

            tramas, buf = extraer_tramas(buf)
            for t in tramas:
                texto = t.decode("ascii", errors="ignore").strip()
                peso = parse_peso(texto)
                if peso is None:
                    continue

                # Si quieres imprimir solo cuando cambie:
                if peso != ultimo:
                    print("Peso:", peso)  # aquí debería salir 0.7454
                    ultimo = peso

        time.sleep(0.01)
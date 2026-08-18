"""
Fingerprint scanner bridge: watches the scanner's serial output and records
one check-in per successful scan on this laptop's local zone server.

Usage:
    python bridge.py [COM_PORT] [API_URL]
    python bridge.py COM5 http://localhost:3000/api/checkin

Protocol confirmed by listening to a real scan on 2026-08-18: the board boots
with "System Ready." / "Waiting for finger...", then on a successful match
prints a line like "DATA:MATCH,<enrolled_id>,<score>" followed by
"Remove finger.". Only DATA:MATCH lines count as a check-in — this only
identifies THAT a match happened, not who, so every match just logs one
anonymous "individual" check-in via method=fingerprint.

Note on the odd boot banner: this board prints
"--- Ikeja Stake Remote-Wipe Scanner ---" before "System Ready." — confirmed
(2026-08-18) to be one continuous boot message from this single repurposed
board, not a different/unknown device. Earlier partial reads had only
captured a fragment of this banner, which looked like two different devices
swapping identities across ports; catching the full text and testing real
scans showed it's the same known board behaving normally. This script still
refuses to run if "System Ready" doesn't appear at all, as a safety net
against plugging into a genuinely different/unrecognized device.
"""
import serial
import time
import json
import re
import sys
import urllib.request

DEFAULT_PORT = "COM5"
DEFAULT_API_URL = "http://localhost:3000/api/checkin"
BAUD = 9600
DEBOUNCE_SECONDS = 2.0

MATCH_RE = re.compile(r"DATA:MATCH,(\d+),(\d+)")


def post_checkin(api_url):
    payload = json.dumps({"entry_type": "individual", "method": "fingerprint"}).encode()
    req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"  -> recorded check-in (HTTP {resp.status})")
    except Exception as e:
        print(f"  -> FAILED to record check-in: {e}")
        print("     (is the zone server running? check start-server.bat)")


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PORT
    api_url = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_API_URL

    print(f"Opening {port} @ {BAUD}...")
    ser = serial.Serial(port, BAUD, timeout=1)
    time.sleep(2.5)
    ser.reset_input_buffer()

    # Read for a full second (not just one .read() call) so a boot banner
    # split across multiple USB packets is captured in full before deciding.
    boot = ""
    boot_deadline = time.time() + 1.0
    while time.time() < boot_deadline:
        chunk = ser.read(500)
        if chunk:
            boot += chunk.decode(errors="ignore")

    if "system ready" not in boot.lower():
        print("!" * 60)
        print(f"REFUSING TO RUN: unrecognized boot message on {port}:")
        print(f"  {boot!r}")
        print("This does not match the confirmed fingerprint scanner identity.")
        print("Do not proceed — check which physical device is on this port.")
        print("!" * 60)
        ser.close()
        sys.exit(1)

    print(f"Confirmed fingerprint scanner on {port}. Posting check-ins to {api_url}")
    print("Waiting for scans... (Ctrl+C to stop)")

    buf = ""
    last_checkin_at = 0.0
    while True:
        chunk = ser.read(200)
        if not chunk:
            continue
        buf += chunk.decode(errors="ignore")
        while "\n" in buf:
            line, buf = buf.split("\n", 1)
            line = line.strip()
            match = MATCH_RE.search(line)
            if match:
                now = time.time()
                print(f"Scan matched (id={match.group(1)}, score={match.group(2)})")
                if now - last_checkin_at < DEBOUNCE_SECONDS:
                    print("  -> skipped (too soon after last scan, likely same press)")
                else:
                    last_checkin_at = now
                    post_checkin(api_url)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")

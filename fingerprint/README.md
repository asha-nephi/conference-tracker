# Fingerprint integration — blocked

Not built yet. Two serial devices (COM5 = FTDI adapter, COM6 = CH340 adapter) were probed
and gave **inconsistent identities across separate probe runs** — at one point COM6 reported
a plain-text banner `"--- Ikeja Stake Remote-Wipe Scanner ---"`, and on a later run the same
banner appeared on COM5 instead, with COM6 instead showing `"System Ready. Waiting for
finger..."`. A real device's firmware banner does not change which port it's on between runs,
so the physical identity of what's plugged into COM5 vs COM6 is not currently trustworthy
enough to build against.

**Before writing any code here:** physically disconnect both, plug in only the confirmed real
fingerprint scanner, and note which COM port it lands on (check via Device Manager or
`python -c "import serial.tools.list_ports as p; [print(x.device, x.description) for x in p.comports()]"`).
Do not reconnect or send commands to whatever was identified as the "Remote-Wipe" device as
part of this project.

## Once the port is confirmed

The scanner speaks a simple text protocol over serial (prints `"System Ready."` /
`"Waiting for finger..."` on boot at 9600 baud) rather than the raw AS608/R307 binary
protocol — it appears to be a fingerprint sensor sitting behind custom bridge firmware.
Next step is to physically scan a finger while listening on the confirmed port to learn
the exact line(s) it prints on a successful read, then write `fingerprint/bridge.js`:
a small Node script that opens that serial port, watches for the "scan detected" line,
and `POST`s `{ entry_type: "individual" }` with `method: "fingerprint"` to
`http://localhost:<port>/api/checkin` on that laptop's own zone server.

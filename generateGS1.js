const FNC1 = "\u001D"; // Only for variable-length fields

/* ================= VALIDATION ================= */
function validateAllData() {
  const bookingId = document.getElementById("bookingId").value.trim();
  const customerName = document.getElementById("customerName").value.trim();
  const address = document.getElementById("address").value.trim();
  //const tpNo = document.getElementById("tpNo").value.trim();
  const shipmentNo = document.getElementById("shipmentNo").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const orderDate = toGS1Date(document.getElementById("orderDate").value);
  const deliveryDate = toGS1Date(document.getElementById("deliveryDate").value);

  if (!bookingId || !customerName || !address || !shipmentNo || !orderDate || !deliveryDate || !email || !phone) {
    alert("Fill all Main Details");
    return false;
  }

  if (!isValidGS1Date(orderDate) || !isValidGS1Date(deliveryDate)) {
    alert("Invalid Date format (YYMMDD)");
    return false;
  }

  const cartonRows = document.querySelectorAll("#cartonTable tbody tr");
  if (!cartonRows.length) { alert("Add at least one Export Carton"); return false; }

  const masterRows = document.querySelectorAll("#masterTable tbody tr");
  const innerRows = document.querySelectorAll("#innerTable tbody tr");

  // simple validation for Export, Master, Inner
  for (const r of cartonRows) {
    if (!r.querySelector(".carton-id-input").value.trim()) return alert("Invalid Export Carton"), false;
  }
  for (const r of masterRows) {
    if (!r.cells[0].querySelector("input").value.trim()) return alert("Invalid Master Carton"), false;
  }
  for (const r of innerRows) {
    const i = r.querySelectorAll("input, select");
    for (const f of i) if (!f.value.trim()) return alert("Fill all Inner fields"), false;
  }

  return true;
}

/* ================= GENERATE GS1 NUMERIC QR ================= */
async function generateGS1QR() {
  if (!validateAllData()) return;

  const output = document.getElementById("qrOutput");
  output.innerHTML = "";

  const zip = new JSZip();
  const qrSize = +document.getElementById("qrSize").value || 200;

  const bookingId = document.getElementById("bookingId").value.padStart(14,'0'); // 01
  const customer = document.getElementById("customerName").value; // 91
  const address = document.getElementById("address").value; // 92
  //const tpNo = document.getElementById("tpNo").value.padStart(6,'0');
  const shipmentNo = document.getElementById("shipmentNo").value.trim(); // 93
  const email = document.getElementById("email").value.trim(); // 94 
  const phone = document.getElementById("phone").value.trim(); // 95
  const orderDate = toGS1Date(document.getElementById("orderDate").value); // 96
  const deliveryDate = toGS1Date(document.getElementById("deliveryDate").value); // 12
  const notes = document.getElementById("notes").value.trim(); // 97

  // ---------------- MAIN QR ----------------
  const mainQR = 
    `01${bookingId}${FNC1}` +            // Booking ID / GTIN
    `12${deliveryDate}${FNC1}` +         // Expiration Date
    `96${orderDate}${FNC1}` +            // Production Date
    `91${customer}${FNC1}` +             // customer Name
    `92${address}${FNC1}` +              // address variable fields use FNC1
    `93${shipmentNo}${FNC1}` +           // shipmentNo variable fields use FNC1
    `94${email}${FNC1}` +                // email variable fields use FNC1
    `95${phone}${FNC1}` +                // phone variable fields use FNC1
    `97${notes}`;              // Net weight placeholder
   

  await createQR(output, zip, qrSize, "MAIN", mainQR, `Main_${bookingId}.png`);

  // ---------------- EXPORT ----------------
  const cartonRows = document.querySelectorAll("#cartonTable tbody tr");
  for (const r of cartonRows) {
    const ecId = r.querySelector(".carton-id-input").value;
    const maxMaster = r.cells[2].querySelector("input").value;
    const exportQR = `01${bookingId}${FNC1}98${ecId}${FNC1}37${maxMaster}`; // 01 , 98  , 37 
    await createQR(output, zip, qrSize, `Export ${ecId}`, exportQR, `Export_${ecId}.png`);
  }

  // ---------------- MASTER ----------------
  const masterRows = document.querySelectorAll("#masterTable tbody tr");
  for (const r of masterRows) {
    const mcId = r.cells[0].querySelector("input").value;
    const ecId = r.cells[1].querySelector("select").value;
    const maxInner = r.cells[3].querySelector("input").value;
    const masterQR = `01${bookingId}${FNC1}98${ecId}${FNC1}99${mcId}${FNC1}38${maxInner}`; // 01 , 98, 99, 38
    await createQR(output, zip, qrSize, `Master ${mcId}`, masterQR, `Master_${mcId}.png`);
  }

  // ---------------- INNER ----------------
  const innerRows = document.querySelectorAll("#innerTable tbody tr");
  for (const r of innerRows) {
    const i = r.querySelectorAll("input, select");
    const innerId = i[0].value;
    const mcId = i[1].value;
    const size = i[3].value.padStart(6,'0');
    const exp = toGS1Date(i[4].value);
    const mfd = toGS1Date(i[5].value);
    const net = i[6].value.padStart(6,'0');   // 3103 fixed 6-digit
    const gross = i[7].value.padStart(6,'0'); // 3104 fixed 6-digit

    const innerQR = 
      `01${bookingId}${FNC1}` +
      `99${mcId}${FNC1}` +
      `31${innerId}${FNC1}` +
      `11${mfd}${FNC1}` +
      `17${exp}${FNC1}` +
      `3102${net}${FNC1}` +
      `3104${gross}${FNC1}` +
      `3112${size}`; // variable-length uses FNC1

    await createQR(output, zip, qrSize, `Inner ${innerId}`, innerQR, `Inner_${innerId}.png`);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "GS1_QRCodes.zip");
}

/* ================= HELPERS ================= */
async function createQR(container, zip, size, label, data, filename) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, data, { width: size });
  const blob = await new Promise(r => canvas.toBlob(r));
  zip.file(filename, blob);
  const div = document.createElement("div");
  div.innerHTML = `<p>${label}</p>`;
  div.appendChild(canvas);
  container.appendChild(div);
}

function toGS1Date(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

function isValidGS1Date(v) {
  if (!/^\d{6}$/.test(v)) return false;
  const y = 2000 + +v.slice(0, 2);
  const m = +v.slice(2, 4);
  const d = +v.slice(4, 6);
  return m >= 1 && m <= 12 && d <= new Date(y, m, 0).getDate();
}

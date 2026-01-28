const FNC1 = "\u001D"; // only for variable-length fields

/* ================= VALIDATION ================= */
function validateAllData() {
  const bookingId = document.getElementById("bookingId").value.trim();
  const customerName = document.getElementById("customerName").value.trim();
  const address = document.getElementById("address").value.trim();
  const tpNo = document.getElementById("tpNo").value.trim();
  const orderDate = toGS1Date(document.getElementById("orderDate").value);
  const deliveryDate = toGS1Date(document.getElementById("deliveryDate").value);

  if (!bookingId || !customerName || !address || !tpNo || !orderDate || !deliveryDate) {
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

  const bookingId = document.getElementById("bookingId").value;
  const customer = document.getElementById("customerName").value;
  const address = document.getElementById("address").value;
  const tpNo = document.getElementById("tpNo").value;
  const orderDate = toGS1Date(document.getElementById("orderDate").value);
  const deliveryDate = toGS1Date(document.getElementById("deliveryDate").value);
  const notes = document.getElementById("notes").value.trim();

  // ---------------- MAIN QR (scanner-ready numeric) ----------------
  // Example: 01<GTIN>17<Exp>11<Prod>3101<NetWeight> FNC1 used for variable fields
  const mainQR = 
    `01${bookingId}` +      // GTIN = BookingId
    `17${deliveryDate}` +   // Expiration
    `11${orderDate}` +      // Production
    `3101${tpNo.padStart(6,'0')}` + // Net weight placeholder
    `10${customer}${FNC1}91${notes}`; // batch/notes variable

  await createQR(output, zip, qrSize, "MAIN", mainQR, `Main_${bookingId}.png`);

  // ---------------- EXPORT ----------------
  const cartonRows = document.querySelectorAll("#cartonTable tbody tr");
  for (const r of cartonRows) {
    const ecId = r.querySelector(".carton-id-input").value;
    const maxMaster = r.cells[2].querySelector("input").value;

    const exportQR = `01${bookingId}02${ecId}30${maxMaster}`;
    await createQR(output, zip, qrSize, `Export ${ecId}`, exportQR, `Export_${ecId}.png`);
  }

  // ---------------- MASTER ----------------
  const masterRows = document.querySelectorAll("#masterTable tbody tr");
  for (const r of masterRows) {
    const mcId = r.cells[0].querySelector("input").value;
    const ecId = r.cells[1].querySelector("select").value;
    const maxInner = r.cells[3].querySelector("input").value;

    const masterQR = `01${bookingId}02${ecId}03${mcId}30${maxInner}`;
    await createQR(output, zip, qrSize, `Master ${mcId}`, masterQR, `Master_${mcId}.png`);
  }

  // ---------------- INNER ----------------
  const innerRows = document.querySelectorAll("#innerTable tbody tr");
  for (const r of innerRows) {
    const i = r.querySelectorAll("input, select");
    const innerId = i[0].value;
    const mcId = i[1].value;
    const size = i[3].value;
    const exp = toGS1Date(i[4].value);
    const mfd = toGS1Date(i[5].value);
    const net = i[6].value.padStart(6,'0'); // net weight AI 3103
    const gross = i[7].value.padStart(6,'0'); // gross weight AI 3104

    const innerQR = 
      `01${bookingId}` +
      `03${mcId}` +
      `04${innerId}` +
      `11${mfd}` +
      `17${exp}` +
      `3103${net}` +
      `3104${gross}` +
      `91SIZE:${size}`; // variable-length field uses FNC1 implicitly

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

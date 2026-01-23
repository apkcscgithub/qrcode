// Validate the whole hierarchy before generating QR
function validateAllData() {
    // --- Validate Main ---
    const bookingId = document.getElementById("bookingId").value.trim();
    const customerName = document.getElementById("customerName").value.trim();
    const address = document.getElementById("address").value.trim();
    const tpNo = document.getElementById("tpNo").value.trim();
    const orderDate = toGS1Date(document.getElementById("orderDate").value.trim());
    const deliveryDate = toGS1Date( document.getElementById("deliveryDate").value.trim());

    if (!bookingId || !customerName || !address || !tpNo || !orderDate || !deliveryDate) {
        alert("Please fill all Main Details before generating QR.");
        return false;
    }

    // Check if dates are in GS1 format (YYMMDD)
    if (!isValidGS1Date(orderDate)) {
        alert("Order Date must be in GS1 format (YYMMDD).");
        return false;
    }

    if (!isValidGS1Date(deliveryDate)) {
        alert("Delivery Date must be in GS1 format (YYMMDD).");
        return false;
    }

    // --- Validate Export Cartons ---
    const cartonRows = document.querySelectorAll("#cartonTable tbody tr");
    if (cartonRows.length === 0) {
        alert("Add at least one Export Carton.");
        return false;
    }
    for (let i = 0; i < cartonRows.length; i++) {
        const id = cartonRows[i].querySelector(".carton-id-input").value.trim();
        const noMaster = parseInt(cartonRows[i].cells[2].querySelector("input").value) || 0;
        if (!id) { alert("Export Carton ID cannot be empty."); return false; }
        if (noMaster <= 0) { alert(`Export Carton ${id} must have No of Master Carton Pack > 0.`); return false; }
    }

    // --- Validate Master Cartons ---
    const masterRows = document.querySelectorAll("#masterTable tbody tr");
    for (let i = 0; i < masterRows.length; i++) {
        const mcId = masterRows[i].cells[0].querySelector("input").value.trim();
        const parentEC = masterRows[i].cells[1].querySelector("select").value;
        const maxInner = parseInt(masterRows[i].cells[3].querySelector("input").value) || 0;

        if (!mcId || !parentEC) { alert("Master Carton ID and parent Export Carton must be filled."); return false; }
        // Check max master per parent
        const parentRow = Array.from(cartonRows).find(r => r.querySelector(".carton-id-input").value === parentEC);
        const maxMaster = parseInt(parentRow.cells[2].querySelector("input").value);
        const currentCount = Array.from(masterRows).filter(r => r.cells[1].querySelector("select").value === parentEC).length;
        if (currentCount > maxMaster) {
            alert(`Export Carton ${parentEC} exceeded max Master Carton count.`);
            return false;
        }
    }

    // --- Validate Inner Packs ---
    const innerRows = document.querySelectorAll("#innerTable tbody tr");
    for (let i = 0; i < innerRows.length; i++) {
        const inputs = innerRows[i].querySelectorAll("input, select");
        const innerId = inputs[0].value.trim();
        const parentMC = inputs[1].value;
        const size = inputs[3].value.trim();
        const expDate = inputs[4].value.trim();
        const mfdDate = inputs[5].value.trim();
        const netWeight = inputs[6].value.trim();
        const grossWeight = inputs[7].value.trim();

        if (!innerId || !parentMC || !size || !expDate || !mfdDate || !netWeight || !grossWeight) {
            alert("All Inner Pack fields must be filled.");
            return false;
        }

        // Check max inner per master
        const masterRow = Array.from(masterRows).find(r => r.cells[0].querySelector("input").value === parentMC);
        const maxInner = parseInt(masterRow.cells[3].querySelector("input").value);
        const currentCount = Array.from(innerRows).filter(r => r.querySelectorAll("select")[0].value === parentMC).length;
        if (currentCount > maxInner) {
            alert(`Master Carton ${parentMC} exceeded max Inner Pack count.`);
            return false;
        }
    }

    return true;
}

// Function to check if date is in GS1 format (YYMMDD)
function isValidGS1Date(value) {
    if (!/^\d{6}$/.test(value)) return false; // Check if it's exactly 6 digits

    const yy = parseInt(value.substring(0, 2), 10);
    const mm = parseInt(value.substring(2, 4), 10);
    const dd = parseInt(value.substring(4, 6), 10);

    // Validate month and day
    if (mm < 1 || mm > 12) return false;

    const fullYear = 2000 + yy; // GS1 assumes 2000–2099
    const daysInMonth = new Date(fullYear, mm, 0).getDate(); // Get days in the month

    return dd >= 1 && dd <= daysInMonth;
}

// Generate GS1 QR for all levels
async function generateGS1QR() {
  if (!(await validateAllData())) return;

  const output = document.getElementById("qrOutput");
  output.innerHTML = "";

  const qrSize = parseInt(document.getElementById("qrSize").value) || 150;

  const bookingId = document.getElementById("bookingId").value;
  const customerName = document.getElementById("customerName").value;
  const address = document.getElementById("address").value;
  const tpNo = document.getElementById("tpNo").value;
  const orderDate = toGS1Date(document.getElementById("orderDate").value.trim());
  const deliveryDate = toGS1Date(document.getElementById("deliveryDate").value.trim());
  const notes = document.getElementById("notes").value.trim();

  const zip = new JSZip();

  async function generateAndZipQR(label, data, fileName) {
    const size = parseInt(document.getElementById("qrSize").value) || 150;

    const div = document.createElement("div");
    div.classList.add("m-2", "d-inline-block");
    div.innerHTML = `<p>${label}</p>`;
    document.getElementById("qrOutput").appendChild(div);

    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, data, { width: size });
    div.appendChild(canvas);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    zip.file(fileName, blob);
  }

  // --- MAIN ---
  const mainData = `(01)${bookingId}(10)${customerName}(11)${address}(21)${tpNo}(30)${orderDate}(31)${deliveryDate}(91)${notes}`;
  await generateAndZipQR("Main Details", mainData, `Main_${bookingId}.png`);

  // --- EXPORT ---
  const cartonRows = document.querySelectorAll("#cartonTable tbody tr");
  for (let i = 0; i < cartonRows.length; i++) {
    const id = cartonRows[i].querySelector(".carton-id-input").value;
    const noMaster = parseInt(cartonRows[i].cells[2].querySelector("input").value) || 0;
    const exportData = `(01)${bookingId}(02)${id}(10)${noMaster}`;
    await generateAndZipQR(`Export Carton: ${id}`, exportData, `ExportCarton_${id}.png`);
  }

  // --- MASTER ---
  const masterRows = document.querySelectorAll("#masterTable tbody tr");
  for (let i = 0; i < masterRows.length; i++) {
    const mcId = masterRows[i].cells[0].querySelector("input").value;
    const parentEC = masterRows[i].cells[1].querySelector("select").value;
    const maxInner = parseInt(masterRows[i].cells[3].querySelector("input").value) || 0;
    const masterData = `(01)${bookingId}(02)${parentEC}(03)${mcId}(10)${maxInner}`;
    await generateAndZipQR(`Master Carton: ${mcId}`, masterData, `MasterCarton_${mcId}.png`);
  }

  // --- INNER ---
  const innerRows = document.querySelectorAll("#innerTable tbody tr");
  for (let i = 0; i < innerRows.length; i++) {
    const inputs = innerRows[i].querySelectorAll("input, select");
    const innerId = inputs[0].value;
    const parentMC = inputs[1].value;
    const size = inputs[3].value;
    const expDate = toGS1Date(inputs[4].value);
    const mfdDate = toGS1Date(inputs[5].value);
    const netWeight = inputs[6].value;
    const grossWeight = inputs[7].value;

    const masterRow = Array.from(masterRows).find(
      (r) => r.cells[0].querySelector("input").value === parentMC
    );
    const exportParent = masterRow ? masterRow.cells[1].querySelector("select").value : "";

    const innerData = `(01)${bookingId}(02)${exportParent}(03)${parentMC}(04)${innerId}(11)${size}(17)${expDate}(15)${mfdDate}(3103)${netWeight}(3104)${grossWeight}`;
    await generateAndZipQR(`Inner Pack: ${innerId}`, innerData, `InnerPack_${innerId}.png`);
  }

  // --- Download ZIP Button ---
  let zipName = prompt("Enter ZIP filename (without extension):", "GS1_QRCodes");
  if (!zipName) zipName = "GS1_QRCodes";

  zip.generateAsync({ type: "blob" }).then(function (content) {
    let btn = document.getElementById("downloadZipBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "downloadZipBtn";
      btn.className = "btn btn-success mt-3";
      btn.innerText = "Download ZIP";
      output.appendChild(btn);
    }
    btn.onclick = () => saveAs(content, zipName + ".zip");
  });
}
function toGS1Date(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return yy + mm + dd;
}
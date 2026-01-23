// Arrays to track hierarchy
let exportCartons = [];   // {id: "EC1"}
let masterCartons = [];   // {id: "MC1", parent: "EC1"}

// Get Booking ID
function getBookingId() {
    return document.getElementById("bookingId").value.trim();
}

// Validate Main Details
function validateMainDetails() {
    const bookingId = document.getElementById("bookingId").value.trim();
    const customerName = document.getElementById("customerName").value.trim();
    const address = document.getElementById("address").value.trim();
    const tpNo = document.getElementById("tpNo").value.trim();
    const orderDate = document.getElementById("orderDate").value.trim();
    const deliveryDate = document.getElementById("deliveryDate").value.trim();

    if (!bookingId || !customerName || !address || !tpNo || !orderDate || !deliveryDate) {
        alert("Please fill all required Main Details fields (Booking ID, Customer Name, Address, TP No, Order Date, Delivery Date) to continue.");
        return false;
    }

    // Enable Export Carton tab
    const cartonTabBtn = document.getElementById("cartonTab");
    if (cartonTabBtn.classList.contains("disabled")) {
        cartonTabBtn.classList.remove("disabled");
    }

    // Open Export Carton tab
    new bootstrap.Collapse(document.getElementById("collapseCarton"), { toggle: true });

    return true;
}


// Add Export Carton (editable ID)
function addCartonRow() {
    const tbody = document.querySelector("#cartonTable tbody");
    const bookingId = getBookingId();
    const defaultId = `EC${exportCartons.length+1}`;

    exportCartons.push({id: defaultId}); // store object

    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="text" class="form-control carton-id-input" value="${defaultId}" onchange="updateExportId(this)"></td>
        <td><input type="text" class="form-control" value="${bookingId}" readonly></td>
        <td><input type="number" class="form-control" min="0" value="0"></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteExportCarton(this)">Delete</button></td>
    `;

    document.getElementById("masterTab").classList.remove("disabled");
    updateMasterDropdown();
}

// Update Export Carton ID manually
function updateExportId(input) {
    const rowIndex = input.closest("tr").rowIndex - 1;
    exportCartons[rowIndex].id = input.value.trim();
    updateMasterDropdown();
}

// Delete Export Carton
function deleteExportCarton(btn) {
    const row = btn.closest('tr');
    const index = row.rowIndex - 1;
    exportCartons.splice(index, 1);
    row.remove();
    updateMasterDropdown();
}

// Get valid Export Cartons with NoOfMasterPack > 0
function getValidExportCartons() {
    const valid = [];
    const tbody = document.querySelector("#cartonTable tbody");
    exportCartons.forEach((ec, index) => {
        const row = tbody.rows[index];
        const noOfMasterPack = parseInt(row.cells[2].querySelector("input").value) || 0;
        if (noOfMasterPack > 0) valid.push(ec);
    });
    return valid;
}

// Update Master Carton dropdowns whenever Export IDs change
function updateMasterDropdown() {
    const selects = document.querySelectorAll(".master-parent-select");
    selects.forEach(sel => {
        const currentValue = sel.value;
        const validECs = getValidExportCartons();
        sel.innerHTML = validECs.map(ec => `<option value="${ec.id}" ${ec.id === currentValue ? "selected" : ""}>${ec.id}</option>`).join('');
    });
}

// Add Master Carton
function addMasterRow() {
    const validExportCartons = getValidExportCartons();
    if (validExportCartons.length === 0) {
        alert("No Export Carton available with Master Pack > 0. Please update Export Carton table.");
        return;
    }

    // Filter out Export Cartons that already reached max Master count
    const availableECs = validExportCartons.filter(ec => {
        const index = exportCartons.findIndex(c => c.id === ec.id);
        const maxCount = parseInt(document.querySelector("#cartonTable tbody").rows[index].cells[2].querySelector("input").value) || 0;
        const currentCount = masterCartons.filter(mc => mc.parent === ec.id).length;
        return currentCount < maxCount;
    });

    if (availableECs.length === 0) {
        alert("All Export Cartons have reached their maximum Master Carton count. Cannot add more Master Cartons.");
        return;
    }

    const tbody = document.querySelector("#masterTable tbody");
    const bookingId = getBookingId();
    const masterId = `MC${masterCartons.length+1}`;
    const defaultParent = availableECs[0].id;

    masterCartons.push({id: masterId, parent: defaultParent});

    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="text" class="form-control" value="${masterId}" readonly></td>
        <td>
            <select class="form-control master-parent-select" onchange="updateMasterParent(this)">
                ${availableECs.map(ec => `<option value="${ec.id}" ${ec.id === defaultParent ? "selected" : ""}>${ec.id}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="form-control" value="${bookingId}" readonly></td>
        <td><input type="number" class="form-control"></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMasterCarton(this)">Delete</button></td>
    `;
    document.getElementById("innerTab").classList.remove("disabled");
}


// Update Master Carton parent if dropdown changed
function updateMasterParent(select) {
    const rowIndex = select.closest("tr").rowIndex - 1;
    masterCartons[rowIndex].parent = select.value;
}

// Delete Master Carton
function deleteMasterCarton(btn){
    const row = btn.closest('tr');
    const index = row.rowIndex - 1;
    masterCartons.splice(index, 1);
    row.remove();
}

// Add Inner Pack
function addInnerRow() {
    if(masterCartons.length === 0){ 
        alert("Add Master Carton first!"); 
        return; 
    }

    // Filter Master Cartons with remaining slots
    const tbodyMaster = document.querySelector("#masterTable tbody");
    const availableMCs = masterCartons.filter((mc, index) => {
        const maxInner = parseInt(tbodyMaster.rows[index].cells[3].querySelector("input").value) || 0;
        const currentCount = Array.from(document.querySelectorAll("#innerTable tbody tr select"))
                                .filter(sel => sel.value === mc.id).length;
        return currentCount < maxInner;
    });

    if (availableMCs.length === 0) {
        alert("All Master Cartons have reached their maximum Inner Pack count. Cannot add more Inner Packs.");
        return;
    }

    const tbody = document.querySelector("#innerTable tbody");
    const bookingId = getBookingId();
    const innerId = `IP${tbody.rows.length+1}`;
    const defaultParent = availableMCs[0].id;

    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="text" class="form-control" value="${innerId}" readonly></td>
        <td>
            <select class="form-control">
                ${availableMCs.map(mc => `<option value="${mc.id}" ${mc.id === defaultParent ? "selected" : ""}>${mc.id}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="form-control" value="${bookingId}" readonly></td>
        <td><input type="text" class="form-control"></td>
        <td><input type="date" class="form-control"></td>
        <td><input type="date" class="form-control"></td>
        <td><input type="number" class="form-control"></td>
        <td><input type="number" class="form-control"></td>
        <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">Delete</button></td>
    `;

    document.getElementById("qrTab").classList.remove("disabled");
}


// Generate QR
function generateAllQR() {
    const output = document.getElementById("qrOutput");
    output.innerHTML = "";
    const innerRows = document.querySelectorAll("#innerTable tbody tr");

    innerRows.forEach((row,i)=>{
        const data = Array.from(row.querySelectorAll("input, select")).map(el=>el.value).join(" | ");
        const div = document.createElement("div");
        div.classList.add("m-2","d-inline-block");
        div.innerHTML = `<p>Inner Pack ${i+1}</p>`;
        output.appendChild(div);
        QRCode.toCanvas(div, data, {width:150}, function(err){if(err) console.error(err);});
    });
}
function newBooking() {
    if (!confirm("Start a new booking? All current data will be cleared.")) return;

    // ---- Clear Main Details ----
    document.getElementById("bookingId").value = "";
    document.getElementById("customerName").value = "";
    document.getElementById("address").value = "";
    document.getElementById("tpNo").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("orderDate").value = "";
    document.getElementById("deliveryDate").value = "";
    document.getElementById("notes").value = "";

    // ---- Clear Tables ----
    document.querySelector("#cartonTable tbody").innerHTML = "";
    document.querySelector("#masterTable tbody").innerHTML = "";
    document.querySelector("#innerTable tbody").innerHTML = "";

    // ---- Clear QR Output ----
    document.getElementById("qrOutput").innerHTML = "";

    // ---- Disable Tabs ----
    ["cartonTab", "masterTab", "innerTab", "qrTab"].forEach(id => {
        document.getElementById(id).classList.add("disabled");
    });

    // ---- Collapse all except Main ----
    const accordionIds = ["collapseCarton", "collapseMaster", "collapseInner", "collapseQR"];
    accordionIds.forEach(cid => {
        const el = document.getElementById(cid);
        const inst = bootstrap.Collapse.getInstance(el);
        if (inst) inst.hide();
    });

    // ---- Open Main Details ----
    new bootstrap.Collapse(document.getElementById("collapseMain"), { toggle: true });

    // ---- Focus first field ----
    document.getElementById("bookingId").focus();
}

/*function isValidGS1Date(value) {
    if (!/^\d{6}$/.test(value)) return false;

    const yy = parseInt(value.substring(0, 2), 10);
    const mm = parseInt(value.substring(2, 4), 10);
    const dd = parseInt(value.substring(4, 6), 10);

    if (mm < 1 || mm > 12) return false;

    const fullYear = 2000 + yy; // GS1 assumes 2000–2099
    const daysInMonth = new Date(fullYear, mm, 0).getDate();

    return dd >= 1 && dd <= daysInMonth;
}*/

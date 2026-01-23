function loginUser() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Temporary login (replace later with backend)
    if (username === "admin" && password === "1234") {
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid username or password");
    }

    return false; // Prevent form reload
}


/*main details
    bookingid
    customer name
    Address
    tpno 

export caton details
    cortonid
    bookingid
    noOfmasterCartonpack

mastor Carton details    
    msterCartonid
    cortonid
    bookingid
    noOfInnerpack

innerpack details
    innerpackid
    msterCartonid
    cortonid
    bookingid
    size 
    expdate
    mfddate
    netweight
    grossweight*/
        

const chunks = [0, 1, 2, 3];
Promise.all(chunks.map((i) => fetch(`app.bundle.${i}.txt`).then((r) => r.text())))
  .then((parts) => import(URL.createObjectURL(new Blob([atob(parts.join(""))], { type: "text/javascript" }))))
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client bundle.";
  });
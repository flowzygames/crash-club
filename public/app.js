const chunks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const bundleVersion = "2026-04-17-v1.1-release";

Promise.all(
  chunks.map((i) =>
    fetch(`app.bundle.${i}.txt?v=${bundleVersion}`, { cache: "no-store" }).then((response) => {
      if (!response.ok) {
        throw new Error(`Missing game bundle chunk ${i}`);
      }
      return response.text();
    })
  )
)
  .then((parts) => {
    const source = atob(parts.join(""));
    return import(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
  })
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client.";
    const start = document.getElementById("start-button");
    if (start) {
      start.textContent = "Reload Game";
      start.onclick = () => location.reload();
    }
    const rename = document.getElementById("rename-button");
    if (rename) rename.onclick = () => location.reload();
    const card = document.querySelector(".release-card p");
    if (card) card.textContent = "Crash Club could not load cleanly. Refresh once to grab the latest game files.";
  });

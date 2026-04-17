const chunks = [0, 1, 2, 3, 4];
const bundleVersion = "2026-04-17-start-fix";

Promise.all(
  chunks.map((i) =>
    fetch(`app.bundle.${i}.txt?v=${bundleVersion}`, { cache: "no-store" }).then((r) => {
      if (!r.ok) {
        throw new Error(`Missing game bundle chunk ${i}`);
      }
      return r.text();
    })
  )
)
  .then((parts) => {
    const source = atob(parts.join(""));
    const patches = [
      ["e.id===m.id?T(e):E(e)", 'e.id===m.id?("snapshot"===t.type?N(e):T(e)):E(e)'],
      [
        "b||(b=new(AudioContext||webkitAudioContext))",
        "b||(b=new(globalThis.AudioContext||globalThis.webkitAudioContext||class{resume(){}}))"
      ]
    ];
    const patchedSource = patches.reduce(
      (current, [oldCode, newCode]) => (current.includes(newCode) ? current : current.replaceAll(oldCode, newCode)),
      source
    );

    return import(URL.createObjectURL(new Blob([patchedSource], { type: "text/javascript" })));
  })
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client bundle.";
    const start = document.getElementById("start-button");
    if (start) start.textContent = "Reload Game";
    const card = document.querySelector(".release-card p");
    if (card) card.textContent = "Crash Club could not load cleanly. Refresh once to grab the latest game files.";
  });
const chunks = [0, 1, 2, 3, 4];
Promise.all(chunks.map((i) => fetch(`app.bundle.${i}.txt`).then((r) => r.text())))
  .then((parts) => {
    const source = atob(parts.join(""));
    const oldSnapshotPath = "e.id===m.id?T(e):E(e)";
    const safeSnapshotPath = 'e.id===m.id?("snapshot"===t.type?N(e):T(e)):E(e)';
    const patchedSource = source.includes(safeSnapshotPath)
      ? source
      : source.replaceAll(oldSnapshotPath, safeSnapshotPath);

    return import(URL.createObjectURL(new Blob([patchedSource], { type: "text/javascript" })));
  })
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client bundle.";
  });
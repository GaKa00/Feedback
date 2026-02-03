import express from "express";

const app = express();
const port = 8000;

app.get("/", (_req, res) => {
  res.json({ message: "Hello from Express TypeScript server!" });
});

app.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Server listening at ${url}`);
});

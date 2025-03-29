import { Hono } from "hono";
import { MongoClient, Collection } from "mongodb";
import { swaggerUI } from "@hono/swagger-ui";

// Definición de la interfaz para el mapeo de URLs
interface UrlMapping {
  _id?: string;
  shortCode: string;
  url: string;
  clicks: number;
  createdAt: Date;
}

// Función para generar un código corto aleatorio
function generateShortCode(length = 6): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Conexión a MongoDB
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(mongoUri);
await client.connect();
const db = client.db("urlShortener");
const urlCollection: Collection<UrlMapping> = db.collection("urls");

const app = new Hono();

// Endpoint para crear una URL corta
app.post("/api/v1/shorten", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) {
    return c.json({ error: 'El campo "url" es obligatorio.' }, 400);
  }
  const shortCode = generateShortCode();
  const newMapping: UrlMapping = {
    shortCode,
    url,
    clicks: 0,
    createdAt: new Date(),
  };
  await urlCollection.insertOne(newMapping);
  return c.json({ shortCode, url });
});

// Endpoint para redirigir a la URL original y actualizar estadísticas
app.get("/api/v1/shorten/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");
  const mapping = await urlCollection.findOne({ shortCode });
  if (!mapping) {
    return c.text("Código corto no encontrado", 404);
  }
  // Incrementamos el contador de clics
  await urlCollection.updateOne({ shortCode }, { $inc: { clicks: 1 } });
  return c.redirect(mapping.url);
});

// Endpoint para actualizar la URL asociada al código corto
app.put("/api/v1/shorten/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");
  const { url } = await c.req.json<{ url: string }>();
  if (!url) {
    return c.json({ error: 'El campo "url" es obligatorio.' }, 400);
  }
  const result = await urlCollection.updateOne(
    { shortCode },
    { $set: { url } }
  );
  if (result.matchedCount === 0) {
    return c.json({ error: "Código corto no encontrado." }, 404);
  }
  return c.json({ message: "URL actualizada correctamente." });
});

// Endpoint para eliminar una URL corta
app.delete("/api/v1/shorten/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");
  const result = await urlCollection.deleteOne({ shortCode });
  if (result.deletedCount === 0) {
    return c.json({ error: "Código corto no encontrado." }, 404);
  }
  return c.json({ message: "URL eliminada correctamente." });
});

// Endpoint para obtener las estadísticas de una URL corta
app.get("/api/v1/shorten/:shortCode/stats", async (c) => {
  const shortCode = c.req.param("shortCode");
  const mapping = await urlCollection.findOne({ shortCode });
  if (!mapping) {
    return c.json({ error: "Código corto no encontrado." }, 404);
  }
  return c.json({
    shortCode: mapping.shortCode,
    url: mapping.url,
    clicks: mapping.clicks,
    createdAt: mapping.createdAt,
  });
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Use the middleware to serve Swagger UI at /ui
app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = await readBody(request);
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const organization = String(payload.organization || "").trim();
  const useCase = String(payload.useCase || "").trim();

  if (!name || !email || !organization || !useCase || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({
      ok: false,
      mode: "validation_error",
      message: "Name, work email, organization, and first lead are required."
    });
    return;
  }

  response.status(200).json({
    ok: true,
    mode: "demo",
    requestId: `aculeus-access-${Date.now()}`,
    account: {
      name,
      email,
      organization,
      useCase
    },
    message: "Access request received."
  });
}

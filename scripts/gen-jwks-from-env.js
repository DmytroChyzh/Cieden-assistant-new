const fs = require("fs");
const { execSync } = require("child_process");
const {
  importPKCS8,
  exportJWK,
  calculateJwkThumbprint,
} = require("jose");

function readJwtPrivateKeyFromEnvLocal() {
  const data = fs.readFileSync(".env.local", "utf8");
  const match = data.match(/^JWT_PRIVATE_KEY=(.*)$/m);
  if (!match) throw new Error("JWT_PRIVATE_KEY missing in .env.local");

  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function readJwtPrivateKeyFromConvexEnv() {
  // Fetch the actual value stored in Convex deployment env vars.
  const value = execSync("npx convex env get JWT_PRIVATE_KEY", {
    encoding: "utf8",
  }).trim();
  if (!value) throw new Error("JWT_PRIVATE_KEY missing from Convex env");
  return value;
}

async function main() {
  let jwtPrivateKeyPem = readJwtPrivateKeyFromConvexEnv();

  const alg = "RS256";

  // Parse PKCS#8 using jose (more tolerant than node crypto).
  const privateKey = await importPKCS8(jwtPrivateKeyPem, alg);
  const jwk = await exportJWK(privateKey);

  // Strip private parameters so the resulting JWKS represents the public key.
  for (const k of ["d", "p", "q", "dp", "dq", "qi", "oth"]) {
    delete jwk[k];
  }

  jwk.use = "sig";
  jwk.alg = alg;
  jwk.kid = await calculateJwkThumbprint(jwk);

  const jwks = { keys: [jwk] };
  process.stdout.write(JSON.stringify(jwks));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


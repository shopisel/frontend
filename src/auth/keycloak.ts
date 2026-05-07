import Keycloak from "keycloak-js";

type KeycloakConfig = {
  url: string;
  realm: string;
  clientId: string;
};

function readKeycloakConfig(): KeycloakConfig | null {
  const url = import.meta.env.VITE_KEYCLOAK_URL;
  const realm = import.meta.env.VITE_KEYCLOAK_REALM;
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

  if (!url || !realm || !clientId) {
    return null;
  }

  return { url, realm, clientId };
}

const config = readKeycloakConfig();

if (config) {
  console.info("Shopisel Keycloak host:", config.url);
}

export const isKeycloakConfigured = config !== null;

export const keycloak = config ? new Keycloak(config) : null;


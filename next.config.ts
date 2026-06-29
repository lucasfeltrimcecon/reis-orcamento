import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload de documentos via Server Action: subir o limite (padrão ~10MB).
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;

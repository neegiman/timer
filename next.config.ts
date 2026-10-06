import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/timer',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

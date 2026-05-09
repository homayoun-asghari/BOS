import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ndvulkwhacsgvunvjtze.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/notes-attachments/**',
      },
      {
        protocol: 'https',
        hostname: 'ndvulkwhacsgvunvjtze.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/notes-attachments/**',
      },
      {
        protocol: 'https',
        hostname: 'ndvulkwhacsgvunvjtze.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/post-media/**',
      },
    ],
  },
};

export default nextConfig;

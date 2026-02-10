import type { NextConfig } from "next";
import Icons from 'unplugin-icons/webpack'
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60 * 30 // 30 days
        }
      }
    }
  ]
})

// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Performance Optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select'],
  },

  // Disable source maps in production untuk reduce bundle size
  productionBrowserSourceMaps: false,

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Empty turbopack config to silence error
  turbopack: {},

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Aggressive webpack optimizations
  webpack(config, { dev, isServer }) {
    // Icon optimization
    config.plugins.push(
      Icons({
        compiler: 'jsx',
        jsx: 'react'
      })
    )

    // Production optimizations
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@radix-ui/react-dialog': '@radix-ui/react-dialog/dist/index.mjs',
        '@radix-ui/react-select': '@radix-ui/react-select/dist/index.mjs',
      }
      
      // Tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\\\/]node_modules[\\\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true
            }
          }
        }
      }
    }

    return config
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8072/api/:path*",
      },
    ]
  },

  // Aggressive headers untuk performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http://localhost:8072; font-src 'self'; connect-src 'self' http://localhost:8072 ws://localhost:8072; frame-ancestors 'none'",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));


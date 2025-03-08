
# Hyperliquid Bridge Dashboard

A real-time analytics dashboard for monitoring cross-chain asset transfers to Hyperliquid EVM through multiple bridge protocols, including Hyperlane and deBridge.

## Features

- **Multi-Bridge Support**: Track assets being bridged through both Hyperlane and deBridge protocols
- **Real-Time Analytics**: Monitor live bridge activity and asset transfers
- **Chain Analytics**: View bridge activity across multiple chains:
  - Ethereum
  - Solana
  - Base
  - Polygon
- **Comprehensive Statistics**:
  - Total Value Bridged
  - Total Number of Transfers
  - Unique Assets Count
  - Active Chains Count
- **Interactive Visualizations**:
  - Stacked Area Charts for temporal analysis
  - Asset breakdown by chain
  - Bridge comparison metrics
- **Time Period Selection**: Filter data by different time ranges
- **Responsive Design**: Fully responsive layout that works on desktop and mobile devices

## Technology Stack

- **Frontend**: Next.js 15.2.1 with App Router
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Hooks
- **Build Tool**: Turbopack
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- Yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/andyboyan/hyperliquid-bridge-dashboard.git
cd hyperliquid-bridge-dashboard
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env.local` file in the root directory and add the following variables:
```env
NEXT_PUBLIC_HYPERLANE_API_URL=your_hyperlane_api_url
NEXT_PUBLIC_DEBRIDGE_API_URL=your_debridge_api_url
NEXT_PUBLIC_HYPEREVM_RPC_URL=your_hyperevm_rpc_url
```

## Project Structure

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License



## Contact

Andy Boyan - [@andyboyan](https://github.com/andyboyan)

Project Link: [https://github.com/andyboyan/hyperliquid-bridge-dashboard](https://github.com/andyboyan/hyperliquid-bridge-dashboard)
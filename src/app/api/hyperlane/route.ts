import { NextRequest, NextResponse } from 'next/server';

/**
 * API route handler for Hyperlane API requests
 * This acts as a proxy to the Hyperlane Explorer API
 * 
 * @note This is configured to work with Vercel's Edge Runtime
 */
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get the path from the URL
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/hyperlane', '');
    
    // Get the search params
    const searchParams = new URLSearchParams(url.search);
    
    // Fix timestamp issues - ensure we're not sending future dates
    if (searchParams.has('fromTimestamp')) {
      const fromTimestamp = searchParams.get('fromTimestamp');
      const parsedTimestamp = parseInt(fromTimestamp || '0', 10);
      
      // Check if the timestamp is in the future
      const now = new Date().getTime();
      if (parsedTimestamp > now || parsedTimestamp > 1735689600000) { // Jan 1, 2025
        console.warn(`Future timestamp detected: ${parsedTimestamp} (${new Date(parsedTimestamp).toISOString()}), correcting to current time - 24h`);
        // Set to 24 hours ago from now instead of using the future date
        searchParams.set('fromTimestamp', (now - (24 * 60 * 60 * 1000)).toString());
      }
    }
    
    // Ensure we're not accidentally filtering out any chains, especially Solana
    if (!searchParams.has('limit')) {
      searchParams.set('limit', '250'); // Ensure we get a good number of results
    }
    
    // Log if we're specifically looking for Solana transactions
    const originChain = searchParams.get('origin');
    const destinationChain = searchParams.get('destination');
    
    if (originChain?.toLowerCase() === 'solana' || destinationChain?.toLowerCase() === 'solana') {
      console.log('Explicitly requesting Solana transactions');
    }
    
    // Construct the target URL
    const targetUrl = `https://explorer.hyperlane.xyz/api${path || ''}`;
    
    // Log the request details
    console.log(`Proxying request to: ${targetUrl}`);
    console.log(`With params: ${searchParams.toString()}`);
    
    // Forward the request to the Hyperlane API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(`${targetUrl}?${searchParams.toString()}`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Hyperliquid-Bridge-Dashboard/1.0'
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      // Check if the response is OK
      if (!response.ok) {
        console.error(`Error from Hyperlane API: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: `Error from Hyperlane API: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
      
      // Parse the response
      const data = await response.json();
      
      // Check for Solana transactions in the response if appropriate
      if (data.messages && Array.isArray(data.messages)) {
        const solanaMessages = data.messages.filter((msg: any) => 
          msg.origin?.toLowerCase() === 'solana' || 
          msg.destination?.toLowerCase() === 'solana'
        );
        
        console.log(`Found ${solanaMessages.length} out of ${data.messages.length} transactions involving Solana`);
      }
      
      // Return the response with cache control headers
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes, stale for 10
        }
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out');
        return NextResponse.json(
          { error: 'Request timed out', message: 'The Hyperlane API took too long to respond' },
          { status: 504 }
        );
      }
      
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: unknown) {
    console.error('Error in Hyperlane API route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 
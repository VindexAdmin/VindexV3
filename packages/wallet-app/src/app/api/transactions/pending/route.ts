import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Forward request to blockchain backend
    const response = await fetch('http://localhost:3001/api/transactions/pending', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    
    // Return empty data to prevent UI errors
    return NextResponse.json({
      success: true,
      data: [],
      total: 0
    });
  }
}

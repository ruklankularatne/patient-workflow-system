import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const backendBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace('/api/v1', '');
    const imageUrl = `${backendBaseUrl}/uploads/profile-pictures/${filename}`;
    
    console.log(`Proxying image request: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.log(`Image not found: ${imageUrl}`);
      return new NextResponse('Image not found', { status: 404 });
    }
    
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/svg+xml';
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
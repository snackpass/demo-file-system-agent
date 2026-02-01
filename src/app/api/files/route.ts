import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';
import { listFiles, readFile } from '@/lib/e2b';
import { WORKSPACE_PATH } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sandboxId = searchParams.get('sandboxId');
  const filePath = searchParams.get('path');

  if (!sandboxId) {
    return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId);

    if (filePath) {
      // Read specific file
      const content = await readFile(sandbox, filePath);
      return NextResponse.json({ content });
    } else {
      // List all files
      const files = await listFiles(sandbox, WORKSPACE_PATH);
      return NextResponse.json({ files });
    }
  } catch (error) {
    console.error('Error in files API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to access sandbox' },
      { status: 500 }
    );
  }
}

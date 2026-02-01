import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';
import { WORKSPACE_PATH } from '@/lib/constants';

// Kill a sandbox
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sandboxId = searchParams.get('sandboxId');

  if (!sandboxId) {
    return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error killing sandbox:', error);
    // Even if it fails, consider it a success (sandbox might already be dead)
    return NextResponse.json({ success: true });
  }
}

// Check sandbox health and get file list
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sandboxId = searchParams.get('sandboxId');

  if (!sandboxId) {
    return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    // Try to list files to verify sandbox is healthy
    const entries = await sandbox.files.list(WORKSPACE_PATH);
    return NextResponse.json({
      healthy: true,
      sandboxId,
      fileCount: entries.length,
    });
  } catch (error) {
    return NextResponse.json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Sandbox unavailable',
    });
  }
}

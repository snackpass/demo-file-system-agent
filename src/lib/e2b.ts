import { Sandbox } from 'e2b';
import { WORKSPACE_PATH } from './constants';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

// Resume existing sandbox or create new one
export async function getOrCreateSandbox(sandboxId: string | null): Promise<Sandbox> {
  if (sandboxId) {
    try {
      // Try to connect to existing sandbox
      const sandbox = await Sandbox.connect(sandboxId);
      return sandbox;
    } catch (error) {
      console.log('Failed to connect to sandbox, creating new one:', error);
      // Sandbox expired or unavailable, create new one
    }
  }

  const sandbox = await Sandbox.create('base', {
    timeoutMs: 5 * 60 * 1000, // 5 minute timeout
  });

  // Initialize the workspace directory
  await sandbox.commands.run(`mkdir -p ${WORKSPACE_PATH}`);

  return sandbox;
}

// List files recursively from the workspace
export async function listFiles(sandbox: Sandbox, path: string = WORKSPACE_PATH): Promise<FileNode[]> {
  try {
    const entries = await sandbox.files.list(path);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const node: FileNode = {
        name: entry.name,
        path: entry.path,
        type: entry.type === 'dir' ? 'directory' : 'file',
      };

      if (entry.type === 'dir') {
        node.children = await listFiles(sandbox, entry.path);
      }

      nodes.push(node);
    }

    // Sort: directories first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// Read a file's content
export async function readFile(sandbox: Sandbox, path: string): Promise<string> {
  try {
    const content = await sandbox.files.read(path);
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
}

// Kill a sandbox
export async function killSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();
  } catch (error) {
    console.error('Error killing sandbox:', error);
  }
}

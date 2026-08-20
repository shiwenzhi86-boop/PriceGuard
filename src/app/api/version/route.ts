import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROJECT_DIR = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';

/**
 * GET /api/version - 获取版本信息
 */
export async function GET() {
  try {
    // 读取 package.json 获取版本号
    const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const localVersion = packageJson.version || '0.0.0';
    
    // 获取本地 git 信息
    let localCommitHash = 'unknown';
    let localCommitDate = 'unknown';
    let localBranch = 'unknown';
    
    try {
      localCommitHash = execSync('git rev-parse --short HEAD', { cwd: PROJECT_DIR }).toString().trim();
      localCommitDate = execSync('git log -1 --format=%cd --date=short', { cwd: PROJECT_DIR }).toString().trim();
      localBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_DIR }).toString().trim();
    } catch (error) {
      console.warn('[Version] 获取本地 git 信息失败:', error);
    }
    
    // 获取远程 git 信息
    let remoteVersion = localVersion;
    let remoteCommitHash = localCommitHash;
    let remoteCommitDate = localCommitDate;
    let hasUpdate = false;
    let changelog = '';
    
    try {
      // 先 fetch 远程代码
      execSync('git fetch origin', { cwd: PROJECT_DIR, stdio: 'pipe' });
      
      // 获取远程最新 commit hash
      remoteCommitHash = execSync('git rev-parse --short origin/main', { cwd: PROJECT_DIR }).toString().trim();
      remoteCommitDate = execSync('git log -1 --format=%cd --date=short origin/main', { cwd: PROJECT_DIR }).toString().trim();
      
      // 比较本地和远程 commit hash
      hasUpdate = localCommitHash !== remoteCommitHash;
      
      // 读取 CHANGELOG.md 获取更新日志
      const changelogPath = path.join(PROJECT_DIR, 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
        // 提取第一个版本的更新日志
        const match = changelogContent.match(/## \[.*?\] - .*?\n([\s\S]*?)(?=\n## \[|$)/);
        if (match) {
          changelog = match[1].trim();
        }
      }
      
      // 尝试从远程 package.json 获取版本号
      try {
        const remotePackageJson = execSync('git show origin/main:package.json', { cwd: PROJECT_DIR }).toString();
        const remotePackage = JSON.parse(remotePackageJson);
        remoteVersion = remotePackage.version || localVersion;
      } catch (error) {
        console.warn('[Version] 获取远程版本号失败:', error);
      }
    } catch (error) {
      console.warn('[Version] 获取远程 git 信息失败:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        local: {
          version: localVersion,
          commitHash: localCommitHash,
          commitDate: localCommitDate,
          branch: localBranch,
        },
        remote: {
          version: remoteVersion,
          commitHash: remoteCommitHash,
          commitDate: remoteCommitDate,
          hasUpdate,
          changelog,
        },
      },
    });
  } catch (error: any) {
    console.error('[Version] 获取版本信息失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const projectRoot = path.resolve(process.cwd());

    // 检查是否是 git 仓库
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      return NextResponse.json(
        { success: false, error: '当前目录不是 Git 仓库，无法更新。请使用 git clone 方式安装程序。' },
        { status: 400 }
      );
    }

    // 获取当前版本信息
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const oldVersion = packageJson.version;

    const currentHash = execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();
    const currentBranch = execSync('git branch --show-current', { cwd: projectRoot }).toString().trim();

    // 获取远程最新信息
    execSync('git fetch origin', { cwd: projectRoot, stdio: 'pipe' });

    // 检查是否有更新
    const localHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
    const remoteHash = execSync('git rev-parse origin/main', { cwd: projectRoot }).toString().trim();

    if (localHash === remoteHash) {
      return NextResponse.json({
        success: true,
        updated: false,
        message: '当前已是最新版本',
        version: currentHash,
      });
    }

    // 执行更新
    execSync('git pull origin main', { cwd: projectRoot, stdio: 'pipe' });

    const newHash = execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();

    // 读取新版本号
    const newPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const newVersion = newPackageJson.version;

    // 读取更新日志
    let changelog = '';
    const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
      const versionMatch = changelogContent.match(/## \[.*?\] - .*?\n([\s\S]*?)(?=## \[|$)/);
      if (versionMatch) {
        changelog = versionMatch[1].trim();
      }
    }

    return NextResponse.json({
      success: true,
      updated: true,
      message: `更新成功！从 v${oldVersion} 升级到 v${newVersion}`,
      oldVersion,
      newVersion,
      oldCommit: currentHash,
      newCommit: newHash,
      changelog,
      needRestart: true,
    });
  } catch (error: any) {
    const errorMsg = error.stderr?.toString() || error.message || '未知错误';
    return NextResponse.json(
      { success: false, error: `更新失败：${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd());
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const currentHash = execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();
    const currentBranch = execSync('git branch --show-current', { cwd: projectRoot }).toString().trim();

    // 获取远程最新信息
    execSync('git fetch origin', { cwd: projectRoot, stdio: 'pipe' });
    const localHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
    const remoteHash = execSync('git rev-parse origin/main', { cwd: projectRoot }).toString().trim();
    const hasUpdate = localHash !== remoteHash;

    return NextResponse.json({
      success: true,
      data: {
        currentVersion: packageJson.version,
        commitHash: currentHash,
        branch: currentBranch,
        hasUpdate,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        currentVersion: 'unknown',
        commitHash: 'unknown',
        branch: 'unknown',
        hasUpdate: false,
        isGitRepo: false,
      },
    });
  }
}

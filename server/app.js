/**
 * 웹 기반 테스트 실행 서버
 * Express.js를 사용하여 웹 대시보드에서 테스트를 실행하고 결과를 확인할 수 있습니다.
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;
const TEST_DIR = path.join(__dirname, '..');

// 미들웨어
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// favicon.ico 요청 처리 (404 방지)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 테스트 실행 상태 저장
const testRuns = new Map();

/**
 * 테스트 실행 함수
 */
async function runTests(testFile = null, options = {}, providedRunId = null) {
  return new Promise((resolve, reject) => {
    const runId = providedRunId || Date.now().toString();
    const testCommand = testFile 
      ? `npx playwright test "${testFile}"`
      : 'npm test';
    
    // Windows 환경을 고려한 명령어
    const isWindows = process.platform === 'win32';
    const command = isWindows 
      ? `cd /d "${TEST_DIR}" && ${testCommand}`
      : `cd "${TEST_DIR}" && ${testCommand}`;
    
    console.log('실행 명령어:', command);
    
    // 환경 변수 준비: 필수 시스템 변수만 유지 + 웹에서 받은 값만 사용
    // CI 관련 변수는 유지하되, 테스트 관련 환경 변수는 웹에서 받은 값만 사용
    const envVars = {
      // 필수 시스템 변수만 유지
      PATH: process.env.PATH,
      NODE_ENV: process.env.NODE_ENV || 'test',
      CI: process.env.CI,
    };
    
    // 웹에서 받은 환경 변수만 사용 (우선 적용)
    if (options && options.env) {
      Object.assign(envVars, options.env);
    }
    
    // 색상 설정: 웹에서 명시적으로 설정하지 않았으면 기본값 설정
    // NO_COLOR와 FORCE_COLOR 충돌 방지
    if (!envVars.NO_COLOR && !envVars.FORCE_COLOR) {
      envVars.FORCE_COLOR = '1'; // 기본값: 색상 출력
    } else if (envVars.NO_COLOR) {
      // NO_COLOR가 설정되면 FORCE_COLOR 제거하여 충돌 방지
      delete envVars.FORCE_COLOR;
    }
    
    console.log('사용할 환경 변수:', Object.keys(envVars).filter(k => 
      k.startsWith('BASE') || 
      k.startsWith('USER') || 
      k.startsWith('ADMIN') || 
      k.startsWith('OPENAI') ||
      k === 'FORCE_COLOR' ||
      k === 'NO_COLOR'
    ));
    
    const runData = {
      id: runId,
      status: 'running',
      startTime: new Date(),
      output: [],
      testFile: testFile || 'all',
      options,
      process: null // 프로세스 참조 저장용
    };
    testRuns.set(runId, runData);

    const childProcess = exec(command, {
      cwd: TEST_DIR,
      env: envVars,
      shell: isWindows ? 'cmd.exe' : undefined
    }, (error, stdout, stderr) => {
      const run = testRuns.get(runId);
      // 프로세스 참조 제거 (종료되었으므로)
      if (run) {
        run.process = null;
      }
      // 테스트 결과 파싱
      let testSummary = null;
      if (stdout) {
        const output = stdout.toString();
        // Playwright 출력에서 테스트 결과 추출
        const passedMatch = output.match(/(\d+)\s+passed/i);
        const failedMatch = output.match(/(\d+)\s+failed/i);
        const skippedMatch = output.match(/(\d+)\s+skipped/i);
        const totalMatch = output.match(/(\d+)\s+total/i);
        
        testSummary = {
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
          total: totalMatch ? parseInt(totalMatch[1]) : 0
        };
      }
      
      if (error) {
        console.error('테스트 실행 오류:', error);
        run.status = 'failed';
        run.error = error.message;
        run.summary = testSummary;
        if (stderr) run.output.push(stderr);
        if (stdout) run.output.push(stdout);
      } else {
        run.status = 'completed';
        run.summary = testSummary;
        if (stdout) run.output.push(stdout);
        if (stderr) run.output.push(stderr);
      }
      run.endTime = new Date();
      run.duration = run.endTime - run.startTime;
      testRuns.set(runId, run);
      
      if (error) {
        reject(error);
      } else {
        resolve(run);
      }
    });

    // 실시간 출력 전송
    childProcess.stdout.on('data', (data) => {
      const run = testRuns.get(runId);
      if (run) {
        run.output.push(data.toString());
        io.emit('test-output', { runId, data: data.toString() });
      }
    });

    childProcess.stderr.on('data', (data) => {
      const run = testRuns.get(runId);
      if (run) {
        run.output.push(data.toString());
        io.emit('test-output', { runId, data: data.toString() });
      }
    });

    // 프로세스 종료 이벤트
    childProcess.on('close', (code) => {
      const run = testRuns.get(runId);
      if (run) {
        run.exitCode = code;
        if (run.status === 'running') {
          run.status = code === 0 ? 'completed' : 'failed';
        }
        io.emit('test-complete', { runId, status: run.status, exitCode: code });
      }
    });
    
    // 프로세스 에러 이벤트
    childProcess.on('error', (error) => {
      console.error('프로세스 실행 오류:', error);
      const run = testRuns.get(runId);
      if (run) {
        run.status = 'failed';
        run.error = error.message;
        run.output.push(`프로세스 실행 오류: ${error.message}`);
        testRuns.set(runId, run);
        io.emit('test-complete', { runId, status: 'failed', exitCode: -1 });
      }
      reject(error);
    });
    
    // 프로세스 참조 저장
    runData.process = childProcess;
    testRuns.set(runId, runData);
  });
}

// API 라우트

/**
 * 모든 테스트 실행
 */
app.post('/api/tests/run', async (req, res) => {
  try {
    const { testFile, options } = req.body;
    console.log('테스트 실행 요청:', { testFile, options });
    
    // runId를 먼저 생성
    const runId = Date.now().toString();
    
    // 초기 run 객체 생성
    const initialRun = {
      id: runId,
      status: 'starting',
      startTime: new Date(),
      output: [],
      testFile: testFile || 'all',
      options: options || {}
    };
    testRuns.set(runId, initialRun);
    
    // 비동기로 실행 시작 (즉시 응답 반환)
    runTests(testFile, options, runId).then((run) => {
      console.log('테스트 실행 완료:', run.id);
    }).catch((error) => {
      console.error('테스트 실행 실패:', error);
      const run = testRuns.get(runId);
      if (run) {
        run.status = 'failed';
        run.error = error.message;
        testRuns.set(runId, run);
      }
    });
    
    res.json({ success: true, runId: runId, run: initialRun });
  } catch (error) {
    console.error('API 오류:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

/**
 * 테스트 실행 상태 조회
 */
app.get('/api/tests/status/:runId', (req, res) => {
  const run = testRuns.get(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }
  // 프로세스 참조는 제외하고 반환 (직렬화 불가능)
  const { process, ...runData } = run;
  res.json(runData);
});

/**
 * 테스트 실행 중지
 */
app.post('/api/tests/stop/:runId', (req, res) => {
  try {
    const runId = req.params.runId;
    console.log(`테스트 중지 요청: ${runId}`);
    console.log(`현재 저장된 테스트 실행 ID:`, Array.from(testRuns.keys()));
    
    const run = testRuns.get(runId);
    if (!run) {
      console.log(`테스트 실행 ${runId}를 찾을 수 없습니다.`);
      return res.status(404).json({ 
        success: false, 
        error: `Test run ${runId} not found. It may have already completed or the server was restarted.`,
        availableRuns: Array.from(testRuns.keys())
      });
    }
    
    console.log(`테스트 상태: ${run.status}`);
    
    // 이미 완료되거나 중지된 경우에도 성공 응답 반환
    if (run.status !== 'running') {
      console.log(`테스트가 이미 ${run.status} 상태입니다.`);
      return res.json({ 
        success: true, 
        message: `Test is already ${run.status}`,
        run: (() => {
          const { process, ...runData } = run;
          return runData;
        })()
      });
    }
    
    if (!run.process) {
      console.log(`프로세스 참조가 없습니다. 상태만 업데이트합니다.`);
      // 프로세스가 없어도 상태를 중지로 업데이트
      run.status = 'stopped';
      run.endTime = new Date();
      run.duration = run.endTime - run.startTime;
      run.output.push('\n[테스트가 사용자에 의해 중지되었습니다 (프로세스가 이미 종료됨)]');
      testRuns.set(runId, run);
      
      io.emit('test-stopped', { runId, status: 'stopped' });
      io.emit('test-complete', { runId, status: 'stopped', exitCode: -1 });
      
      return res.json({ 
        success: true, 
        message: 'Test marked as stopped (process already terminated)',
        run: (() => {
          const { process, ...runData } = run;
          return runData;
        })()
      });
    }
    
    // Windows 환경에서는 프로세스 트리 종료
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: taskkill로 프로세스 트리 종료
      const { execSync } = require('child_process');
      try {
        // 자식 프로세스의 PID 찾기
        const childPid = run.process.pid;
        execSync(`taskkill /F /T /PID ${childPid}`, { timeout: 5000 });
      } catch (killError) {
        console.error('프로세스 종료 오류:', killError);
        // taskkill 실패 시에도 계속 진행
      }
    } else {
      // Unix/Linux: kill로 프로세스 그룹 종료
      try {
        process.kill(-run.process.pid, 'SIGTERM');
      } catch (killError) {
        console.error('프로세스 종료 오류:', killError);
      }
    }
    
    // 프로세스 직접 종료 시도
    try {
      run.process.kill('SIGTERM');
    } catch (error) {
      console.error('프로세스 kill 오류:', error);
    }
    
    // 상태 업데이트
    run.status = 'stopped';
    run.endTime = new Date();
    run.duration = run.endTime - run.startTime;
    run.output.push('\n[테스트가 사용자에 의해 중지되었습니다]');
    run.process = null;
    
    testRuns.set(req.params.runId, run);
    
    // WebSocket으로 중지 알림 전송
    io.emit('test-stopped', { runId: req.params.runId, status: 'stopped' });
    io.emit('test-complete', { runId: req.params.runId, status: 'stopped', exitCode: -1 });
    
    res.json({ success: true, message: 'Test stopped successfully', run });
  } catch (error) {
    console.error('테스트 중지 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 모든 테스트 실행 히스토리 조회
 */
app.get('/api/tests/history', (req, res) => {
  const history = Array.from(testRuns.values())
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50); // 최근 50개만
  res.json(history);
});

/**
 * 테스트 리포트 조회
 */
app.get('/api/tests/report', async (req, res) => {
  try {
    const reportPath = path.join(TEST_DIR, 'playwright-report', 'index.html');
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    
    if (reportExists) {
      res.json({ 
        exists: true, 
        url: '/report/index.html',
        path: reportPath 
      });
    } else {
      res.json({ exists: false, message: 'Report not generated yet' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 리포트 파일 서빙
 */
app.use('/report', express.static(path.join(TEST_DIR, 'playwright-report')));

/**
 * BASE_URL 접속 가능 여부 확인
 */
app.post('/api/tests/check-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL이 제공되지 않았습니다.' });
    }
    
    // URL 형식 검증
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch (e) {
      return res.json({
        success: false,
        accessible: false,
        error: '유효하지 않은 URL 형식입니다.',
        details: e.message
      });
    }
    
    // HTTP/HTTPS만 허용
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return res.json({
        success: false,
        accessible: false,
        error: 'HTTP 또는 HTTPS 프로토콜만 지원됩니다.',
        details: `지원하지 않는 프로토콜: ${validUrl.protocol}`
      });
    }
    
    // Node.js 내장 fetch 사용 (Node 18+)
    let fetchFunc;
    if (typeof fetch !== 'undefined') {
      fetchFunc = fetch;
    } else {
      // Node 18 미만의 경우 node-fetch 사용
      try {
        const nodeFetch = require('node-fetch');
        fetchFunc = nodeFetch.default || nodeFetch;
      } catch (e) {
        return res.json({
          success: false,
          accessible: false,
          error: 'URL 체크를 위해 fetch API 또는 node-fetch가 필요합니다.',
          details: 'Node.js 18 이상을 사용하거나 node-fetch를 설치하세요.'
        });
      }
    }
    
    // 타임아웃 설정 (5초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetchFunc(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        timeout: 5000
      });
      
      clearTimeout(timeoutId);
      
      return res.json({
        success: true,
        accessible: response.ok || response.status < 400,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        url: response.url,
        message: response.ok ? '서버에 접속할 수 있습니다.' : `서버 응답: ${response.status} ${response.statusText}`
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return res.json({
          success: false,
          accessible: false,
          error: '서버 응답 시간이 초과되었습니다 (5초)',
          details: '서버가 실행 중인지 확인하거나 방화벽 설정을 확인하세요.'
        });
      }
      
      return res.json({
        success: false,
        accessible: false,
        error: '서버에 접속할 수 없습니다.',
        details: fetchError.message,
        code: fetchError.code || 'UNKNOWN'
      });
    }
  } catch (error) {
    console.error('URL 체크 오류:', error);
    res.status(500).json({
      success: false,
      accessible: false,
      error: error.message
    });
  }
});

/**
 * 테스트 실행 전 사전 체크
 */
app.post('/api/tests/pre-check', async (req, res) => {
  try {
    const { env } = req.body;
    const checks = {
      baseUrl: { passed: false, message: '', details: null },
      userEmail: { passed: false, message: '', details: null },
      adminEmail: { passed: false, message: '', details: null },
      playwrightInstalled: { passed: false, message: '', details: null }
    };
    
    // BASE_URL 검증
    if (env && env.BASE_URL) {
      const urlMatch = env.BASE_URL.match(/^https?:\/\/.+/i);
      checks.baseUrl.passed = !!urlMatch;
      checks.baseUrl.message = urlMatch 
        ? 'BASE_URL 형식이 올바릅니다.' 
        : 'BASE_URL은 http:// 또는 https://로 시작해야 합니다.';
    } else {
      checks.baseUrl.message = 'BASE_URL이 설정되지 않았습니다.';
    }
    
    // USER_EMAIL 검증 (이메일 또는 아이디 허용)
    if (env && env.USER_EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_\-\.]+$/; // 아이디 형식 (영문, 숫자, 언더스코어, 하이픈, 점)
      const isEmail = emailRegex.test(env.USER_EMAIL);
      const isUsername = usernameRegex.test(env.USER_EMAIL) && env.USER_EMAIL.length >= 2 && env.USER_EMAIL.length <= 50;
      checks.userEmail.passed = isEmail || isUsername;
      checks.userEmail.message = isEmail
        ? '사용자 이메일 형식이 올바릅니다.'
        : isUsername
        ? '사용자 아이디 형식이 올바릅니다.'
        : '사용자 이메일 또는 아이디 형식이 올바르지 않습니다.';
    } else {
      checks.userEmail.message = 'USER_EMAIL이 설정되지 않았습니다.';
    }
    
    // ADMIN_EMAIL 검증 (이메일 또는 아이디 허용)
    if (env && env.ADMIN_EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_\-\.]+$/; // 아이디 형식 (영문, 숫자, 언더스코어, 하이픈, 점)
      const isEmail = emailRegex.test(env.ADMIN_EMAIL);
      const isUsername = usernameRegex.test(env.ADMIN_EMAIL) && env.ADMIN_EMAIL.length >= 2 && env.ADMIN_EMAIL.length <= 50;
      checks.adminEmail.passed = isEmail || isUsername;
      checks.adminEmail.message = isEmail
        ? '관리자 이메일 형식이 올바릅니다.'
        : isUsername
        ? '관리자 아이디 형식이 올바릅니다.'
        : '관리자 이메일 또는 아이디 형식이 올바르지 않습니다.';
    } else {
      checks.adminEmail.message = 'ADMIN_EMAIL이 설정되지 않았습니다.';
    }
    
    // Playwright 설치 확인
    try {
      const { execSync } = require('child_process');
      const isWindows = process.platform === 'win32';
      const command = isWindows
        ? `cd /d "${TEST_DIR}" && npx playwright --version`
        : `cd "${TEST_DIR}" && npx playwright --version`;
      
      try {
        const version = execSync(command, { 
          cwd: TEST_DIR,
          encoding: 'utf8',
          timeout: 5000,
          stdio: 'pipe'
        });
        checks.playwrightInstalled.passed = true;
        checks.playwrightInstalled.message = 'Playwright가 설치되어 있습니다.';
        checks.playwrightInstalled.details = version.trim();
      } catch (e) {
        checks.playwrightInstalled.passed = false;
        checks.playwrightInstalled.message = 'Playwright가 설치되어 있지 않거나 접근할 수 없습니다.';
        checks.playwrightInstalled.details = e.message;
      }
    } catch (e) {
      checks.playwrightInstalled.passed = false;
      checks.playwrightInstalled.message = 'Playwright 설치 확인 중 오류 발생.';
      checks.playwrightInstalled.details = e.message;
    }
    
    const allPassed = Object.values(checks).every(check => check.passed);
    
    res.json({
      success: true,
      allPassed,
      checks
    });
  } catch (error) {
    console.error('사전 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 테스트 목록 조회
 */
app.get('/api/tests/list', async (req, res) => {
  try {
    const testsDir = path.join(TEST_DIR, 'tests');
    
    // tests 디렉토리에서 .spec.ts 파일 찾기
    async function findTestFiles(dir, fileList = []) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // node_modules, test-results 등 제외
            if (!['node_modules', 'test-results', 'playwright-report'].includes(entry.name)) {
              await findTestFiles(fullPath, fileList);
            }
          } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
            // 상대 경로로 변환 (tests/ 기준)
            const relativePath = path.relative(testsDir, fullPath).replace(/\\/g, '/');
            fileList.push({
              file: relativePath,
              fullPath: fullPath,
              name: entry.name
            });
          }
        }
      } catch (error) {
        console.error('디렉토리 읽기 오류:', error);
      }
      
      return fileList;
    }
    
    const testFiles = await findTestFiles(testsDir);
    
    // 파일명 기준으로 정렬
    testFiles.sort((a, b) => a.file.localeCompare(b.file));
    
    res.json({
      tests: testFiles,
      count: testFiles.length
    });
  } catch (error) {
    console.error('테스트 목록 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket 연결
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 테스트 실행 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 대시보드: http://localhost:${PORT}`);
  console.log(`📝 API: http://localhost:${PORT}/api`);
});


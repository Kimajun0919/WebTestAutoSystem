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
      if (error) {
        console.error('테스트 실행 오류:', error);
        run.status = 'failed';
        run.error = error.message;
        if (stderr) run.output.push(stderr);
        if (stdout) run.output.push(stdout);
      } else {
        run.status = 'completed';
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
 * 테스트 목록 조회
 */
app.get('/api/tests/list', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const command = `cd "${TEST_DIR}" && npx playwright test --list --json`;
    
    exec(command, { cwd: TEST_DIR }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      try {
        const tests = JSON.parse(stdout);
        res.json(tests);
      } catch (parseError) {
        res.status(500).json({ error: 'Failed to parse test list' });
      }
    });
  } catch (error) {
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

